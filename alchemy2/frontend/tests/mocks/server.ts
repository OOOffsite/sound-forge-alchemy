/**
 * MSW Test Server
 *
 * @description Mock Service Worker server configuration for testing
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with default handlers
export const server = setupServer(...handlers);
