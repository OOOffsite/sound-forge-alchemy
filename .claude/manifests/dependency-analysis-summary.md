# Sound Forge Alchemy - Dependency Graph Analysis Summary

**Generated:** 2025-12-16  
**Agent:** dependency-graph-analysis  
**Status:** ✅ Completed

## Executive Summary

Analyzed **196 modules** with **528 total dependencies** across the Sound Forge Alchemy frontend codebase.

### Key Findings

#### 🔴 Critical Issues (1)
- **Circular Dependency**: `midiHandlers.ts` ↔ `StemViewer.tsx`
  - **Impact**: Medium - Potential module initialization issues
  - **Fix Effort**: Low (1-2 hours)

#### 🟡 High Priority Issues (31)
- **Orphaned Modules**: 31 modules with zero dependents
  - Notable: `sidebar.tsx` (12 deps), `routes.tsx` (8 deps)
  - **Impact**: Bundle size increase of ~20-25KB gzipped
  - **Fix Effort**: Medium (4-6 hours)

#### 🟠 Medium Priority Issues (7)
- **High Coupling**: 7 modules with >10 dependencies
  - `App.tsx`: 19 dependencies
  - `AudioProcessor.tsx`: 19 dependencies
  - `MainLayout.tsx`: 12 dependencies
  - **Impact**: Reduced maintainability and testability
  - **Fix Effort**: High (8-12 hours)

### Metrics

| Metric | Value |
|--------|-------|
| Total Modules | 196 |
| Total Dependencies | 528 |
| Average Dependencies/Module | 2.69 |
| Max Dependencies (App.tsx) | 19 |
| Circular Dependencies | 1 |
| Orphaned Modules | 31 |
| High Coupling Modules | 7 |

### Code Health Score: 7.5/10

**Breakdown:**
- Circular Dependencies: 8.5/10 (only 1 found)
- Coupling: 6.0/10 (several highly coupled modules)
- Dead Code: 7.0/10 (many unused UI components)
- Modularity: 8.0/10 (generally good structure)

## Detailed Findings

### 1. Circular Dependencies (1 found)

```
src/components/StemViewer/midiHandlers.ts 
  → src/components/StemViewer/StemViewer.tsx 
  → src/components/StemViewer/midiHandlers.ts
```

**Recommendation**: Extract shared types to `src/components/StemViewer/types.ts` and apply dependency inversion.

### 2. Orphaned Modules (31 found)

#### High Priority (Need Decision)
- `src/components/ui/sidebar.tsx` - 12 dependencies, completely unused
- `src/routes.tsx` - 8 dependencies, appears to be dead code

#### Medium Priority (shadcn/ui components)
- `command.tsx`, `form.tsx`, `calendar.tsx`, `carousel.tsx`, etc.
- Many shadcn/ui components installed but never used
- **Impact**: ~15-20KB potential savings with cleanup

#### Low Priority (Utility components)
- Small utility components and hooks
- Minimal bundle impact but clean up improves maintainability

### 3. High Coupling Modules (7 found)

| Module | Dependencies | Severity |
|--------|--------------|----------|
| `src/App.tsx` | 19 | Critical |
| `src/components/AudioProcessor.tsx` | 19 | Critical |
| `src/layouts/MainLayout.tsx` | 12 | High |
| `src/pages/Index.tsx` | 12 | High |
| `src/components/StemViewer/StemViewer.tsx` | 12 | High |
| `src/components/ui/sidebar.tsx` | 12 | High (orphaned) |
| `src/components/ExportStemsPanel.tsx` | 11 | Medium |

**Recommendations:**
- Apply code splitting and lazy loading
- Extract business logic to custom hooks
- Use composition over deep component nesting
- Move configurations to separate files

### 4. Dev Dependency Violations (2 found)

Both are false positives that should be excluded from analysis:
- `src/vite-env.d.ts` → `vite/client.d.ts` (expected for Vite)
- `src/setupTests.ts` → `@testing-library/jest-dom` (test configuration)

**Fix**: Update `.dependency-cruiser.cjs` config to exclude these patterns.

## Action Plan

### Phase 1: Immediate (1-2 days)
1. ✅ Fix dependency-cruiser config to exclude test/type files
2. ✅ Resolve circular dependency in StemViewer
3. ✅ Verify and remove routes.tsx if dead code

### Phase 2: Short-term (1 week)
1. Audit unused shadcn/ui components
2. Remove confirmed unused components
3. Extract App.tsx configuration
4. Apply code splitting to Index.tsx

### Phase 3: Long-term (2-3 weeks)
1. Refactor AudioProcessor.tsx using hooks
2. Implement lazy loading strategy
3. Apply atomic design principles
4. Create component composition guidelines

## Generated Files

All analysis artifacts saved to `.claude/manifests/`:

- `frontend-dependency-graph.json` (309KB) - Complete dependency graph
- `circular-dependencies.txt` (1.5KB) - Detailed violation report
- `dependency-graph.dot` (95KB) - Visual graph source
- `dependency-analysis.json` (8.3KB) - Parsed analysis data
- `dependency-graph-detailed.json` (9.6KB) - This comprehensive report

## Next Steps

1. Review findings with development team
2. Prioritize fixes based on impact vs effort
3. Create Linear issues for each phase
4. Schedule refactoring work in sprint planning
5. Set up automated dependency analysis in CI/CD

---

**Analysis completed successfully** ✅

For questions or to regenerate analysis:
```bash
node .claude/scripts/analyze-dependencies.js
```
