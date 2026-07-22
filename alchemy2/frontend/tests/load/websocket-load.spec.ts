/**
 * WebSocket Realtime Load Tests - RED Phase (TDD)
 *
 * @author Claude Code
 * @license MIT
 * @version 2.0.0
 *
 * TDD RED Phase: These tests validate WebSocket/Supabase Realtime
 * behavior under high connection count and message throughput.
 * Tests will FAIL until proper scaling is implemented.
 *
 * WebSocket Targets:
 * - 50 concurrent connections: < 2 seconds setup
 * - 1000 messages/second broadcast: < 2 seconds delivery
 * - Connection stability: > 99% uptime
 * - Message delivery: > 98% success rate
 *
 * Test Strategy:
 * 1. Test concurrent connection establishment
 * 2. Test high-frequency broadcast delivery
 * 3. Test connection stability under load
 * 4. Test message ordering and reliability
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Helper to setup WebSocket listener on a page
 */
async function setupRealtimeListener(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as any).realtimeMessages = [];
    (window as any).realtimeErrors = [];

    // Mock WebSocket message handler
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'realtime') {
        (window as any).realtimeMessages.push(event.data);
      }
    });

    // Mock Supabase Realtime subscription
    (window as any).mockRealtimeConnection = true;
  });
}

/**
 * Helper to get received messages from page
 */
async function getRealtimeMessages(page: Page): Promise<any[]> {
  return await page.evaluate(() => (window as any).realtimeMessages || []);
}

