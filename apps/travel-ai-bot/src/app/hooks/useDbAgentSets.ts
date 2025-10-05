"use client";
import { useEffect, useState } from 'react';
import { AgentConfig } from '@/app/types';
import { getApiUrl } from '@/app/lib/apiHelper';

export function useDbAgentSets() {
  const [agentSets, setAgentSets] = useState<Record<string, AgentConfig[]>>({});
  const [defaultSetKey, setDefaultSetKey] = useState<string>('default');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setError('');
        // Fetch agent sets from backend public API
        const res = await fetch(getApiUrl('/api/agent-sets'), { cache: 'no-store' });
        if (!res.ok) throw new Error(`load agent-sets: ${res.status}`);
        const data = await res.json();
        const set = (data?.agentSets || {}) as Record<string, AgentConfig[]>;
        // Agent sets loaded silently
        setAgentSets(set.default ? set : { default: [] });
        if (data?.defaultSetKey) setDefaultSetKey(data.defaultSetKey);
      } catch (e: any) {
        setError(e?.message || 'load failed');
      } finally { setLoading(false); }
    }
    load();
  }, []);

  return { agentSets, defaultSetKey, loading, error };
}


