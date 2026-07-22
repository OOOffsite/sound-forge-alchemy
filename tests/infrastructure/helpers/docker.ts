/**
 * Docker Test Helpers for Alchemy2
 * TDD Infrastructure Testing Utilities
 *
 * @author Claude Code (TDD Agent)
 * @version 1.0.0
 * @license MIT
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

export interface DockerImageInfo {
  size: number;
  layers: number;
  created: string;
  architecture: string;
}

export interface DockerBuildResult {
  success: boolean;
  duration: number;
  imageSize: number;
  buildOutput: string;
  error?: string;
}

/**
 * Build a Docker image and return build information
 */
export async function buildImage(
  dockerfile: string,
  context: string,
  tag: string,
  buildArgs?: Record<string, string>
): Promise<DockerBuildResult> {
  const startTime = Date.now();

  try {
    const buildArgsStr = buildArgs
      ? Object.entries(buildArgs).map(([k, v]) => `--build-arg ${k}=${v}`).join(' ')
      : '';

    const command = `docker build -f ${dockerfile} -t ${tag} ${buildArgsStr} ${context} 2>&1`;
    const buildOutput = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const duration = Date.now() - startTime;
    const imageSize = await getImageSize(tag);

    return {
      success: true,
      duration,
      imageSize,
      buildOutput
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      imageSize: 0,
      buildOutput: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get image size in bytes
 */
export async function getImageSize(tag: string): Promise<number> {
  try {
    const output = execSync(`docker image inspect ${tag} --format='{{.Size}}'`, {
      encoding: 'utf-8'
    });
    return parseInt(output.trim(), 10);
  } catch {
    return 0;
  }
}

/**
 * Get image size in MB
 */
export async function getImageSizeMB(tag: string): Promise<number> {
  const bytes = await getImageSize(tag);
  return Math.round(bytes / (1024 * 1024));
}

/**
 * Inspect Docker image and return detailed info
 */
export async function inspectImage(tag: string): Promise<DockerImageInfo | null> {
  try {
    const output = execSync(`docker image inspect ${tag}`, {
      encoding: 'utf-8'
    });
    const data = JSON.parse(output)[0];

    return {
      size: data.Size,
      layers: data.RootFS?.Layers?.length || 0,
      created: data.Created,
      architecture: data.Architecture
    };
  } catch {
    return null;
  }
}

/**
 * Check if image exists
 */
export async function imageExists(tag: string): Promise<boolean> {
  try {
    execSync(`docker image inspect ${tag}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove Docker image
 */
export async function removeImage(tag: string, force = true): Promise<void> {
  try {
    const forceFlag = force ? '-f' : '';
    execSync(`docker rmi ${forceFlag} ${tag}`, { stdio: 'pipe' });
  } catch {
    // Image might not exist
  }
}

/**
 * Cleanup multiple images
 */
export async function cleanupImages(tags: string[]): Promise<void> {
  for (const tag of tags) {
    await removeImage(tag, true);
  }
}

/**
 * Check if Dockerfile contains specific content
 */
export function dockerfileContains(dockerfilePath: string, pattern: string | RegExp): boolean {
  if (!existsSync(dockerfilePath)) {
    return false;
  }

  const content = readFileSync(dockerfilePath, 'utf-8');

  if (typeof pattern === 'string') {
    return content.includes(pattern);
  }

  return pattern.test(content);
}

/**
 * Count number of stages in multi-stage Dockerfile
 */
export function countDockerfileStages(dockerfilePath: string): number {
  if (!existsSync(dockerfilePath)) {
    return 0;
  }

  const content = readFileSync(dockerfilePath, 'utf-8');
  const matches = content.match(/^FROM\s+.*\s+AS\s+\w+/gim);
  return matches ? matches.length : 0;
}

/**
 * Extract base images from Dockerfile
 */
export function getBaseImages(dockerfilePath: string): string[] {
  if (!existsSync(dockerfilePath)) {
    return [];
  }

  const content = readFileSync(dockerfilePath, 'utf-8');
  const matches = content.match(/^FROM\s+([^\s]+)/gim);

  if (!matches) {
    return [];
  }

  return matches.map(m => m.replace(/^FROM\s+/, ''));
}

/**
 * Check if Dockerfile uses official base image
 */
export function usesOfficialBaseImage(dockerfilePath: string): boolean {
  const baseImages = getBaseImages(dockerfilePath);

  // Official images are from Docker Hub without a slash (e.g., node:20-alpine, nginx:alpine)
  // or explicitly from docker.io
  return baseImages.some(img => {
    const imageName = img.split(' AS ')[0].trim();
    return !imageName.includes('/') || imageName.startsWith('docker.io/');
  });
}

/**
 * Get exposed ports from Dockerfile
 */
export function getExposedPorts(dockerfilePath: string): number[] {
  if (!existsSync(dockerfilePath)) {
    return [];
  }

  const content = readFileSync(dockerfilePath, 'utf-8');
  const matches = content.match(/^EXPOSE\s+(\d+)/gim);

  if (!matches) {
    return [];
  }

  return matches.map(m => parseInt(m.replace(/^EXPOSE\s+/, ''), 10));
}

/**
 * Check if Dockerfile has efficient layer caching (package.json copied before source)
 */
export function hasEfficientLayerCaching(dockerfilePath: string): boolean {
  if (!existsSync(dockerfilePath)) {
    return false;
  }

  const content = readFileSync(dockerfilePath, 'utf-8');
  const lines = content.split('\n');

  let packageJsonIndex = -1;
  let copyAllIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.match(/^COPY\s+.*package.*\.json/i)) {
      packageJsonIndex = i;
    }

    if (line.match(/^COPY\s+\.\s+\./)) {
      copyAllIndex = i;
    }
  }

  // package.json should be copied before the full source
  return packageJsonIndex !== -1 && copyAllIndex !== -1 && packageJsonIndex < copyAllIndex;
}

/**
 * Parse docker-compose.yml and return services
 */
export function parseDockerCompose(composePath: string): any {
  if (!existsSync(composePath)) {
    return null;
  }

  const content = readFileSync(composePath, 'utf-8');

  // Basic YAML parsing for services (simplified)
  const services: any = {};
  const lines = content.split('\n');
  let currentService = '';

  for (const line of lines) {
    const serviceMatch = line.match(/^(\w+[\w-]*):$/);
    if (serviceMatch && lines[lines.indexOf(line) - 1]?.trim() === 'services:') {
      currentService = serviceMatch[1];
      services[currentService] = {};
    }
  }

  return { services };
}

/**
 * Measure build time with cache
 */
export async function measureBuildWithCache(
  dockerfile: string,
  context: string,
  tag: string
): Promise<{ firstBuild: number; cachedBuild: number }> {
  // First build
  const firstResult = await buildImage(dockerfile, context, tag);
  const firstBuild = firstResult.duration;

  // Second build (should use cache)
  const cachedResult = await buildImage(dockerfile, context, tag);
  const cachedBuild = cachedResult.duration;

  return { firstBuild, cachedBuild };
}

/**
 * Calculate MB from bytes
 */
export function bytesToMB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

/**
 * Format duration in seconds
 */
export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}
