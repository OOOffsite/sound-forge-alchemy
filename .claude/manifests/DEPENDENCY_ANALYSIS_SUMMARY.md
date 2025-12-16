# Sound Forge Alchemy - Dependency Analysis Report

**Analysis Date:** 2025-12-16  
**Project:** Sound Forge Alchemy  
**Total Dependencies Analyzed:** 53 frontend + 5 backend services

## Executive Summary

This analysis identified **significant opportunities** for dependency optimization:

- **32% reduction** in frontend dependencies (53 → 36)
- **~600-700 KB** estimated bundle size reduction
- **4 incorrect dependencies** in backend services (built-in Node.js modules)
- **70% potential disk space savings** in backend with workspace setup

## Frontend Analysis (53 dependencies)

### Unused Dependencies (17 packages - 32%)

#### Radix UI Components (10 unused)
1. `@radix-ui/react-accordion` - Component exists but never imported
2. `@radix-ui/react-alert-dialog` - Component exists but never imported
3. `@radix-ui/react-aspect-ratio` - Component exists but never imported
4. `@radix-ui/react-avatar` - Component exists but never imported
5. `@radix-ui/react-context-menu` - Component exists but never imported
6. `@radix-ui/react-hover-card` - Component exists but never imported
7. `@radix-ui/react-menubar` - Component exists but never imported
8. `@radix-ui/react-navigation-menu` - Component exists but never imported
9. `@radix-ui/react-radio-group` - Component exists but never imported
10. `@radix-ui/react-toggle-group` - Component exists but never imported

**Radix UI Audit:** 10 of 30 packages (33%) are unused

#### Other Unused Dependencies (7 packages)
11. `embla-carousel-react` (8.3.0) - Only in unused ui/carousel.tsx
12. `input-otp` (1.2.4) - Only in unused ui/input-otp.tsx
13. `react-day-picker` (8.10.1) - Only in unused ui/calendar.tsx
14. `react-draggable` (4.4.6) - No imports found
15. `vaul` (0.9.3) - Only in unused ui/drawer.tsx
16. `cmdk` (1.0.0) - Only in unused ui/command.tsx
17. `date-fns` (3.6.0) - No imports found

### Heavy Dependencies Analysis

| Package | Size | Usage | Recommendation |
|---------|------|-------|----------------|
| **axios** | 31.4 KB | Only in `src/lib/api.ts` | ✅ **REPLACE** with native fetch (0 KB) |
| **recharts** | 417 KB | Only in `ui/chart.tsx` | ⚠️ **CONSIDER** lightweight-charts (158 KB) or chart.js (204 KB) |
| **wavesurfer.js** | 89.2 KB | Core audio visualization | ✅ **KEEP** - Required functionality |
| **webmidi** | 52.8 KB | Core MIDI functionality | ✅ **KEEP** - Required functionality |

### Actually Used UI Components (17/30 Radix packages)
- ✅ `@radix-ui/react-collapsible` (InputPanel.tsx, PlaylistPanel.tsx)
- ✅ `@radix-ui/react-dialog`
- ✅ `@radix-ui/react-dropdown-menu`
- ✅ `@radix-ui/react-label`
- ✅ `@radix-ui/react-popover`
- ✅ `@radix-ui/react-progress`
- ✅ `@radix-ui/react-scroll-area`
- ✅ `@radix-ui/react-select`
- ✅ `@radix-ui/react-separator`
- ✅ `@radix-ui/react-slider`
- ✅ `@radix-ui/react-slot`
- ✅ `@radix-ui/react-switch`
- ✅ `@radix-ui/react-tabs`
- ✅ `@radix-ui/react-toast`
- ✅ `@radix-ui/react-toggle`
- ✅ `@radix-ui/react-tooltip`
- ✅ `@radix-ui/react-checkbox`

## Backend Analysis (5 services)

### Critical Issue: Built-in Node.js Modules in Dependencies

**Problem:** 4 services have `child_process` (1.0.2) in dependencies  
**Impact:** This is a **built-in Node.js module** and should NOT be in package.json  
**Services Affected:**
- ❌ backend/analysis/package.json
- ❌ backend/download/package.json
- ❌ backend/processing/package.json
- ❌ backend/spotify/package.json

**Evidence:** Services correctly use `require('child_process')` in code, but incorrectly list it as dependency.

### Duplicate Dependencies Across Services

All 5 services (analysis, download, processing, spotify, websocket) duplicate these dependencies:

