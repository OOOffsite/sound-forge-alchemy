# Sound Forge Alchemy - Dependency Removal Plan

## Executive Summary

After analyzing all 116 TSX/JSX files and 73 dependencies, we can safely remove:
- **47 unused component files** (87% of UI components)
- **22 unused Radix UI packages**
- **Associated heavy dependencies** (recharts, cmdk, etc.)

**Total Savings**: ~6-8 MB disk space, ~250-400 KB bundle reduction

---

## Phase 1: Remove Unused UI Components and Dependencies

### Step 1: Remove Unused Component Files

These files are NOT imported anywhere in the application:

```bash
# Remove unused UI components
rm src/components/ui/accordion.tsx
rm src/components/ui/alert-dialog.tsx
rm src/components/ui/alert.tsx
rm src/components/ui/aspect-ratio.tsx
rm src/components/ui/avatar.tsx
rm src/components/ui/badge.tsx
rm src/components/ui/breadcrumb.tsx
rm src/components/ui/calendar.tsx
rm src/components/ui/card.tsx
rm src/components/ui/carousel.tsx
rm src/components/ui/chart.tsx
rm src/components/ui/checkbox.tsx
rm src/components/ui/collapsible.tsx
rm src/components/ui/command.tsx
rm src/components/ui/context-menu.tsx
rm src/components/ui/drawer.tsx
rm src/components/ui/dropdown-menu.tsx
rm src/components/ui/form.tsx
rm src/components/ui/hover-card.tsx
rm src/components/ui/input-otp.tsx
rm src/components/ui/menubar.tsx
rm src/components/ui/navigation-menu.tsx
rm src/components/ui/pagination.tsx
rm src/components/ui/popover.tsx
rm src/components/ui/progress.tsx
rm src/components/ui/radio-group.tsx
rm src/components/ui/resizable.tsx
rm src/components/ui/scroll-area.tsx
rm src/components/ui/select.tsx
rm src/components/ui/separator.tsx
rm src/components/ui/sheet.tsx
rm src/components/ui/sidebar.tsx
rm src/components/ui/skeleton.tsx
rm src/components/ui/slider.tsx
rm src/components/ui/switch.tsx
rm src/components/ui/table.tsx
rm src/components/ui/tabs.tsx
rm src/components/ui/textarea.tsx
rm src/components/ui/toaster.tsx
rm src/components/ui/toggle-group.tsx
rm src/components/ui/tooltip.tsx

# Remove unused custom components
rm src/components/ui/DebugConsoleOverlay.tsx
rm src/components/ui/NotificationLog.tsx
rm src/components/ui/OverlayGrid.tsx
rm src/components/ui/SettingsDropdown.tsx
rm src/components/ui/StickyPlayer.tsx
rm src/components/ui/VolumeVisualizer.tsx
```

### Step 2: Remove Unused Radix UI Packages

These packages are ONLY used by the components being removed:

```bash
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip
```

**Savings**: 5.5 MB disk space

### Step 3: Remove Heavy Dependencies (Used Only by Removed Components)

```bash
npm uninstall \
  recharts \
  react-day-picker \
  date-fns \
  cmdk \
  embla-carousel-react \
  vaul \
  input-otp \
  react-hook-form \
  @hookform/resolvers
```

**Dependency Locations** (all in removed components):
- `recharts` → src/components/ui/chart.tsx ❌
- `react-day-picker` → src/components/ui/calendar.tsx ❌
- `cmdk` → src/components/ui/command.tsx ❌
- `embla-carousel-react` → src/components/ui/carousel.tsx ❌
- `vaul` → src/components/ui/drawer.tsx ❌
- `input-otp` → src/components/ui/input-otp.tsx ❌
- `react-hook-form` + `@hookform/resolvers` → src/components/ui/form.tsx ❌

**Savings**: ~200-300 KB bundle reduction

---

## Phase 2: Keep These (Actually Used)

### Components to Keep (7 files)
1. `src/components/ui/button.tsx` (5 imports)
2. `src/components/ui/dialog.tsx` (1 import)
3. `src/components/ui/input.tsx` (1 import)
4. `src/components/ui/label.tsx` (1 import)
5. `src/components/ui/sonner.tsx` (1 import)
6. `src/components/ui/toast.tsx` (1 import)
7. `src/components/ui/toggle.tsx` (1 import)

### Radix Packages to Keep (5 packages)
1. `@radix-ui/react-dialog`
2. `@radix-ui/react-label`
3. `@radix-ui/react-slot`
4. `@radix-ui/react-toast`
5. `@radix-ui/react-toggle`

### Core Dependencies to Keep
- `sonner` (toast notifications - actively used)
- `class-variance-authority` (button variants)
- `lucide-react` (icons)
- All other non-UI dependencies

