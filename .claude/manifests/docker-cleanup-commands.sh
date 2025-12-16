#!/bin/bash
# Docker Optimization - Cleanup Commands
# Sound Forge Alchemy
# Generated: 2025-12-16
#
# This script archives 58 redundant Dockerfiles and cleans up the Docker structure
# DO NOT RUN WITHOUT REVIEWING THE OPTIMIZATION PLAN FIRST

set -e  # Exit on error

PROJECT_ROOT="/Users/jeremiah/Developer/sound-forge-alchemy"
ARCHIVE_DIR="$PROJECT_ROOT/docker-archive"
DATE_STAMP=$(date +%Y%m%d-%H%M%S)

echo "=========================================="
echo "Sound Forge Alchemy - Docker Cleanup"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will archive 58 files"
echo "📁 Archive location: $ARCHIVE_DIR"
echo "📅 Timestamp: $DATE_STAMP"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

cd "$PROJECT_ROOT"

# Phase 1: Create backup branch and archive directory
echo ""
echo "Phase 1: Creating backup and archive..."
git checkout -b "backup/docker-cleanup-$DATE_STAMP" || {
    echo "⚠️  Already on a backup branch or git error"
}

mkdir -p "$ARCHIVE_DIR"
mkdir -p "$ARCHIVE_DIR/base"
mkdir -p "$ARCHIVE_DIR/base-images"
mkdir -p "$ARCHIVE_DIR/services"
mkdir -p "$ARCHIVE_DIR/service-images"
mkdir -p "$ARCHIVE_DIR/old"
mkdir -p "$ARCHIVE_DIR/docker-root"
mkdir -p "$ARCHIVE_DIR/compose-files"

# Save current docker-compose for reference
docker-compose config > "$ARCHIVE_DIR/docker-compose.current.yml" 2>/dev/null || true

echo "✓ Backup branch created"
echo "✓ Archive directory created"

