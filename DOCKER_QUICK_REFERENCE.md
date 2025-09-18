# Docker Quick Reference

## New Commands (Simplified)

### Development
```bash
./docker-setup.sh up           # Start dev environment
./docker-setup.sh down         # Stop all services
./docker-setup.sh logs         # View all logs
./docker-setup.sh -s frontend logs  # View frontend logs
./docker-setup.sh restart      # Restart all services
```

### Production
```bash
./docker-setup.sh -p prod up        # Start production
./docker-setup.sh -p prod -g up     # Start production with GPU
./docker-setup.sh -p prod down      # Stop production
```

### Utilities
```bash
./docker-setup.sh status       # Check service status
./docker-setup.sh build        # Build all images
./docker-setup.sh clean        # Clean up everything
```

## Old vs New Comparison

| Task | Old Command | New Command |
|------|-------------|-------------|
| Start dev | `./docker-manager.sh -e dev -a up` | `./docker-setup.sh up` |
| Start prod | `./docker-manager.sh -e prod -a up` | `./docker-setup.sh -p prod up` |
| Enable GPU | `./docker-manager.sh -e prod -g -a up` | `./docker-setup.sh -p prod -g up` |
| View logs | `./docker-manager.sh -e dev -a logs -s redis` | `./docker-setup.sh -s redis logs` |
| Stop all | `./docker-manager.sh -e dev -a down` | `./docker-setup.sh down` |

## File Locations

| Component | Old Location | New Location |
|-----------|--------------|--------------|
| Main compose | Multiple files in `docker/compose/` | Single `docker-compose.yml` |
| Dockerfiles | Scattered in root, base-images, service-images | Consolidated in `docker/` |
| Management | `docker-manager.sh` (complex) | `docker-setup.sh` (simple) |
| Config | Multiple locations | `docker/config/` |

## Networks Simplified

| Old Networks (6) | New Networks (2) | Purpose |
|------------------|------------------|---------|
| frontend, api-gateway, websocket | **external** | Frontend ↔ API Gateway |
| service-mesh, data, monitoring | **internal** | Backend services |

## Environment Setup

1. Copy template: `cp .env.example .env`
2. Edit values: `nano .env`
3. Start services: `./docker-setup.sh up`

## Profiles

- `dev` - Development with hot reload
- `prod` - Production optimized  
- `build` - Build base images only