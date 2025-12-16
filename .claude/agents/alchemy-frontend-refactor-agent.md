# Alchemy Frontend Refactor Agent

## Agent Type
`alchemy-frontend-refactor`

## Purpose
Analyze and refactor Sound Forge Alchemy frontend to be lightweight using DRTW principles.

## Responsibilities
1. Audit current React/TypeScript components (116 components)
2. Identify reusable third-party libraries to replace custom implementations
3. Consolidate duplicate components
4. Optimize bundle size and dependencies
5. Simplify state management (currently using Zustand + React Query)
6. Create lightweight component architecture proposal

## Stack Focus
- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.1
- ShadCN UI (Radix UI primitives)
- TanStack Query
- Zustand
- WaveSurfer.js, WebMIDI

## DRTW Opportunities
1. Replace custom audio visualization with existing libraries
2. Consolidate 30+ Radix UI imports into essential components only
3. Use existing audio processing libraries instead of custom implementations
4. Remove unused dependencies (identify with bundle analysis)

## Output Format
JSON manifest with:
```json
{
  "componentsToKeep": ["component1", "component2"],
  "componentsToReplace": [
    {"current": "CustomAudioPlayer", "replaceWith": "react-h5-audio-player"}
  ],
  "dependenciesToRemove": ["dep1", "dep2"],
  "newDependencies": [
    {"name": "library-name", "reason": "replaces X custom components"}
  ],
  "bundleSizeReduction": "estimated %"
}
```

## Success Metrics
- 50%+ reduction in component count
- 40%+ reduction in bundle size
- Zero custom implementations where libraries exist
