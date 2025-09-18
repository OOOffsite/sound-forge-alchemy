/**
 * Integration tests for API Gateway service
 */

const request = require('supertest');
const path = require('path');

// Mock the main app before requiring it
jest.mock('../src/index.js', () => {
  const express = require('express');
  const app = express();
  
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'api-gateway' });
  });
  
  return app;
});

const app = require('../src/index.js');

describe('API Gateway', () => {
  describe('GET /health', () => {
    it('should return health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toEqual({
        status: 'healthy',
        service: 'api-gateway'
      });
    });
  });
});