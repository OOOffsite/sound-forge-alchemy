# Dependency Graph Analysis Agent

## Agent Type
`dependency-graph-analysis`

## Purpose
Use dependency-cruiser to create comprehensive dependency graphs and identify architectural issues.

## Tools
- dependency-cruiser (already installed)
- Existing config: `.dependency-cruiser.cjs`

## Analysis Tasks

### 1. Frontend Dependency Graph
```bash
depcruise src/ \
  --config .dependency-cruiser.cjs \
  --output-type json \
  > .claude/manifests/frontend-dependency-graph.json
```

### 2. Backend Dependency Graphs
For each service:
```bash
depcruise backend/{service}/src/ \
  --output-type json \
  > .claude/manifests/backend-{service}-graph.json
```

### 3. Circular Dependency Detection
```bash
depcruise src/ backend/ \
  --config .dependency-cruiser.cjs \
  --output-type err-long
```

### 4. Orphan Module Detection
Find modules not imported anywhere:
```bash
depcruise src/ \
  --include-only "^src" \
  --output-type json \
  | jq '.modules[] | select(.dependents | length == 0)'
```

### 5. Cross-Module Dependencies
Identify coupling between:
- Components ↔ Pages
- Components ↔ Lib
- Components ↔ Context
- Modules ↔ Everything

### 6. Visualization Generation
```bash
depcruise src/ \
  --config .dependency-cruiser.cjs \
  --output-type dot \
  > .claude/manifests/dependency-graph.dot

dot -Tsvg .claude/manifests/dependency-graph.dot \
  > .claude/manifests/dependency-graph.svg
```

## Checkpointing

### Checkpoint File
`.claude/checkpoints/dependency-graph.checkpoint.json`

### Checkpoint Data
```json
{
  "timestamp": "ISO-8601",
  "agentId": "dependency-graph-analysis",
  "status": "in_progress",
  "progress": 70,
  "graphsGenerated": ["frontend", "api-gateway"],
  "graphsRemaining": ["spotify", "download", "processing", "analysis", "websocket"],
  "findings": {
    "circularDependencies": [],
    "orphanModules": [],
    "highCoupling": [],
    "violatedRules": []
  }
}
```

## Output Files
- `.claude/manifests/frontend-dependency-graph.json`
- `.claude/manifests/backend-*-graph.json`
- `.claude/manifests/dependency-graph.dot`
- `.claude/manifests/dependency-graph.svg`
- `.claude/manifests/dependency-violations.json`

## Analysis Metrics
- **Instability**: Ratio of outgoing to total dependencies
- **Abstractness**: Ratio of abstract to concrete modules
- **Distance from main sequence**: Architectural health metric
- **Cyclomatic complexity**: Per-module complexity
- **Coupling factor**: Inter-module dependencies

## Success Criteria
- All dependency graphs generated
- Zero circular dependencies or documented exceptions
- Orphan modules identified
- Coupling metrics calculated
- Visualization created