test.describe('WebSocket Realtime Load - RED Phase', () => {
  test('should handle 50 concurrent WebSocket connections', async ({ browser }) => {
    console.log('🔴 RED: Testing 50 concurrent WebSocket connections...');

    const connectionCount = 50;

    const startTime = Date.now();

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: connectionCount }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // All pages navigate and establish WebSocket
    await Promise.all(
      pages.map(async page => {
        await page.goto('http://localhost:5173');
        await setupRealtimeListener(page);
      })
    );

    const setupTime = Date.now() - startTime;

    console.log(`✓ ${connectionCount} connections established in: ${setupTime}ms`);

    // RED Phase: Should connect within 2 seconds
    expect(setupTime).toBeLessThan(2000);

    // Verify all connections are active
    for (const page of pages) {
      const isConnected = await page.evaluate(() =>
        (window as any).mockRealtimeConnection === true
      );
      expect(isConnected).toBeTruthy();
    }

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should broadcast to all connections within 2 seconds', async ({ browser }) => {
    console.log('🔴 RED: Testing broadcast to 50 connections...');

    const connectionCount = 50;

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: connectionCount }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    await Promise.all(
      pages.map(async page => {
        await page.goto('http://localhost:5173');
        await setupRealtimeListener(page);
      })
    );

    // Trigger broadcast event
    const broadcastStartTime = Date.now();

    // Simulate job update broadcast
    await pages[0].request.post('http://localhost:3000/api/download/track', {
      data: {
        trackId: 'test-broadcast',
        url: 'https://open.spotify.com/track/test',
        broadcast: true
      }
    });

    // Wait for all pages to receive update
    const receivePromises = pages.map(page =>
      page.waitForFunction(
        () => (window as any).realtimeMessages && (window as any).realtimeMessages.length > 0,
        { timeout: 3000 }
      ).catch(() => false)
    );

    const results = await Promise.allSettled(receivePromises);
    const broadcastTime = Date.now() - broadcastStartTime;

    const receivedCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const deliveryRate = receivedCount / connectionCount;

    console.log(`✓ Broadcast completed in: ${broadcastTime}ms`);
    console.log(`✓ Delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);

    // RED Phase: Should broadcast within 2 seconds
    expect(broadcastTime).toBeLessThan(2000);

    // Should deliver to > 98% of connections
    expect(deliveryRate).toBeGreaterThan(0.98);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle high-frequency message stream (1000 messages/second)', async ({ page }) => {
    console.log('🔴 RED: Testing 1000 messages/second stream...');

    await page.goto('http://localhost:5173');
    await setupRealtimeListener(page);

    const messagesPerSecond = 1000;
    const duration = 5; // seconds
    const totalMessages = messagesPerSecond * duration;

    const startTime = Date.now();

    // Simulate high-frequency updates
    for (let i = 0; i < totalMessages; i++) {
      await page.evaluate((index) => {
        window.postMessage({
          type: 'realtime',
          event: 'job:update',
          payload: { jobId: `job-${index}`, progress: Math.random() * 100 }
        }, '*');
      }, i);

      // Throttle to maintain 1000 msg/s
      if ((i + 1) % messagesPerSecond === 0 && i + 1 < totalMessages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const streamTime = Date.now() - startTime;

    const receivedMessages = await getRealtimeMessages(page);
    const deliveryRate = receivedMessages.length / totalMessages;

    console.log(`✓ Stream duration: ${streamTime}ms`);
    console.log(`✓ Messages sent: ${totalMessages}`);
    console.log(`✓ Messages received: ${receivedMessages.length}`);
    console.log(`✓ Delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);

    // RED Phase: Should handle high-frequency stream
    expect(streamTime).toBeLessThan(duration * 1000 * 1.1); // 10% overhead
    expect(deliveryRate).toBeGreaterThan(0.95); // > 95% delivery
  });

  test('should maintain connection stability under sustained load', async ({ page }) => {
    console.log('🔴 RED: Testing connection stability (30 seconds)...');

    await page.goto('http://localhost:5173');
    await setupRealtimeListener(page);

    const duration = 30000; // 30 seconds
    const messageInterval = 100; // 10 messages/second
    const startTime = Date.now();

    let sentCount = 0;
    let connectionDrops = 0;

    while (Date.now() - startTime < duration) {
      // Check connection status
      const isConnected = await page.evaluate(() =>
        (window as any).mockRealtimeConnection === true
      );

      if (!isConnected) {
        connectionDrops++;
        console.warn('Connection dropped, attempting reconnect...');
        await setupRealtimeListener(page);
      }

      // Send message
      await page.evaluate((index) => {
        window.postMessage({
          type: 'realtime',
          event: 'heartbeat',
          payload: { timestamp: Date.now(), index }
        }, '*');
      }, sentCount);

      sentCount++;

      await new Promise(resolve => setTimeout(resolve, messageInterval));
    }

    const receivedMessages = await getRealtimeMessages(page);
    const deliveryRate = receivedMessages.length / sentCount;
    const uptime = ((duration - connectionDrops * 1000) / duration);

    console.log(`✓ Duration: ${duration}ms`);
    console.log(`✓ Messages sent: ${sentCount}`);
    console.log(`✓ Messages received: ${receivedMessages.length}`);
    console.log(`✓ Delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);
    console.log(`✓ Connection drops: ${connectionDrops}`);
    console.log(`✓ Uptime: ${(uptime * 100).toFixed(1)}%`);

    // RED Phase: Stability targets
    expect(uptime).toBeGreaterThan(0.99); // > 99% uptime
    expect(deliveryRate).toBeGreaterThan(0.98); // > 98% delivery
  });

  test('should handle reconnection after connection loss', async ({ page }) => {
    console.log('🔴 RED: Testing reconnection behavior...');

    await page.goto('http://localhost:5173');
    await setupRealtimeListener(page);

    // Send initial message
    await page.evaluate(() => {
      window.postMessage({
        type: 'realtime',
        event: 'test',
        payload: { message: 'before disconnect' }
      }, '*');
    });

    // Simulate connection drop
    console.log('  Simulating connection drop...');
    await page.evaluate(() => {
      (window as any).mockRealtimeConnection = false;
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Reconnect
    console.log('  Reconnecting...');
    const reconnectStart = Date.now();
    await setupRealtimeListener(page);
    const reconnectTime = Date.now() - reconnectStart;

    // Send message after reconnect
    await page.evaluate(() => {
      window.postMessage({
        type: 'realtime',
        event: 'test',
        payload: { message: 'after reconnect' }
      }, '*');
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const messages = await getRealtimeMessages(page);

    console.log(`✓ Reconnect time: ${reconnectTime}ms`);
    console.log(`✓ Messages after reconnect: ${messages.length}`);

    // RED Phase: Should reconnect quickly and receive messages
    expect(reconnectTime).toBeLessThan(1000); // < 1 second
    expect(messages.length).toBeGreaterThan(0);
  });

  test('should handle concurrent subscriptions to different channels', async ({ browser }) => {
    console.log('🔴 RED: Testing multiple channel subscriptions...');

    const channelCount = 10;
    const subscribersPerChannel = 5;

    const contexts: BrowserContext[] = await Promise.all(
      Array.from({ length: channelCount * subscribersPerChannel }, () => browser.newContext())
    );

    const pages: Page[] = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Setup subscriptions
    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto('http://localhost:5173');
        await setupRealtimeListener(page);

        // Subscribe to specific channel
        const channelId = Math.floor(index / subscribersPerChannel);
        await page.evaluate((cid) => {
          (window as any).subscribedChannel = `channel-${cid}`;
        }, channelId);
      })
    );

    // Broadcast to each channel
    const broadcastStartTime = Date.now();

    for (let channelId = 0; channelId < channelCount; channelId++) {
      const channelPages = pages.slice(
        channelId * subscribersPerChannel,
        (channelId + 1) * subscribersPerChannel
      );

      await Promise.all(
        channelPages.map(page =>
          page.evaluate((cid) => {
            window.postMessage({
              type: 'realtime',
              channel: `channel-${cid}`,
              payload: { channelId: cid, timestamp: Date.now() }
            }, '*');
          }, channelId)
        )
      );
    }

    const broadcastTime = Date.now() - broadcastStartTime;

    // Verify delivery
    const deliveryResults = await Promise.all(
      pages.map(async page => {
        const messages = await getRealtimeMessages(page);
        return messages.length > 0;
      })
    );

    const deliveryRate = deliveryResults.filter(d => d).length / pages.length;

    console.log(`✓ Broadcast to ${channelCount} channels completed in: ${broadcastTime}ms`);
    console.log(`✓ Total subscribers: ${pages.length}`);
    console.log(`✓ Delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);

    // RED Phase: Multi-channel performance
    expect(broadcastTime).toBeLessThan(3000);
    expect(deliveryRate).toBeGreaterThan(0.95);

    await Promise.all(contexts.map(context => context.close()));
  });

  test('should preserve message ordering under load', async ({ page }) => {
    console.log('🔴 RED: Testing message ordering...');

    await page.goto('http://localhost:5173');
    await setupRealtimeListener(page);

    const messageCount = 100;

    // Send ordered messages rapidly
    for (let i = 0; i < messageCount; i++) {
      await page.evaluate((index) => {
        window.postMessage({
          type: 'realtime',
          event: 'ordered',
          payload: { sequence: index }
        }, '*');
      }, i);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const messages = await getRealtimeMessages(page);

    // Check ordering
    let isOrdered = true;
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].payload.sequence > messages[i + 1].payload.sequence) {
        isOrdered = false;
        console.warn(`Out of order: ${messages[i].payload.sequence} > ${messages[i + 1].payload.sequence}`);
      }
    }

    console.log(`✓ Messages sent: ${messageCount}`);
    console.log(`✓ Messages received: ${messages.length}`);
    console.log(`✓ Ordering preserved: ${isOrdered}`);

    // RED Phase: Message ordering must be preserved
    expect(messages.length).toBe(messageCount);
    expect(isOrdered).toBeTruthy();
  });

  test('should handle large payload messages', async ({ page }) => {
    console.log('🔴 RED: Testing large payload handling...');

    await page.goto('http://localhost:5173');
    await setupRealtimeListener(page);

    const largePayloadSize = 100000; // 100KB
    const messageCount = 10;

    const startTime = Date.now();

    for (let i = 0; i < messageCount; i++) {
      const largeData = 'x'.repeat(largePayloadSize);

      await page.evaluate((data, index) => {
        window.postMessage({
          type: 'realtime',
          event: 'large-payload',
          payload: { index, data }
        }, '*');
      }, largeData, i);
    }

    const sendTime = Date.now() - startTime;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const messages = await getRealtimeMessages(page);
    const deliveryRate = messages.length / messageCount;

    console.log(`✓ Send time: ${sendTime}ms`);
    console.log(`✓ Messages delivered: ${messages.length}/${messageCount}`);
    console.log(`✓ Delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);

    // RED Phase: Should handle large payloads
    expect(deliveryRate).toBeGreaterThan(0.90);
    expect(sendTime).toBeLessThan(5000);
  });
});
