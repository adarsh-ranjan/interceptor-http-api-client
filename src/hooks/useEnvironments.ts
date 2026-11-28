import { useCallback, useMemo, useState } from 'react';
import { INITIAL_ENVIRONMENTS, STORAGE_KEYS } from '../constants/defaults';
import { Environment } from '../types';
import {
  getStorageItem,
  getStorageJson,
  removeStorageItem,
  setStorageItem,
  setStorageJson,
} from '../utils/storage';

export function useEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>(() =>
    getStorageJson<Environment[]>(STORAGE_KEYS.ENVIRONMENTS, INITIAL_ENVIRONMENTS)
  );

  const [activeEnvId, setActiveEnvId] = useState<string | null>(() => {
    return getStorageItem(STORAGE_KEYS.ACTIVE_ENV_ID) || 'env-dev';
  });

  const activeEnvironment = useMemo(
    () => environments.find((e) => e.id === activeEnvId),
    [environments, activeEnvId]
  );

  const updateEnvironments = useCallback((newEnvs: Environment[]) => {
    setEnvironments(newEnvs);
    setStorageJson(STORAGE_KEYS.ENVIRONMENTS, newEnvs);
  }, []);

  const selectActiveEnv = useCallback((id: string | null) => {
    setActiveEnvId(id);
    if (id) {
      setStorageItem(STORAGE_KEYS.ACTIVE_ENV_ID, id);
    } else {
      removeStorageItem(STORAGE_KEYS.ACTIVE_ENV_ID);
    }
  }, []);

  const setEnvVarFromScript = useCallback(
    (key: string, value: string) => {
      if (!activeEnvId) return;
      setEnvironments((prevEnvs) => {
        const updated = prevEnvs.map((env) => {
          if (env.id !== activeEnvId) return env;
          const varIndex = env.variables.findIndex((v) => v.key === key);
          const newVars = [...env.variables];
          if (varIndex >= 0) {
            newVars[varIndex] = { ...newVars[varIndex], value, enabled: true };
          } else {
            newVars.push({
              id: `var-${Date.now()}`,
              key,
              value,
              enabled: true,
            });
          }
          return { ...env, variables: newVars };
        });
        setStorageJson(STORAGE_KEYS.ENVIRONMENTS, updated);
        return updated;
      });
    },
    [activeEnvId]
  );

  return {
    environments,
    activeEnvId,
    activeEnvironment,
    updateEnvironments,
    selectActiveEnv,
    setEnvVarFromScript,
  };
}
