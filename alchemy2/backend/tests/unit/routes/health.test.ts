/**
 * Health Check Test Suite
 *
 * @module tests/unit/routes/health
 * @description Simple test to verify Jest configuration
 * @author Sound Forge Alchemy Team - TDD Agent
 * @version 2.0.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';

describe('Health Check - Configuration Test', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('should have correct content type', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('should respond quickly', async () => {
    const startTime = Date.now();
    await request(app).get('/health');
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(100);
  });
});
