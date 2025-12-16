# Python Stack Optimization Strategy
## Sound Forge Alchemy

**Generated:** 2025-12-16
**Agent:** Python Stack Analysis
**Project:** /Users/jeremiah/Developer/sound-forge-alchemy

---

## Executive Summary

Sound Forge Alchemy uses Python for three critical functions:
1. **Demucs** (processing-service) - AI source separation
2. **spotdl** (spotify/download services) - Track download and metadata
3. **librosa/pretty_midi** (analysis-service) - Audio feature extraction

The current integration is functional but has several optimization opportunities around performance, reliability, and maintainability.

---

## Current Architecture

### Integration Pattern
```
Node.js Service → spawn('python3', args) → Python Process
                                            ↓
                    Results ← stdout/file/Redis ← Python Output
```

### Services and Tools

| Service | Python Tool | Version | Purpose | Integration Method |
|---------|------------|---------|---------|-------------------|
| processing | Demucs | 4.0.1 | Source separation | spawn() + stdout parsing |
| spotify | spotdl | 4.2.3 | Metadata extraction | exec()/spawn() + temp JSON files |
| download | spotdl | 4.2.3 | Audio download | spawn() + stdout parsing |
| analysis | librosa/pretty_midi | 0.9.2+/0.2.10+ | Feature extraction | spawn(analyzer.py) + Redis |

---

## Key Findings

### Strengths
- **Demucs quality**: Best-in-class music source separation
- **librosa features**: Comprehensive audio analysis capabilities
- **Memory management**: analyzer.py has good memory monitoring and downsampling
- **Progress tracking**: Real-time progress via stdout parsing and Redis pub/sub

### Weaknesses
- **No process timeouts**: Hung processes can consume resources indefinitely
- **No retry logic**: Transient failures are permanent
- **Cold start overhead**: New Python interpreter spawned for each job (~200-500ms)
- **First-run model download**: Demucs models downloaded on first use (30-60s delay)
- **Temp file pattern**: spotdl uses temp JSON files instead of stdout streaming
- **No concurrency limiting**: Unlimited concurrent jobs can exhaust memory
- **No GPU detection**: Processing service doesn't detect/fallback if GPU unavailable

---

## Optimization Roadmap

### Phase 1: Quick Wins (1-2 days)

#### 1.1 Pre-download Demucs Models (Priority: HIGH)
**Impact:** Eliminates 30-60s first-run delay
**Effort:** 2 hours
**Implementation:**
```dockerfile
# Add to docker/base-images/Dockerfile.gpu-base
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')" && \
    python -c "from demucs.pretrained import get_model; get_model('htdemucs_ft')"
```

#### 1.2 Add Process Timeouts (Priority: HIGH)
**Impact:** Prevents zombie processes
**Effort:** 3 hours
**Implementation:**
```javascript
// Wrapper function
function spawnWithTimeout(command, args, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Process timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      code === 0 ? resolve() : reject(new Error(`Exit code ${code}`));
    });
  });
}
```

#### 1.3 Implement Retry Logic (Priority: HIGH)
**Impact:** Improves reliability for transient errors
**Effort:** 4 hours
**Implementation:**
```javascript
async function retryPythonProcess(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### 1.4 Add GPU Detection (Priority: MEDIUM)
**Impact:** Better error messages, automatic CPU fallback
**Effort:** 2 hours
**Implementation:**
```javascript
// In processing service startup
const hasGPU = await checkGPUAvailability();
if (!hasGPU && process.env.USE_GPU === 'true') {
  logger.warn('GPU requested but not available, falling back to CPU');
  process.env.USE_GPU = 'false';
}

async function checkGPUAvailability() {
  try {
    const { stdout } = await execPromise('python -c "import torch; print(torch.cuda.is_available())"');
    return stdout.trim() === 'True';
  } catch {
    return false;
  }
}
```

### Phase 2: Structural Improvements (1 week)

#### 2.1 Job Queue with Concurrency Limiting (Priority: HIGH)
**Impact:** Prevents memory exhaustion, better resource utilization
**Effort:** 2 days
**Implementation:**
```javascript
// Use Bull/BullMQ
const Queue = require('bull');
const processingQueue = new Queue('audio-processing', process.env.REDIS_URL);

// Add concurrency limit
processingQueue.process(3, async (job) => {
  return await processSeparation(job.data);
});

// Submit jobs
app.post('/separate', async (req, res) => {
  const job = await processingQueue.add(req.body);
  res.json({ jobId: job.id, status: 'queued' });
});
```

#### 2.2 Replace spotdl Temp Files with Stdout (Priority: MEDIUM)
**Impact:** Fewer I/O operations, cleaner error handling
**Effort:** 1 day
**Implementation:**
```javascript
// Modify spotdl invocation to output JSON to stdout
const spotdl = spawn('python3', ['-m', 'spotdl', 'save', url, '--output', '-']);
let jsonOutput = '';

spotdl.stdout.on('data', (data) => {
  jsonOutput += data.toString();
});

