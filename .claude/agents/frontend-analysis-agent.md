# Frontend Analysis Agent

## Agent Type
`frontend-analysis`

## Stack Focus
- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.1
- ShadCN UI (30+ Radix packages)
- TanStack Query
- Zustand
- WaveSurfer.js
- WebMIDI

## Analysis Tasks

### 1. Component Analysis
- Count total components: `src/components/**/*.{tsx,jsx}`
- Identify unused components (no imports)
- Find duplicate/similar components
- Categorize: UI, Business Logic, Utilities

### 2. Dependency Cruiser Analysis
```bash
depcruise --config .dependency-cruiser.cjs src/ --output-type json
```
- Circular dependencies
- Orphaned modules
- Dependency depth analysis
- Module coupling metrics

### 3. Bundle Analysis
```bash
vite build --mode development
npx vite-bundle-visualizer
```
- Largest dependencies
- Code splitting opportunities
- Tree-shaking effectiveness

### 4. TypeScript Analysis
- Strict mode violations
- `any` type usage
- Missing type definitions
- Interface complexity

### 5. DRTW Opportunities
- Custom components replaceable with libraries
- Unused Radix UI packages
- Heavy dependencies with lighter alternatives
- Consolidation opportunities

## Checkpointing

### Checkpoint File
`.claude/checkpoints/frontend-analysis.checkpoint.json`

### Checkpoint Frequency
- After each analysis task completes
- Every 2 minutes during long operations

### Checkpoint Data
```json
{
  "timestamp": "ISO-8601",
  "agentId": "frontend-analysis",
  "status": "in_progress|completed|failed",
  "progress": 0-100,
  "completedTasks": ["task1", "task2"],
  "findings": {
    "componentCount": 116,
    "unusedComponents": [],
    "dependencies": {},
    "bundleSize": "X MB",
    "circularDependencies": []
  },
  "recommendations": [],
  "errors": []
}
```

## Output Files

### Primary Output
`.claude/manifests/frontend-analysis-detailed.json`

### Supporting Files
- `.claude/manifests/dependency-graph.json` (from depcruise)
- `.claude/manifests/bundle-analysis.json`
- `.claude/manifests/component-inventory.json`

## Success Criteria
- Dependency graph generated successfully
- All 116 components analyzed
- Bundle size calculated
- DRTW opportunities identified
- Checkpoint written successfully
