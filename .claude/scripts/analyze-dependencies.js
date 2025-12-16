#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the dependency graph
const graphPath = path.join(__dirname, '../manifests/frontend-dependency-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

const analysis = {
  totalModules: graph.modules ? graph.modules.length : 0,
  circularDependencies: [],
  orphanModules: [],
  highCoupling: [],
  moduleMetrics: {
    averageDependencies: 0,
    maxDependencies: 0,
    minDependencies: Infinity
  }
};

// Create dependency map
const dependencyMap = new Map();
const dependentMap = new Map();

graph.modules.forEach(module => {
  const moduleName = module.source;

  // Track dependencies (modules this one imports)
  const deps = module.dependencies || [];
  dependencyMap.set(moduleName, deps);

  // Track dependents (modules that import this one)
  deps.forEach(dep => {
    if (!dependentMap.has(dep.resolved)) {
      dependentMap.set(dep.resolved, []);
    }
    dependentMap.get(dep.resolved).push(moduleName);
  });
});

// Find orphan modules (no dependents, not entry points)
graph.modules.forEach(module => {
  const moduleName = module.source;
  const dependents = dependentMap.get(moduleName) || [];
  const dependencies = dependencyMap.get(moduleName) || [];

  // Orphan: no dependents and not a test file or entry point
  if (dependents.length === 0 &&
      !moduleName.includes('test') &&
      !moduleName.includes('spec') &&
      !moduleName.endsWith('main.tsx') &&
      !moduleName.endsWith('App.tsx') &&
      dependencies.length > 0) {
    analysis.orphanModules.push({
      module: moduleName,
      dependencies: dependencies.length
    });
  }

  // High coupling: >10 dependencies
  if (dependencies.length > 10) {
    analysis.highCoupling.push({
      module: moduleName,
      dependencyCount: dependencies.length,
      dependencies: dependencies.map(d => d.resolved)
    });
  }

  // Calculate metrics
  analysis.moduleMetrics.maxDependencies = Math.max(
    analysis.moduleMetrics.maxDependencies,
    dependencies.length
  );
  analysis.moduleMetrics.minDependencies = Math.min(
    analysis.moduleMetrics.minDependencies,
    dependencies.length
  );
});

// Calculate average
const totalDeps = graph.modules.reduce((sum, m) =>
  sum + (m.dependencies ? m.dependencies.length : 0), 0
);
analysis.moduleMetrics.averageDependencies =
  (totalDeps / analysis.totalModules).toFixed(2);

// Extract circular dependencies from graph violations
if (graph.summary && graph.summary.violations) {
  graph.summary.violations.forEach(violation => {
    if (violation.rule.name === 'no-circular') {
      analysis.circularDependencies.push({
        from: violation.from,
        to: violation.to,
        cycle: violation.cycle
      });
    }
  });
}

// Sort by severity
analysis.orphanModules.sort((a, b) => b.dependencies - a.dependencies);
analysis.highCoupling.sort((a, b) => b.dependencyCount - a.dependencyCount);

// Output results
console.log(JSON.stringify(analysis, null, 2));
