# Python Stack Analysis Agent

## Agent Type
`python-stack-analysis`

## Stack Focus
- Demucs (audio source separation)
- spotdl (Spotify downloader)
- librosa (audio analysis)
- essentia (audio features)
- Python 3.10+

## Analysis Tasks

### 1. Python Usage Audit
Find all Python invocations:
```bash
grep -r "python" backend/ --include="*.js"
grep -r "exec\|spawn" backend/ --include="*.js"
```

### 2. Dependency Analysis
For each service using Python:
- Identify Python packages required
- Check for requirements.txt or equivalent
- Verify Python version compatibility
- Identify missing dependencies

### 3. Integration Patterns
- How Node.js spawns Python processes
- Data serialization (JSON, files, stdio)
- Error handling and logging
- Process lifecycle management

### 4. Alternative Analysis (DRTW)
- Can Demucs be replaced? (No - core functionality)
- Can spotdl be replaced? (Yes - yt-dlp, client-side Spotify API)
- Can librosa/essentia be replaced? (Maybe - Web Audio API for some features)
- Can processing be optimized?

### 5. Docker/Deployment Analysis
- Python environment setup in Dockerfiles
- Model downloads and caching
- GPU vs CPU variants
- Performance bottlenecks

## Checkpointing

### Checkpoint File
`.claude/checkpoints/python-stack.checkpoint.json`

### Checkpoint Data
```json
{
  "timestamp": "ISO-8601",
  "agentId": "python-stack-analysis",
  "status": "in_progress",
  "progress": 40,
  "findings": {
    "pythonInvocations": [],
    "requiredPackages": {
      "demucs": "version",
      "spotdl": "version",
      "librosa": "version",
      "essentia": "version"
    },
    "integrationPatterns": [],
    "alternatives": [],
    "performanceIssues": []
  }
}
```

## Output Files
- `.claude/manifests/python-stack-detailed.json`
- `.claude/manifests/python-alternatives.json`
- `.claude/manifests/python-optimization.json`

## Success Criteria
- All Python usages identified
- Dependencies catalogued
- Alternatives evaluated
- Integration patterns documented
