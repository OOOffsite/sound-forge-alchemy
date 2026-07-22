/**
 * Docker Compose Configuration Tests
 * TDD Phase 1: RED - Write Failing Tests First
 *
 * @author Claude Code (TDD Agent)
 * @version 1.0.0
 * @license MIT
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import * as yaml from 'yaml';

const COMPOSE_FILE = path.join(process.cwd(), 'docker-compose.yml');

interface Service {
  build?: any;
  image?: string;
  ports?: string[];
  environment?: any;
  networks?: string[];
  volumes?: any[];
  depends_on?: string[] | any;
  profiles?: string[];
  healthcheck?: any;
  deploy?: any;
}

interface ComposeConfig {
  services: Record<string, Service>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

function loadComposeFile(): ComposeConfig {
  const content = readFileSync(COMPOSE_FILE, 'utf-8');
  return yaml.parse(content) as ComposeConfig;
}

describe('Docker Compose Configuration - TDD Tests', () => {
  let config: ComposeConfig;

  beforeAll(() => {
    config = loadComposeFile();
  });

  describe('File Existence and Validity', () => {
    it('should have a docker-compose.yml file', () => {
      expect(existsSync(COMPOSE_FILE)).toBe(true);
    });

    it('should be valid YAML', () => {
      expect(() => loadComposeFile()).not.toThrow();
    });

    it('should have services defined', () => {
      expect(config.services).toBeDefined();
      expect(Object.keys(config.services).length).toBeGreaterThan(0);
    });
  });

  describe('Required Services', () => {
    const requiredServices = [
      'frontend',
      'api-gateway',
      'spotify-service',
      'download-service',
      'processing-service',
      'analysis-service',
      'websocket-service',
      'redis'
    ];

    requiredServices.forEach(serviceName => {
      it(`should define ${serviceName} service`, () => {
        expect(config.services[serviceName]).toBeDefined();
      });
    });

    it('should define all required backend services', () => {
      const backendServices = [
        'api-gateway',
        'spotify-service',
        'download-service',
        'processing-service',
        'analysis-service',
        'websocket-service'
      ];

      backendServices.forEach(service => {
        expect(config.services[service]).toBeDefined();
      });
    });
  });

  describe('Service Configuration', () => {
    describe('Frontend Service', () => {
      let frontend: Service;

      beforeAll(() => {
        frontend = config.services.frontend;
      });

      it('should have build configuration', () => {
        expect(frontend.build).toBeDefined();
        expect(frontend.build.context).toBe('.');
        expect(frontend.build.dockerfile).toBe('Dockerfile');
      });

      it('should map port 8001', () => {
        expect(frontend.ports).toBeDefined();
        const hasPort = frontend.ports?.some(p => p.includes('8001'));
        expect(hasPort).toBe(true);
      });

      it('should set NODE_ENV environment variable', () => {
        expect(frontend.environment).toBeDefined();
        const hasNodeEnv = Array.isArray(frontend.environment)
          ? frontend.environment.some((e: string) => e.includes('NODE_ENV'))
          : frontend.environment.NODE_ENV !== undefined;
        expect(hasNodeEnv).toBe(true);
      });

      it('should connect to external and internal networks', () => {
        expect(frontend.networks).toBeDefined();
        expect(frontend.networks).toContain('external');
        expect(frontend.networks).toContain('internal');
      });

      it('should depend on api-gateway', () => {
        expect(frontend.depends_on).toBeDefined();
        const deps = Array.isArray(frontend.depends_on)
          ? frontend.depends_on
          : Object.keys(frontend.depends_on || {});
        expect(deps).toContain('api-gateway');
      });

      it('should have dev and prod profiles', () => {
        expect(frontend.profiles).toBeDefined();
        expect(frontend.profiles).toContain('dev');
        expect(frontend.profiles).toContain('prod');
      });
    });

    describe('API Gateway Service', () => {
      let apiGateway: Service;

      beforeAll(() => {
        apiGateway = config.services['api-gateway'];
      });

      it('should have build configuration', () => {
        expect(apiGateway.build).toBeDefined();
        expect(apiGateway.build.context).toContain('api-gateway');
      });

      it('should map port 3000', () => {
        expect(apiGateway.ports).toBeDefined();
        const hasPort = apiGateway.ports?.some(p => p.includes('3000'));
        expect(hasPort).toBe(true);
      });

      it('should set required environment variables', () => {
        const env = apiGateway.environment;
        expect(env).toBeDefined();

        const envVars = Array.isArray(env) ? env : Object.keys(env);
        const hasRequired = [
          'NODE_ENV',
          'PORT',
          'SERVICE_NAME',
          'REDIS_URL'
        ].every(key =>
          envVars.some((e: string) => typeof e === 'string' ? e.includes(key) : e === key)
        );

        expect(hasRequired).toBe(true);
      });

      it('should connect to external and internal networks', () => {
        expect(apiGateway.networks).toContain('external');
        expect(apiGateway.networks).toContain('internal');
      });

      it('should depend on backend services', () => {
        const deps = Array.isArray(apiGateway.depends_on)
          ? apiGateway.depends_on
          : Object.keys(apiGateway.depends_on || {});

        expect(deps).toContain('redis');
        expect(deps).toContain('spotify-service');
        expect(deps).toContain('download-service');
        expect(deps).toContain('processing-service');
      });

      it('should have health check', () => {
        expect(apiGateway.healthcheck).toBeDefined();
        expect(apiGateway.healthcheck.test).toBeDefined();
      });

      it('should have resource limits', () => {
        expect(apiGateway.deploy?.resources?.limits).toBeDefined();
      });
    });

    describe('Backend Services', () => {
      const backendServices = [
        { name: 'spotify-service', port: '3001', context: 'spotify' },
        { name: 'download-service', port: '3002', context: 'download' },
        { name: 'processing-service', port: '3003', context: 'processing' },
        { name: 'analysis-service', port: '3004', context: 'analysis' },
        { name: 'websocket-service', port: '3006', context: 'websocket' }
      ];

      backendServices.forEach(({ name, port, context }) => {
        describe(name, () => {
          let service: Service;

          beforeAll(() => {
            service = config.services[name];
          });

          it('should have build configuration', () => {
            expect(service.build).toBeDefined();
            expect(service.build.context).toContain(context);
          });

          it(`should map port ${port}`, () => {
            const hasPort = service.ports?.some(p => p.includes(port));
            expect(hasPort).toBe(true);
          });

          it('should set NODE_ENV', () => {
            const env = service.environment;
            const envVars = Array.isArray(env) ? env : Object.keys(env);
            const hasNodeEnv = envVars.some((e: string) =>
              typeof e === 'string' ? e.includes('NODE_ENV') : e === 'NODE_ENV'
            );
            expect(hasNodeEnv).toBe(true);
          });

          it('should connect to internal network', () => {
            expect(service.networks).toContain('internal');
          });

          it('should depend on redis', () => {
            const deps = Array.isArray(service.depends_on)
              ? service.depends_on
              : Object.keys(service.depends_on || {});
            expect(deps).toContain('redis');
          });

          it('should have dev and prod profiles', () => {
            expect(service.profiles).toContain('dev');
            expect(service.profiles).toContain('prod');
          });
        });
      });
    });

    describe('Redis Service', () => {
      let redis: Service;

      beforeAll(() => {
        redis = config.services.redis;
      });

      it('should use official Redis image', () => {
        expect(redis.image).toBeDefined();
        expect(redis.image).toContain('redis');
        expect(redis.image).toContain('alpine');
      });

      it('should map port 6379', () => {
        const hasPort = redis.ports?.some(p => p.includes('6379'));
        expect(hasPort).toBe(true);
      });

      it('should connect to internal network', () => {
        expect(redis.networks).toContain('internal');
      });

      it('should have health check', () => {
        expect(redis.healthcheck).toBeDefined();
        expect(redis.healthcheck.test).toBeDefined();
      });

      it('should have persistent volume', () => {
        expect(redis.volumes).toBeDefined();
        const hasDataVolume = redis.volumes?.some(v =>
          typeof v === 'string' ? v.includes('redis_data') : false
        );
        expect(hasDataVolume).toBe(true);
      });

      it('should have dev and prod profiles', () => {
        expect(redis.profiles).toContain('dev');
        expect(redis.profiles).toContain('prod');
      });
    });
  });

  describe('Networks', () => {
    it('should define external network', () => {
      expect(config.networks).toBeDefined();
      expect(config.networks?.external).toBeDefined();
    });

    it('should define internal network', () => {
      expect(config.networks?.internal).toBeDefined();
    });

    it('should use bridge driver for networks', () => {
      expect(config.networks?.external?.driver).toBe('bridge');
      expect(config.networks?.internal?.driver).toBe('bridge');
    });

    it('should name networks appropriately', () => {
      expect(config.networks?.external?.name).toContain('sound-forge');
      expect(config.networks?.internal?.name).toContain('sound-forge');
    });
  });

  describe('Volumes', () => {
    const requiredVolumes = [
      'shared_audio',
      'shared_cache',
      'shared_tmp',
      'shared_logs',
      'redis_data'
    ];

    requiredVolumes.forEach(volumeName => {
      it(`should define ${volumeName} volume`, () => {
        expect(config.volumes).toBeDefined();
        expect(config.volumes?.[volumeName]).toBeDefined();
      });
    });

    it('should use local driver for volumes', () => {
      Object.values(config.volumes || {}).forEach(volume => {
        expect(volume.driver).toBe('local');
      });
    });

    it('should name volumes with sound-forge prefix', () => {
      Object.values(config.volumes || {}).forEach(volume => {
        expect(volume.name).toContain('sound-forge');
      });
    });
  });

  describe('Environment Variables', () => {
    it('should use environment variable interpolation', () => {
      const content = readFileSync(COMPOSE_FILE, 'utf-8');

      expect(content).toContain('${NODE_ENV');
      expect(content).toContain('${SUPABASE_URL}');
    });

    it('should provide default values for critical variables', () => {
      const content = readFileSync(COMPOSE_FILE, 'utf-8');

      expect(content).toContain('${NODE_ENV:-development}');
    });
  });

  describe('Profiles', () => {
    it('should use profiles for environment separation', () => {
      const services = Object.values(config.services);
      const hasProfiles = services.every(s => s.profiles && s.profiles.length > 0);

      expect(hasProfiles).toBe(true);
    });

    it('should have dev profile for all services', () => {
      Object.values(config.services).forEach(service => {
        expect(service.profiles).toContain('dev');
      });
    });

    it('should have prod profile for all services', () => {
      Object.values(config.services).forEach(service => {
        expect(service.profiles).toContain('prod');
      });
    });
  });

  describe('Resource Limits', () => {
    const productionServices = [
      'frontend',
      'api-gateway',
      'spotify-service',
      'download-service',
      'processing-service',
      'analysis-service',
      'websocket-service',
      'redis'
    ];

    productionServices.forEach(serviceName => {
      it(`should define resource limits for ${serviceName}`, () => {
        const service = config.services[serviceName];
        expect(service.deploy?.resources?.limits).toBeDefined();
      });
    });

    it('should use environment variables for resource limits', () => {
      const content = readFileSync(COMPOSE_FILE, 'utf-8');

      expect(content).toContain('CPU_LIMIT');
      expect(content).toContain('MEMORY_LIMIT');
    });
  });

  describe('Volume Mounts', () => {
    it('should mount shared volumes for data services', () => {
      const servicesWithSharedData = [
        'api-gateway',
        'download-service',
        'processing-service',
        'analysis-service'
      ];

      servicesWithSharedData.forEach(serviceName => {
        const service = config.services[serviceName];
        const hasSharedAudio = service.volumes?.some(v =>
          typeof v === 'string' ? v.includes('shared_audio') : false
        );
        expect(hasSharedAudio).toBe(true);
      });
    });

    it('should mount logs volume for all backend services', () => {
      const backendServices = [
        'api-gateway',
        'spotify-service',
        'download-service',
        'processing-service',
        'analysis-service',
        'websocket-service'
      ];

      backendServices.forEach(serviceName => {
        const service = config.services[serviceName];
        const hasLogs = service.volumes?.some(v =>
          typeof v === 'string' ? v.includes('shared_logs') : false
        );
        expect(hasLogs).toBe(true);
      });
    });

    it('should mount config as read-only', () => {
      const backendServices = [
        'api-gateway',
        'spotify-service',
        'download-service',
        'processing-service',
        'analysis-service',
        'websocket-service'
      ];

      backendServices.forEach(serviceName => {
        const service = config.services[serviceName];
        const hasReadOnlyConfig = service.volumes?.some(v =>
          typeof v === 'string' ? v.includes('config:ro') : false
        );
        expect(hasReadOnlyConfig).toBe(true);
      });
    });
  });

  describe('Service Orchestration', () => {
    it('should define proper service dependencies', () => {
      const apiGateway = config.services['api-gateway'];
      const deps = Array.isArray(apiGateway.depends_on)
        ? apiGateway.depends_on
        : Object.keys(apiGateway.depends_on || {});

      expect(deps.length).toBeGreaterThan(3);
    });

    it('should ensure redis starts before backend services', () => {
      const backendServices = [
        'api-gateway',
        'spotify-service',
        'download-service',
        'processing-service',
        'analysis-service',
        'websocket-service'
      ];

      backendServices.forEach(serviceName => {
        const service = config.services[serviceName];
        const deps = Array.isArray(service.depends_on)
          ? service.depends_on
          : Object.keys(service.depends_on || {});
        expect(deps).toContain('redis');
      });
    });

    it('should ensure frontend depends on api-gateway', () => {
      const frontend = config.services.frontend;
      const deps = Array.isArray(frontend.depends_on)
        ? frontend.depends_on
        : Object.keys(frontend.depends_on || {});
      expect(deps).toContain('api-gateway');
    });
  });
});
