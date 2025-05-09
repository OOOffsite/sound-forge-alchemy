import fs from "fs";
import path from "path";
import { exec, spawn } from "child_process";
import util from "util";
import axios from "axios";

// Promisify exec
const execPromise = util.promisify(exec);

// Constants
const MODELS_DIR = process.env.MODELS_DIR || path.join(__dirname, "models");

// Model source URLs and descriptions
const PRE_TRAINED_MODELS = {
  htdemucs: {
    name: "HT Demucs",
    description: "High performance hybrid transformer model",
    version: "4.0.0",
    url: "https://github.com/facebookresearch/demucs",
    isDefault: true,
    internal: true,
  },
  htdemucs_ft: {
    name: "HT Demucs Fine-tuned",
    description: "Fine-tuned hybrid transformer model",
    version: "4.0.0",
    url: "https://github.com/facebookresearch/demucs",
    isDefault: false,
    internal: true,
  },
  htdemucs_6s: {
    name: "HT Demucs 6-stem",
    description: "Hybrid transformer model with 6 source separation",
    version: "4.0.0",
    url: "https://github.com/facebookresearch/demucs",
    isDefault: false,
    internal: true,
  },
  hdemucs_mmi: {
    name: "HDemucs MMI",
    description: "Hybrid Demucs with musical multi-instrument separation",
    version: "4.0.0",
    url: "https://github.com/facebookresearch/demucs",
    isDefault: false,
    internal: true,
  },
};

// Check if models directory exists, if not create it
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// Helper function to get all installed models
async function getInstalledModels() {
  try {
    // Run demucs -h to get available models
    const { stdout } = await execPromise("python -m demucs.separate -h");

    // Parse the output to get available models
    const modelMatch = stdout.match(
      /--model (\w+) *Model to use, one of: ([^\n]+)/
    );

    if (!modelMatch || modelMatch.length < 3) {
      console.warn("Could not parse demucs models from help output");
      return [];
    }

    // Extract the list of models
    const availableModels = modelMatch[2].trim().split(", ");

    // Create model info array
    return availableModels.map((modelName) => {
      const modelInfo = PRE_TRAINED_MODELS[modelName] || {
        name: modelName,
        description: "Custom model",
        version: "unknown",
        url: "",
        isDefault: false,
        internal: false,
      };

      return {
        id: modelName,
        ...modelInfo,
        installed: true,
      };
    });
  } catch (error) {
    console.error("Error getting installed models:", error);
    return [];
  }
}

// Helper function to download a model
async function downloadModel(modelName) {
  try {
    if (!PRE_TRAINED_MODELS[modelName]) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    console.log(`Downloading model: ${modelName}`);

    // Use python to download the model through demucs
    const pythonProcess = spawn("python", [
      "-c",
      `import torch; from demucs.pretrained import get_model; get_model("${modelName}")`,
    ]);

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
      console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    return new Promise((resolve, reject) => {
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          console.log(`Successfully downloaded model: ${modelName}`);
          resolve(true);
        } else {
          console.error(
            `Error downloading model: ${modelName}, exit code: ${code}`
          );
          reject(new Error(`Failed to download model: ${stderrData}`));
        }
      });
    });
  } catch (error) {
    console.error(`Error downloading model ${modelName}:`, error);
    throw error;
  }
}

// Helper function to get all available models (installed + available for download)
async function getAllModels() {
  const installedModels = await getInstalledModels();
  const installedModelNames = installedModels.map((model) => model.id);

  // Add models that are not yet installed
  const allModels = [...installedModels];

  Object.keys(PRE_TRAINED_MODELS).forEach((modelName) => {
    if (!installedModelNames.includes(modelName)) {
      allModels.push({
        id: modelName,
        ...PRE_TRAINED_MODELS[modelName],
        installed: false,
      });
    }
  });

  return allModels;
}

// Helper function to ensure a model is downloaded
async function ensureModelDownloaded(modelName) {
  try {
    // Get installed models
    const installedModels = await getInstalledModels();
    const installedModelNames = installedModels.map((model) => model.id);

    // Check if the model is already installed
    if (installedModelNames.includes(modelName)) {
      console.log(`Model ${modelName} is already installed`);
      return true;
    }

    // Check if the model is in the list of available models
    if (!PRE_TRAINED_MODELS[modelName]) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    // Download the model
    await downloadModel(modelName);
    return true;
  } catch (error) {
    console.error(`Error ensuring model ${modelName} is downloaded:`, error);
    throw error;
  }
}

// Helper function to get the default model
async function getDefaultModel() {
  try {
    const allModels = await getAllModels();

    // First, try to find an installed default model
    const installedDefaultModel = allModels.find(
      (model) => model.isDefault && model.installed
    );
    if (installedDefaultModel) {
      return installedDefaultModel.id;
    }

    // Next, try to find any installed model
    const anyInstalledModel = allModels.find((model) => model.installed);
    if (anyInstalledModel) {
      return anyInstalledModel.id;
    }

    // If no models are installed, find a default one to download
    const defaultModel = allModels.find((model) => model.isDefault);
    if (defaultModel) {
      await downloadModel(defaultModel.id);
      return defaultModel.id;
    }

    // Last resort: use the first available model
    const firstModel = allModels[0];
    if (firstModel) {
      await downloadModel(firstModel.id);
      return firstModel.id;
    }

    throw new Error("No models available");
  } catch (error) {
    console.error("Error getting default model:", error);
    throw error;
  }
}

export default {
  getInstalledModels,
  getAllModels,
  downloadModel,
  ensureModelDownloaded,
  getDefaultModel,
  MODELS_DIR,
};
