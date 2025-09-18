/**
 * Integration tests for WebSocket service
 */

import { Server } from 'socket.io';
import { createServer } from 'http';

describe('WebSocket Service', () => {
  let io: Server;
  let httpServer: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(0, done);
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  describe('Connection', () => {
    it('should handle socket connections', (done) => {
      io.on('connection', (socket) => {
        expect(socket).toBeDefined();
        expect(socket.id).toBeDefined();
        done();
      });

      // Simulate a client connection
      const Client = require('socket.io-client');
      const clientSocket = Client(`http://localhost:${httpServer.address()?.port}`);
      
      clientSocket.on('connect', () => {
        clientSocket.close();
      });
    });
  });

  describe('Events', () => {
    it('should handle custom events', (done) => {
      io.on('connection', (socket) => {
        socket.on('test:event', (data) => {
          expect(data).toEqual({ message: 'test' });
          socket.emit('test:response', { received: true });
        });
      });

      const Client = require('socket.io-client');
      const clientSocket = Client(`http://localhost:${httpServer.address()?.port}`);
      
      clientSocket.on('connect', () => {
        clientSocket.emit('test:event', { message: 'test' });
        
        clientSocket.on('test:response', (data) => {
          expect(data).toEqual({ received: true });
          clientSocket.close();
          done();
        });
      });
    });
  });
});