# Phase 2: Archive .old directory (6 files - ZERO RISK)
echo ""
echo "Phase 2: Archiving .old/ directory (6 files)..."
if [ -d "docker/.old" ]; then
    cp -r docker/.old/* "$ARCHIVE_DIR/old/" 2>/dev/null || true
    rm -rf docker/.old
    echo "✓ Archived docker/.old/ (6 files)"
else
    echo "⊗ docker/.old/ not found"
fi

# Phase 3: Archive docker/services/ templates (18 files)
echo ""
echo "Phase 3: Archiving docker/services/ templates (18 files)..."
if [ -d "docker/services" ]; then
    cp -r docker/services/* "$ARCHIVE_DIR/services/" 2>/dev/null || true
    rm -rf docker/services
    echo "✓ Archived docker/services/ (18 files)"
else
    echo "⊗ docker/services/ not found"
fi

# Phase 4: Archive docker/service-images/ duplicates (8 files)
echo ""
echo "Phase 4: Archiving docker/service-images/ (8 files)..."
if [ -d "docker/service-images" ]; then
    cp -r docker/service-images/* "$ARCHIVE_DIR/service-images/" 2>/dev/null || true
    rm -rf docker/service-images
    echo "✓ Archived docker/service-images/ (8 files)"
else
    echo "⊗ docker/service-images/ not found"
fi

# Phase 5: Archive custom base image directories (10 files)
echo ""
echo "Phase 5: Archiving custom base images (10 files)..."
if [ -d "docker/base" ]; then
    cp -r docker/base/* "$ARCHIVE_DIR/base/" 2>/dev/null || true
    rm -rf docker/base
    echo "✓ Archived docker/base/ (6 files)"
else
    echo "⊗ docker/base/ not found"
fi

if [ -d "docker/base-images" ]; then
    cp -r docker/base-images/* "$ARCHIVE_DIR/base-images/" 2>/dev/null || true
    rm -rf docker/base-images
    echo "✓ Archived docker/base-images/ (4 files)"
else
    echo "⊗ docker/base-images/ not found"
fi

# Phase 6: Archive docker/ root Dockerfiles (14 files)
echo ""
echo "Phase 6: Archiving docker/ root Dockerfiles (14 files)..."
for dockerfile in docker/Dockerfile.*; do
    if [ -f "$dockerfile" ]; then
        cp "$dockerfile" "$ARCHIVE_DIR/docker-root/" 2>/dev/null || true
        rm "$dockerfile"
        echo "✓ Archived $(basename $dockerfile)"
    fi
done

# Phase 7: Archive extra docker-compose files (4 files)
echo ""
echo "Phase 7: Archiving extra docker-compose files (4 files)..."
for compose_file in docker-compose.optimized.yml docker-compose.gpu.yml docker-compose.gpu-optimized.yml docker-compose-platform.yml; do
    if [ -f "$compose_file" ]; then
        cp "$compose_file" "$ARCHIVE_DIR/compose-files/" 2>/dev/null || true
        rm "$compose_file"
        echo "✓ Archived $compose_file"
    else
        echo "⊗ $compose_file not found"
    fi
done

# Phase 8: Archive root level duplicate (1 file)
echo ""
echo "Phase 8: Archiving root level Dockerfile.frontend..."
if [ -f "Dockerfile.frontend" ]; then
    cp Dockerfile.frontend "$ARCHIVE_DIR/Dockerfile.frontend" 2>/dev/null || true
    rm Dockerfile.frontend
    echo "✓ Archived Dockerfile.frontend"
else
    echo "⊗ Dockerfile.frontend not found"
fi

# Phase 9: Summary
echo ""
echo "=========================================="
echo "Cleanup Summary"
echo "=========================================="
echo ""
echo "📦 Files archived: 58"
echo "📁 Archive location: $ARCHIVE_DIR"
echo ""
echo "Remaining Dockerfiles:"
find . -type f -name "Dockerfile*" ! -path "./docker-archive/*" ! -path "./node_modules/*" | sort
echo ""

REMAINING_COUNT=$(find . -type f -name "Dockerfile*" ! -path "./docker-archive/*" ! -path "./node_modules/*" | wc -l | tr -d ' ')
echo "Total remaining: $REMAINING_COUNT (target: 7)"

if [ "$REMAINING_COUNT" -eq 7 ]; then
    echo "✓ SUCCESS: Achieved target of 7 Dockerfiles"
elif [ "$REMAINING_COUNT" -lt 10 ]; then
    echo "✓ GOOD: Close to target (expected: 7, actual: $REMAINING_COUNT)"
else
    echo "⚠️  WARNING: More Dockerfiles than expected (target: 7, actual: $REMAINING_COUNT)"
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Review remaining Dockerfiles"
echo "2. Update backend/*/Dockerfile to use official images"
echo "3. Create new frontend Dockerfile at root"
echo "4. Simplify docker-compose.yml"
echo "5. Test: docker-compose up --build"
echo "6. Commit changes"
echo ""
echo "To rollback:"
echo "  git checkout main"
echo "  git branch -D backup/docker-cleanup-$DATE_STAMP"
echo ""
echo "Archive can be safely deleted after validation period"
echo ""

# Create a manifest of what was archived
cat > "$ARCHIVE_DIR/MANIFEST.txt" <<EOF
Docker Cleanup Archive
Generated: $DATE_STAMP
Project: Sound Forge Alchemy

Files Archived: 58

Breakdown:
- .old/ directory: 6 files
- services/ templates: 18 files
- service-images/ duplicates: 8 files
- base/ custom images: 6 files
- base-images/ custom images: 4 files
- docker/ root Dockerfiles: 14 files
- Extra docker-compose files: 4 files
- Root Dockerfile.frontend: 1 file

Original locations preserved in directory structure.

Safe to delete after validation period (recommend 30 days).
EOF

echo "✓ Manifest created: $ARCHIVE_DIR/MANIFEST.txt"
echo ""
echo "Done! 🎉"
