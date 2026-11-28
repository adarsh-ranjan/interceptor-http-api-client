import { useState, useMemo } from 'react';
import { Environment } from '../types';

export const INITIAL_ENVIRONMENTS: Environment[] = [
  {
    id: 'env-dev',
    name: 'Development',
    variables: [
      {
        id: 'var-1',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
      },
      {
        id: 'var-2',
        key: 'apiKey',
        value: 'dev_token_secret_9981',
        enabled: true,
      },
    ],
  },
  {
    id: 'env-prod',
    name: 'Production',
    variables: [
      {
        id: 'var-3',
        key: 'baseUrl',
        value: 'https://jsonplaceholder.typicode.com',
        enabled: true,
      },
      {
        id: 'var-4',
        key: 'apiKey',
        value: 'prod_token_live_4412',
        enabled: true,
      },
    ],
  },
];

export function useEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>(() => {
    try {
      const saved = localStorage.getItem('interceptor_environments');
      return saved ? JSON.parse(saved) : INITIAL_ENVIRONMENTS;
    } catch {
      return INITIAL_ENVIRONMENTS;
    }
  });

  const [activeEnvId, setActiveEnvId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('interceptor_active_env_id') || 'env-dev';
    } catch {
      return 'env-dev';
    }
  });

  const updateEnvironments = (newEnvs: Environment[]) => {
    setEnvironments(newEnvs);
    try {
      localStorage.setItem('interceptor_environments', JSON.stringify(newEnvs));
    } catch {
      // ignore
    }
  };

  const handleSetActiveEnv = (id: string | null) => {
    setActiveEnvId(id);
    try {
      if (id) {
        localStorage.setItem('interceptor_active_env_id', id);
      } else {
        localStorage.removeItem('interceptor_active_env_id');
      }
    } catch {
      // ignore
    }
  };

  const handleSetEnvVarFromScript = (key: string, value: string) => {
    if (!activeEnvId) return;
    setEnvironments((prevEnvs) => {
      const updated = prevEnvs.map((env) => {
        if (env.id === activeEnvId) {
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
        }
        return env;
      });
      try {
        localStorage.setItem('interceptor_environments', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const activeEnvironment = useMemo(
    () => environments.find((e) => e.id === activeEnvId),
    [environments, activeEnvId]
  );

  return {
    environments,
    activeEnvId,
    activeEnvironment,
    updateEnvironments,
    handleSetActiveEnv,
    handleSetEnvVarFromScript,
  };
}
