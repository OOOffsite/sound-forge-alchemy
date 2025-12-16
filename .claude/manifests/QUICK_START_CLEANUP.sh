#!/bin/bash
# Sound Forge Alchemy - Dependency Cleanup Quick Start
# Generated: 2025-12-16

set -e

echo "=========================================="
echo "Sound Forge Alchemy Dependency Cleanup"
echo "=========================================="
echo ""

# 1. Frontend Cleanup
echo "Step 1: Removing unused frontend dependencies..."
cd /Users/jeremiah/Developer/sound-forge-alchemy

npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-context-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-radio-group \
  @radix-ui/react-toggle-group \
  embla-carousel-react \
  input-otp \
  react-day-picker \
  react-draggable \
  vaul \
  cmdk \
  date-fns

echo "✓ Removed 17 unused frontend dependencies"
echo ""

# 2. Remove unused UI component files
echo "Step 2: Removing unused UI component files..."
rm -f src/components/ui/accordion.tsx
rm -f src/components/ui/alert-dialog.tsx
rm -f src/components/ui/aspect-ratio.tsx
rm -f src/components/ui/avatar.tsx
rm -f src/components/ui/context-menu.tsx
rm -f src/components/ui/hover-card.tsx
rm -f src/components/ui/menubar.tsx
rm -f src/components/ui/navigation-menu.tsx
rm -f src/components/ui/radio-group.tsx
rm -f src/components/ui/toggle-group.tsx
rm -f src/components/ui/carousel.tsx
rm -f src/components/ui/input-otp.tsx
rm -f src/components/ui/calendar.tsx
rm -f src/components/ui/drawer.tsx
rm -f src/components/ui/command.tsx

echo "✓ Removed 15 unused UI component files"
echo ""

# 3. Backend cleanup - remove child_process from each service
echo "Step 3: Removing incorrect 'child_process' dependency from backend services..."

cd backend/analysis
npm uninstall child_process || echo "  (already removed from analysis)"

cd ../download
npm uninstall child_process || echo "  (already removed from download)"

cd ../processing
npm uninstall child_process || echo "  (already removed from processing)"

cd ../spotify
npm uninstall child_process || echo "  (already removed from spotify)"

cd ../..

echo "✓ Cleaned up backend service dependencies"
echo ""

# 4. Summary
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Review src/lib/api.ts and replace axios with native fetch"
echo "2. Test the application: npm run dev"
echo "3. Run tests: npm run test"
echo "4. Consider setting up npm workspaces for backend"
echo ""
echo "Estimated Savings:"
echo "  - 17 fewer dependencies (32% reduction)"
echo "  - ~600-700 KB bundle size reduction"
echo "  - Cleaner codebase"
echo ""