spotdl.on('close', (code) => {
  if (code === 0) {
    const metadata = JSON.parse(jsonOutput);
    // Process metadata
  }
});
```

#### 2.3 Python Worker Pool for Analysis (Priority: HIGH)
**Impact:** 2-3x faster analysis, eliminates cold start
**Effort:** 3 days
**Implementation:**
```javascript
// Create worker pool
class PythonWorkerPool {
  constructor(size = 3) {
    this.workers = [];
    this.queue = [];
    for (let i = 0; i < size; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = spawn('python3', ['-u', 'worker.py']);
    worker.available = true;
    this.workers.push(worker);

    worker.stdout.on('data', (data) => {
      const result = JSON.parse(data.toString());
      worker.currentJob.resolve(result);
      this.markAvailable(worker);
    });
  }

  async execute(task) {
    const worker = await this.getAvailableWorker();
    return new Promise((resolve, reject) => {
      worker.currentJob = { resolve, reject };
      worker.stdin.write(JSON.stringify(task) + '\n');
    });
  }
}
```

### Phase 3: Long-term Enhancements (2-4 weeks)

#### 3.1 Migrate to yt-dlp + Spotify Web API (Priority: MEDIUM)
**Impact:** Better reliability, official API support
**Effort:** 2 weeks

**Benefits:**
- Official Spotify metadata (accurate, reliable)
- Better YouTube download control via yt-dlp
- No intermediate temp files
- Clearer error messages

**Drawbacks:**
- Two separate integrations to maintain
- OAuth flow complexity for Spotify API
- Need to manage Spotify API credentials

**Implementation Phases:**
1. Integrate Spotify Web API for metadata (3 days)
2. Replace spotdl download with yt-dlp (3 days)
3. Migrate existing code paths (4 days)
4. Testing and validation (4 days)

#### 3.2 Hybrid Client/Server Analysis (Priority: LOW)
**Impact:** Better UX for basic features, reduced server load
**Effort:** 2 weeks

**Client-side (Web Audio API):**
- Waveform visualization
- Basic frequency spectrum
- RMS volume levels
- Simple beat detection

**Server-side (Python):**
- Advanced tempo/key detection
- Source separation
- MIDI extraction
- Structural segmentation

#### 3.3 gRPC Service for Python (Priority: LOW)
**Impact:** Type-safe communication, better streaming
**Effort:** 3 weeks

**Benefits:**
- Bidirectional streaming
- Type safety via protobuf
- Better error handling
- Language-agnostic interface

**Challenges:**
- Additional infrastructure
- Proto file maintenance
- More complex deployment

---

## Alternative Evaluations

### Can spotdl be replaced?

**Answer:** Yes, with yt-dlp + Spotify Web API

| Criterion | spotdl | yt-dlp + Spotify API |
|-----------|--------|---------------------|
| Metadata accuracy | Good | Excellent (official) |
| Download reliability | Good | Excellent |
| Error handling | Fair | Good |
| Maintenance burden | Low | Medium |
| Flexibility | Medium | High |

**Recommendation:** Consider for v2.0 refactor, significant reliability improvement worth the effort.

### Can analysis be client-side?

**Answer:** Partially, with hybrid approach

| Feature | Client-side Feasible? | Notes |
|---------|----------------------|-------|
| Waveform | ✅ Yes | Web Audio API |
| Spectrum | ✅ Yes | FFT via Web Audio API |
| Basic tempo | ⚠️ Limited | Simple BPM detection possible |
| Key detection | ❌ No | Requires ML models |
| Source separation | ❌ No | Too computationally intensive |
| MIDI extraction | ❌ No | Requires complex DSP |

**Recommendation:** Implement hybrid - basic features client-side, advanced server-side.

### Can Demucs be optimized?

**Answer:** Yes, several approaches

1. **Pre-load models in Docker** (easy, high impact)
2. **Use smaller models for preview** (htdemucs → htdemucs_ft for speed)
3. **Progressive streaming output** (show stems as they complete)
4. **Batch processing** (separate multiple tracks in one process)

**Alternative models:**
- Spleeter: 2-3x faster, but 10-15% lower quality
- Open-Unmix: Similar quality, less actively maintained

**Recommendation:** Keep Demucs for quality, optimize around it.

### Better Python-Node.js bridges?

**Answer:** Yes, worker pool is best immediate improvement

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Current (spawn) | Simple, isolated | Cold start overhead | Baseline |
| Worker pool | Reuse interpreters, faster | State management | **Implement in Phase 2** |
| gRPC service | Type-safe, scalable | Infrastructure overhead | Future consideration |
| Message queue | Decoupled, reliable | Complexity | For distributed setup |

---

## Implementation Priority Matrix

| Priority | Optimization | Effort | Impact | Phase |
|----------|-------------|--------|--------|-------|
| 1 | Pre-download Demucs models | Low | High | 1 |
| 2 | Add process timeouts | Low | High | 1 |
| 3 | Implement retry logic | Low | High | 1 |
| 4 | Job queue + concurrency limiting | Medium | High | 2 |
| 5 | Python worker pool | Medium | High | 2 |
| 6 | GPU detection + fallback | Low | Medium | 1 |
| 7 | Replace spotdl temp files | Medium | Medium | 2 |
| 8 | Migrate to yt-dlp + Spotify API | High | Medium | 3 |
| 9 | Hybrid client/server analysis | High | Medium | 3 |
| 10 | gRPC service | High | Low | 3 |

---

## Monitoring and Metrics

### Key Performance Indicators

1. **Process spawn time**: Target <200ms
2. **Demucs separation time**: Target <60s for 3-minute track
3. **Analysis time**: Target <20s for 3-minute track
4. **Memory peak**: Target <2GB per concurrent job
5. **Error rate**: Target <2% for transient errors
6. **Retry success rate**: Target >80%

### Recommended Monitoring

```javascript
// Add to each Python invocation
const startTime = Date.now();
const proc = spawn(command, args);

proc.on('close', (code) => {
  const duration = Date.now() - startTime;
  logger.info('Python process completed', {
    command,
    duration,
    exitCode: code,
    success: code === 0
  });

  // Send to metrics service (Prometheus, Datadog, etc.)
  metrics.histogram('python.process.duration', duration, {
    command,
    success: code === 0
  });
});
```

---

## Conclusion

The Python stack integration is functional but has significant optimization opportunities. The three-phase roadmap provides a clear path from quick wins (Phase 1) to structural improvements (Phase 2) to long-term enhancements (Phase 3).

**Immediate priorities:**
1. Pre-download Demucs models (2 hours, high impact)
2. Add process timeouts (3 hours, high impact)
3. Implement retry logic (4 hours, high impact)

**Total Phase 1 effort:** 1-2 days
**Expected improvement:** 40-50% reduction in errors, elimination of first-run delays

**Next steps:**
1. Review and approve optimization roadmap
2. Create issues/tasks for Phase 1 items
3. Assign to development team
4. Begin implementation with monitoring infrastructure

---

## Appendix: Code Examples

### A1: Complete Timeout + Retry Wrapper

```javascript
// utils/pythonProcess.js
const { spawn } = require('child_process');
const logger = require('./logger');

class PythonProcessError extends Error {
  constructor(message, code, stderr) {
    super(message);
    this.code = code;
    this.stderr = stderr;
  }
}

async function executePythonWithRetry(command, args, options = {}) {
  const {
    maxRetries = 3,
    timeoutMs = 300000,
    onProgress = null,
    retryDelay = 1000
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executePython(command, args, { timeoutMs, onProgress });
    } catch (error) {
      logger.warn(`Python process failed (attempt ${attempt}/${maxRetries})`, {
        command,
        error: error.message
      });

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function executePython(command, args, options = {}) {
  const { timeoutMs = 300000, onProgress = null } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new PythonProcessError('Process timeout', 'TIMEOUT', stderr));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      if (onProgress) {
        onProgress(data.toString());
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new PythonProcessError(
          `Process exited with code ${code}`,
          code,
          stderr
        ));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

module.exports = {
  executePython,
  executePythonWithRetry,
  PythonProcessError
};
```

### A2: Worker Pool Implementation

```javascript
// workers/pythonWorkerPool.js
const { spawn } = require('child_process');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class PythonWorkerPool extends EventEmitter {
  constructor(scriptPath, poolSize = 3) {
    super();
    this.scriptPath = scriptPath;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.initialize();
  }

  initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker(i);
    }
  }

  createWorker(id) {
    const worker = {
      id,
      process: spawn('python3', ['-u', this.scriptPath]),
      available: true,
      currentJob: null
    };

    worker.process.stdout.on('data', (data) => {
      if (worker.currentJob) {
        try {
          const result = JSON.parse(data.toString());
          worker.currentJob.resolve(result);
          this.markAvailable(worker);
        } catch (error) {
          logger.error('Error parsing worker output', { error, data: data.toString() });
        }
      }
    });

    worker.process.stderr.on('data', (data) => {
      logger.error(`Worker ${id} stderr:`, data.toString());
    });

    worker.process.on('exit', (code) => {
      logger.warn(`Worker ${id} exited with code ${code}, restarting...`);
      this.workers = this.workers.filter(w => w.id !== id);
      this.createWorker(id);
    });

    this.workers.push(worker);
  }

  async execute(task) {
    return new Promise((resolve, reject) => {
      const job = { task, resolve, reject };
      this.queue.push(job);
      this.processQueue();
    });
  }

  processQueue() {
    if (this.queue.length === 0) return;

    const worker = this.workers.find(w => w.available);
    if (!worker) return;

    const job = this.queue.shift();
    worker.available = false;
    worker.currentJob = job;

    worker.process.stdin.write(JSON.stringify(job.task) + '\n');
  }

  markAvailable(worker) {
    worker.available = true;
    worker.currentJob = null;
    this.processQueue();
  }

  shutdown() {
    this.workers.forEach(worker => {
      worker.process.kill('SIGTERM');
    });
  }
}

module.exports = PythonWorkerPool;
```

---

**End of Report**
