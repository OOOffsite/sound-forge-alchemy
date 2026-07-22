/**
 * Backend Services Dockerfile Tests
 * TDD Phase 1: RED - Write Failing Tests First
 *
 * Tests for API Gateway, Spotify, Download, Processing, Analysis, and WebSocket services
 *
 * @author Claude Code (TDD Agent)
 * @version 1.0.0
 * @license MIT
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import {
  buildImage,
  getImageSizeMB,
  inspectImage,
  cleanupImages,
  dockerfileContains,
  countDockerfileStages,
  getBaseImages,
  usesOfficialBaseImage,
  getExposedPorts,
  hasEfficientLayerCaching
} from '../helpers/docker';

// Backend service configurations
const BACKEND_SERVICES = [
  {
    name: 'API Gateway',
    dockerfile: path.join(process.cwd(), 'backend/api-gateway/Dockerfile'),
    context: path.join(process.cwd(), 'backend/api-gateway'),
    tag: 'alchemy-api-gateway-test:latest',
    maxSizeMB: 200,
    port: 3000,
    baseImage: 'node:20-alpine'
  },
  {
    name: 'Spotify Service',
    dockerfile: path.join(process.cwd(), 'backend/spotify/Dockerfile'),
    context: path.join(process.cwd(), 'backend/spotify'),
    tag: 'alchemy-spotify-test:latest',
    maxSizeMB: 400, // Larger due to Python + Node.js
    port: 3001,
    baseImage: 'python:3.10-slim'
  },
  {
    name: 'Download Service',
    dockerfile: path.join(process.cwd(), 'backend/download/Dockerfile'),
    context: path.join(process.cwd(), 'backend/download'),
    tag: 'alchemy-download-test:latest',
    maxSizeMB: 200,
    port: 3002,
    baseImage: 'node:20-alpine'
  },
  {
    name: 'Processing Service',
    dockerfile: path.join(process.cwd(), 'backend/processing/Dockerfile'),
    context: path.join(process.cwd(), 'backend/processing'),
    tag: 'alchemy-processing-test:latest',
    maxSizeMB: 600, // Larger due to Python, Node.js, and Demucs
    port: 3003,
    baseImage: 'python:3.10-slim'
  },
  {
    name: 'Analysis Service',
    dockerfile: path.join(process.cwd(), 'backend/analysis/Dockerfile'),
    context: path.join(process.cwd(), 'backend/analysis'),
    tag: 'alchemy-analysis-test:latest',
    maxSizeMB: 200,
    port: 3004,
    baseImage: 'node:20-alpine'
  },
  {
    name: 'WebSocket Service',
    dockerfile: path.join(process.cwd(), 'backend/websocket/Dockerfile'),
    context: path.join(process.cwd(), 'backend/websocket'),
    tag: 'alchemy-websocket-test:latest',
    maxSizeMB: 200,
    port: 3006,
    baseImage: 'node:20-alpine'
  }
];

describe('Backend Services Dockerfiles - TDD Tests', () => {
  beforeAll(async () => {
    // Cleanup any existing test images
    const tags = BACKEND_SERVICES.map(s => s.tag);
    await cleanupImages(tags);
  });

  afterAll(async () => {
    // Cleanup test images after all tests
    const tags = BACKEND_SERVICES.map(s => s.tag);
    await cleanupImages(tags);
  });

  BACKEND_SERVICES.forEach(service => {
    describe(`${service.name} Dockerfile`, () => {
      describe('Build Success', () => {
        it('should build successfully', async () => {
          const result = await buildImage(
            service.dockerfile,
            service.context,
            service.tag,
            { NODE_ENV: 'production' }
          );

          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          expect(result.duration).toBeGreaterThan(0);
        }, 600000); // 10 minute timeout for complex builds

        it('should create a valid Docker image', async () => {
          const info = await inspectImage(service.tag);

          expect(info).not.toBeNull();
          expect(info?.architecture).toBeTruthy();
          expect(info?.created).toBeTruthy();
        });
      });

      describe('Base Image', () => {
        it(`should use ${service.baseImage} base image`, () => {
          const baseImages = getBaseImages(service.dockerfile);
          const hasCorrectBase = baseImages.some(img => img.includes(service.baseImage));

          expect(hasCorrectBase).toBe(true);
        });

        it('should use official base images', () => {
          const usesOfficial = usesOfficialBaseImage(service.dockerfile);

          expect(usesOfficial).toBe(true);
        });
      });

      describe('Dependencies', () => {
        it('should install dependencies correctly', () => {
          expect(dockerfileContains(service.dockerfile, /npm (ci|install)/i)).toBe(true);
        });

        it('should clean npm cache after install', () => {
          expect(dockerfileContains(service.dockerfile, /npm cache clean/i)).toBe(true);
        });

        it('should copy package.json before source code', () => {
          const hasEfficient = hasEfficientLayerCaching(service.dockerfile);

          expect(hasEfficient).toBe(true);
        });
      });

      describe('Image Optimization', () => {
        it(`should produce optimized image size (< ${service.maxSizeMB}MB)`, async () => {
          const sizeMB = await getImageSizeMB(service.tag);

          expect(sizeMB).toBeLessThan(service.maxSizeMB);
          expect(sizeMB).toBeGreaterThan(0);
        });

        it('should have reasonable number of layers', async () => {
          const info = await inspectImage(service.tag);

          expect(info).not.toBeNull();
          expect(info!.layers).toBeLessThanOrEqual(30);
          expect(info!.layers).toBeGreaterThan(0);
        });
      });

      describe('Configuration', () => {
        it('should set NODE_ENV=production', () => {
          expect(dockerfileContains(service.dockerfile, /NODE_ENV=production/)).toBe(true);
        });

        it(`should expose port ${service.port}`, () => {
          const ports = getExposedPorts(service.dockerfile);

          expect(ports).toContain(service.port);
        });

        it('should set working directory to /app', () => {
          expect(dockerfileContains(service.dockerfile, /WORKDIR \/app/i)).toBe(true);
        });

        it('should set SERVICE_NAME environment variable', () => {
          expect(dockerfileContains(service.dockerfile, /SERVICE_NAME=/)).toBe(true);
        });
      });

      describe('Security', () => {
        it('should create non-root user', () => {
          expect(dockerfileContains(service.dockerfile, /(adduser|useradd)/i)).toBe(true);
        });

        it('should create soundforge group', () => {
          expect(dockerfileContains(service.dockerfile, /(addgroup|groupadd).*soundforge/i)).toBe(true);
        });

        it('should switch to non-root user', () => {
          expect(dockerfileContains(service.dockerfile, /USER soundforge/i)).toBe(true);
        });

        it('should set proper file permissions', () => {
          expect(dockerfileContains(service.dockerfile, /chown.*soundforge/i)).toBe(true);
        });
      });

      describe('Health Checks', () => {
        it('should include health check', () => {
          expect(dockerfileContains(service.dockerfile, /HEALTHCHECK/i)).toBe(true);
        });

        it('should use curl for health check', () => {
          expect(dockerfileContains(service.dockerfile, /curl -f http/i)).toBe(true);
        });

        it('should check /health endpoint', () => {
          expect(dockerfileContains(service.dockerfile, /\/health/)).toBe(true);
        });
      });

      describe('Runtime', () => {
        it('should have a CMD instruction', () => {
          expect(dockerfileContains(service.dockerfile, /^CMD/m)).toBe(true);
        });

        it('should create required directories', () => {
          expect(dockerfileContains(service.dockerfile, /mkdir -p/i)).toBe(true);
        });
      });
    });
  });

  describe('Multi-Stage Builds (Node.js Services)', () => {
    const nodeServices = BACKEND_SERVICES.filter(s =>
      s.baseImage.includes('node')
    );

    nodeServices.forEach(service => {
      describe(`${service.name}`, () => {
        it('should use multi-stage build', () => {
          const stages = countDockerfileStages(service.dockerfile);

          expect(stages).toBeGreaterThanOrEqual(2);
        });

        it('should have dependencies stage', () => {
          expect(dockerfileContains(service.dockerfile, /FROM.*AS dependencies/i)).toBe(true);
        });

        it('should have development stage', () => {
          expect(dockerfileContains(service.dockerfile, /FROM.*AS development/i)).toBe(true);
        });

        it('should have production stage', () => {
          expect(dockerfileContains(service.dockerfile, /FROM.*AS production/i)).toBe(true);
        });

        it('should copy from dependencies stage in production', () => {
          expect(dockerfileContains(service.dockerfile, /COPY --from=dependencies/i)).toBe(true);
        });
      });
    });
  });

  describe('Hybrid Services (Python + Node.js)', () => {
    const hybridServices = BACKEND_SERVICES.filter(s =>
      s.baseImage.includes('python')
    );

    hybridServices.forEach(service => {
      describe(`${service.name}`, () => {
        it('should install Node.js in Python image', () => {
          expect(dockerfileContains(service.dockerfile, /nodesource|nodejs/i)).toBe(true);
        });

        it('should install Python dependencies', () => {
          expect(dockerfileContains(service.dockerfile, /pip.*install.*requirements\.txt/i)).toBe(true);
        });

        it('should upgrade pip', () => {
          expect(dockerfileContains(service.dockerfile, /pip.*upgrade.*pip/i)).toBe(true);
        });

        it('should set PYTHONPATH', () => {
          expect(dockerfileContains(service.dockerfile, /PYTHONPATH=/)).toBe(true);
        });

        it('should set PYTHONUNBUFFERED', () => {
          expect(dockerfileContains(service.dockerfile, /PYTHONUNBUFFERED=/)).toBe(true);
        });
      });
    });
  });

  describe('Processing Service Specific', () => {
    const processingService = BACKEND_SERVICES.find(s => s.name === 'Processing Service');

    if (processingService) {
      it('should support GPU build argument', () => {
        expect(dockerfileContains(processingService.dockerfile, /ARG USE_GPU/i)).toBe(true);
      });

      it('should support BASE_IMAGE build argument', () => {
        expect(dockerfileContains(processingService.dockerfile, /ARG BASE_IMAGE/i)).toBe(true);
      });

      it('should install ffmpeg', () => {
        expect(dockerfileContains(processingService.dockerfile, /ffmpeg/i)).toBe(true);
      });

      it('should install Demucs', () => {
        expect(dockerfileContains(processingService.dockerfile, /demucs/i)).toBe(true);
      });

      it('should define model volume', () => {
        expect(dockerfileContains(processingService.dockerfile, /VOLUME.*models/i)).toBe(true);
      });
    }
  });
});
