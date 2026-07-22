/**
 * Frontend Dockerfile Tests
 * TDD Phase 1: RED - Write Failing Tests First
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
  hasEfficientLayerCaching,
  bytesToMB
} from '../helpers/docker';

const FRONTEND_DOCKERFILE = path.join(process.cwd(), 'Dockerfile');
const TEST_TAG = 'alchemy-frontend-test:latest';
const CONTEXT = process.cwd();

// Maximum allowed image size in MB
const MAX_IMAGE_SIZE_MB = 150;

describe('Frontend Dockerfile - TDD Tests', () => {
  beforeAll(async () => {
    // Cleanup any existing test images
    await cleanupImages([TEST_TAG]);
  });

  afterAll(async () => {
    // Cleanup test images after all tests
    await cleanupImages([TEST_TAG]);
  });

  describe('Build Success', () => {
    it('should build successfully', async () => {
      const result = await buildImage(
        FRONTEND_DOCKERFILE,
        CONTEXT,
        TEST_TAG,
        { NODE_ENV: 'production' }
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.duration).toBeGreaterThan(0);
    }, 300000); // 5 minute timeout for build

    it('should create a valid Docker image', async () => {
      const info = await inspectImage(TEST_TAG);

      expect(info).not.toBeNull();
      expect(info?.architecture).toBeTruthy();
      expect(info?.created).toBeTruthy();
    });
  });

  describe('Multi-Stage Build', () => {
    it('should use multi-stage build', () => {
      const stages = countDockerfileStages(FRONTEND_DOCKERFILE);

      expect(stages).toBeGreaterThanOrEqual(2);
    });

    it('should have dependencies, development, builder, and production stages', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /FROM.*AS dependencies/i)).toBe(true);
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /FROM.*AS development/i)).toBe(true);
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /FROM.*AS builder/i)).toBe(true);
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /FROM.*AS production/i)).toBe(true);
    });

    it('should copy from builder stage in production', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /COPY --from=builder/i)).toBe(true);
    });
  });

  describe('Image Optimization', () => {
    it(`should produce optimized image size (< ${MAX_IMAGE_SIZE_MB}MB)`, async () => {
      const sizeMB = await getImageSizeMB(TEST_TAG);

      expect(sizeMB).toBeLessThan(MAX_IMAGE_SIZE_MB);
      expect(sizeMB).toBeGreaterThan(0);
    });

    it('should not include node_modules in final image', async () => {
      // This test verifies that the production stage doesn't have node_modules
      // by checking that it uses COPY --from=builder for dist files
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /COPY --from=builder.*dist/i)).toBe(true);
    });

    it('should have reasonable number of layers', async () => {
      const info = await inspectImage(TEST_TAG);

      expect(info).not.toBeNull();
      expect(info!.layers).toBeLessThanOrEqual(20);
      expect(info!.layers).toBeGreaterThan(0);
    });
  });

  describe('Base Images', () => {
    it('should use official base images', () => {
      const usesOfficial = usesOfficialBaseImage(FRONTEND_DOCKERFILE);

      expect(usesOfficial).toBe(true);
    });

    it('should use node:20-alpine for builder stage', () => {
      const baseImages = getBaseImages(FRONTEND_DOCKERFILE);
      const hasNodeAlpine = baseImages.some(img => img.includes('node:20-alpine'));

      expect(hasNodeAlpine).toBe(true);
    });

    it('should use nginx:alpine for production stage', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /FROM nginx:alpine/i)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should set correct working directory', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /WORKDIR \/app/i)).toBe(true);
    });

    it('should expose port 8001', () => {
      const ports = getExposedPorts(FRONTEND_DOCKERFILE);

      expect(ports).toContain(8001);
    });

    it('should set NODE_ENV=production in production stage', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /NODE_ENV=production/)).toBe(true);
    });
  });

  describe('Layer Caching Efficiency', () => {
    it('should copy package.json before source code for efficient caching', () => {
      const hasEfficient = hasEfficientLayerCaching(FRONTEND_DOCKERFILE);

      expect(hasEfficient).toBe(true);
    });

    it('should use npm ci for production dependencies', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /npm ci/i)).toBe(true);
    });

    it('should clean npm cache after install', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /npm cache clean/i)).toBe(true);
    });
  });

  describe('Security', () => {
    it('should create non-root user', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /adduser|addgroup/i)).toBe(true);
    });

    it('should switch to non-root user', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /USER soundforge/i)).toBe(true);
    });
  });

  describe('Health Checks', () => {
    it('should include health check', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /HEALTHCHECK/i)).toBe(true);
    });

    it('should use curl for health check', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /curl -f http:\/\/localhost/i)).toBe(true);
    });
  });

  describe('Build Output', () => {
    it('should run npm run build in builder stage', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /RUN npm run build/i)).toBe(true);
    });

    it('should copy dist directory to production', () => {
      expect(dockerfileContains(FRONTEND_DOCKERFILE, /COPY --from=builder.*\/app\/dist/i)).toBe(true);
    });
  });
});