1. **express** ^4.18.2 (5x)
2. **cors** ^2.8.5 (5x)
3. **dotenv** ^16.4.5 (5x)
4. **axios** ^1.6.7 (5x)
5. **ioredis** ^5.3.2 (5x)
6. **winston** ^3.12.0 (5x)
7. **uuid** ^9.0.1 (5x)
8. **joi** ^17.12.2 (4x - not in websocket)

### Consolidation Opportunities

#### Option 1: Shared Package.json
Create `backend/shared/package.json` with common dependencies:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "axios": "^1.6.7",
    "ioredis": "^5.3.2",
    "winston": "^3.12.0",
    "uuid": "^9.0.1",
    "joi": "^17.12.2"
  }
}
```

#### Option 2: npm Workspaces (Recommended)
Convert backend to monorepo structure:
```json
// backend/package.json
{
  "workspaces": [
    "services/*"
  ]
}
```

**Benefits:**
- Single `node_modules` at root
- Automatic deduplication
- ~70% disk space reduction
- Faster installs
- Easier dependency management

## Estimated Savings

### Bundle Size Reduction
- **Radix UI cleanup:** ~150-200 KB
- **axios replacement:** 31.4 KB  
- **Other unused packages:** ~300-400 KB
- **recharts optimization:** 213+ KB (if replaced)
- **Total Frontend:** ~600-700 KB (or 800-900 KB with recharts replacement)

### Dependency Count
- **Frontend:** 53 → 36 dependencies (-32%)
- **Backend:** Remove 4 incorrect `child_process` entries

### Disk Space (Backend)
- **Current:** ~5x duplication of node_modules
- **With workspaces:** ~70% reduction in total backend node_modules size

## Action Plan

### Immediate Actions (High Priority)

1. **Remove `child_process` from backend package.json files**
   ```bash
   # For each service: analysis, download, processing, spotify
   npm uninstall child_process
   ```

2. **Remove unused frontend dependencies**
   ```bash
   npm uninstall @radix-ui/react-accordion \
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
   ```

3. **Replace axios with native fetch**
   - Update `src/lib/api.ts` to use fetch API
   - Update error handling
   - Remove axios: `npm uninstall axios`

4. **Remove unused UI component files**
   ```bash
   rm src/components/ui/accordion.tsx
   rm src/components/ui/alert-dialog.tsx
   rm src/components/ui/aspect-ratio.tsx
   rm src/components/ui/avatar.tsx
   rm src/components/ui/context-menu.tsx
   rm src/components/ui/hover-card.tsx
   rm src/components/ui/menubar.tsx
   rm src/components/ui/navigation-menu.tsx
   rm src/components/ui/radio-group.tsx
   rm src/components/ui/toggle-group.tsx
   rm src/components/ui/carousel.tsx
   rm src/components/ui/input-otp.tsx
   rm src/components/ui/calendar.tsx
   rm src/components/ui/drawer.tsx
   rm src/components/ui/command.tsx
   ```

### Short-Term Actions

1. **Set up npm workspaces for backend**
   - Create root `backend/package.json`
   - Configure workspaces
   - Move shared dependencies to root
   - Test all services

2. **Evaluate recharts usage**
   - Determine if charts are actually needed
   - If yes, consider lightweight-charts or chart.js
   - If no, remove entirely

### Long-Term Improvements

1. **Implement automated dependency analysis**
   - Add `depcheck` or similar tool
   - Run in CI/CD pipeline
   - Prevent unused dependency additions

2. **Set bundle size budgets**
   - Use bundlesize or similar tool
   - Set maximum bundle size limits
   - Fail builds that exceed limits

3. **Regular dependency audits**
   - Quarterly review of dependencies
   - Update outdated packages
   - Remove unused packages

## Files Analyzed

### Frontend
- `/Users/jeremiah/Developer/sound-forge-alchemy/package.json`
- All TypeScript/JSX files in `src/`

### Backend Services
- `/Users/jeremiah/Developer/sound-forge-alchemy/backend/analysis/package.json`
- `/Users/jeremiah/Developer/sound-forge-alchemy/backend/download/package.json`
- `/Users/jeremiah/Developer/sound-forge-alchemy/backend/processing/package.json`
- `/Users/jeremiah/Developer/sound-forge-alchemy/backend/spotify/package.json`
- `/Users/jeremiah/Developer/sound-forge-alchemy/backend/websocket/package.json`

## Verification Methods

1. **Frontend unused deps:** Grepped for imports across entire `src/` directory
2. **Backend duplicates:** Manual comparison of all service package.json files
3. **Built-in modules:** Verified `child_process` is Node.js built-in, not npm package
4. **Bundle sizes:** Referenced bundlephobia.com for package sizes

---

**Next Steps:** Implement immediate actions, then proceed to short-term improvements.
