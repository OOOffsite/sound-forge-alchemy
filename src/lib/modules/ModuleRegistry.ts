import {
  AlchemyModule,
  ModuleDependency,
  ModuleType,
  ModuleRegistry,
} from "./ModuleTypes";
import { create } from "zustand";

interface ModuleRegistryState {
  modules: Record<string, AlchemyModule>;
  registerModule: (module: AlchemyModule) => void;
  unregisterModule: (moduleId: string) => void;
  getModule: (moduleId: string) => AlchemyModule | undefined;
  getAllModules: () => AlchemyModule[];
  getModulesByType: (type: ModuleType) => AlchemyModule[];
  getModulesByDependency: (dependency: ModuleDependency) => AlchemyModule[];
}

/**
 * Registry for all Alchemy modules using zustand store
 */
export const useModuleRegistry = create<ModuleRegistryState>((set, get) => ({
  modules: {},

  registerModule: (module: AlchemyModule) => {
    set((state) => ({
      modules: {
        ...state.modules,
        [module.id]: module,
      },
    }));
  },

  unregisterModule: (moduleId: string) => {
    set((state) => {
      const newModules = { ...state.modules };
      delete newModules[moduleId];
      return { modules: newModules };
    });
  },

  getModule: (moduleId: string) => {
    return get().modules[moduleId];
  },

  getAllModules: () => {
    return Object.values(get().modules);
  },

  getModulesByType: (type: ModuleType) => {
    return Object.values(get().modules).filter((m) => m.type === type);
  },

  getModulesByDependency: (dependency: ModuleDependency) => {
    return Object.values(get().modules).filter((m) =>
      m.dependencies.includes(dependency)
    );
  },
}));

/**
 * Utility to check if a module's dependencies are satisfied
 */
export function areDependenciesSatisfied(
  module: AlchemyModule,
  registry: ModuleRegistry
): boolean {
  const dependencies = module.dependencies || [];

  for (const dependency of dependencies) {
    const dependentModules = registry.getModulesByDependency(dependency);

    if (dependentModules.length === 0) {
      return false;
    }
  }

  return true;
}