---

## Execution Script

```bash
#!/bin/bash

set -e

echo "Sound Forge Alchemy - Dependency Cleanup"
echo "=========================================="
echo ""

# Step 1: Commit current state
echo "Step 1: Creating backup commit..."
git add .
git commit -m "chore: backup before dependency cleanup"

# Step 2: Remove unused component files
echo ""
echo "Step 2: Removing 47 unused component files..."
rm src/components/ui/accordion.tsx
rm src/components/ui/alert-dialog.tsx
rm src/components/ui/alert.tsx
rm src/components/ui/aspect-ratio.tsx
rm src/components/ui/avatar.tsx
rm src/components/ui/badge.tsx
rm src/components/ui/breadcrumb.tsx
rm src/components/ui/calendar.tsx
rm src/components/ui/card.tsx
rm src/components/ui/carousel.tsx
rm src/components/ui/chart.tsx
rm src/components/ui/checkbox.tsx
rm src/components/ui/collapsible.tsx
rm src/components/ui/command.tsx
rm src/components/ui/context-menu.tsx
rm src/components/ui/drawer.tsx
rm src/components/ui/dropdown-menu.tsx
rm src/components/ui/form.tsx
rm src/components/ui/hover-card.tsx
rm src/components/ui/input-otp.tsx
rm src/components/ui/menubar.tsx
rm src/components/ui/navigation-menu.tsx
rm src/components/ui/pagination.tsx
rm src/components/ui/popover.tsx
rm src/components/ui/progress.tsx
rm src/components/ui/radio-group.tsx
rm src/components/ui/resizable.tsx
rm src/components/ui/scroll-area.tsx
rm src/components/ui/select.tsx
rm src/components/ui/separator.tsx
rm src/components/ui/sheet.tsx
rm src/components/ui/sidebar.tsx
rm src/components/ui/skeleton.tsx
rm src/components/ui/slider.tsx
rm src/components/ui/switch.tsx
rm src/components/ui/table.tsx
rm src/components/ui/tabs.tsx
rm src/components/ui/textarea.tsx
rm src/components/ui/toaster.tsx
rm src/components/ui/toggle-group.tsx
rm src/components/ui/tooltip.tsx
rm src/components/ui/DebugConsoleOverlay.tsx
rm src/components/ui/NotificationLog.tsx
rm src/components/ui/OverlayGrid.tsx
rm src/components/ui/SettingsDropdown.tsx
rm src/components/ui/StickyPlayer.tsx
rm src/components/ui/VolumeVisualizer.tsx

echo "✓ Removed 47 component files"

# Step 3: Remove Radix packages
echo ""
echo "Step 3: Removing 22 unused Radix UI packages..."
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip

echo "✓ Removed 22 Radix packages"

# Step 4: Remove heavy dependencies
echo ""
echo "Step 4: Removing 9 heavy dependencies..."
npm uninstall \
  recharts \
  react-day-picker \
  date-fns \
  cmdk \
  embla-carousel-react \
  vaul \
  input-otp \
  react-hook-form \
  @hookform/resolvers

echo "✓ Removed 9 heavy dependencies"

# Step 5: Build to verify
echo ""
echo "Step 5: Building to verify no breakage..."
npm run build

echo ""
echo "✓ Build successful!"

# Step 6: Show savings
echo ""
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "Removed:"
echo "  - 47 component files"
echo "  - 22 Radix UI packages"
echo "  - 9 heavy dependencies"
echo ""
echo "Estimated Savings:"
echo "  - Disk: ~6-8 MB"
echo "  - Bundle: ~250-400 KB"
echo ""
echo "Next: Commit changes"
echo "  git add ."
echo "  git commit -m 'chore: remove unused components and dependencies'"
```

---

## Verification Steps

After running the cleanup:

1. **Build**: `npm run build` - Should complete successfully
2. **Test**: `npm test` - All tests should pass
3. **Dev**: `npm run dev` - App should run normally
4. **Bundle Size**: Check dist/ - Should be smaller

---

## Rollback Plan

If anything breaks:

```bash
git reset --hard HEAD~1
npm install
```

---

## Expected Results

### Before
- 116 TSX/JSX files
- 73 dependencies
- 1.0 MB bundle (970 KB JS)
- 7.3 MB Radix packages

### After
- 69 TSX/JSX files (-47)
- 42 dependencies (-31)
- ~600-700 KB bundle (-270-370 KB)
- ~2 MB Radix packages (-5.3 MB)

---

## Notes

- All removed components are genuinely unused (0 imports found)
- All removed dependencies are only imported by removed components
- This is a LOW RISK operation - all changes are easily reversible
- Build verification is included in cleanup script

---

**Last Updated**: 2025-12-16
**Agent**: Frontend Analysis Agent
