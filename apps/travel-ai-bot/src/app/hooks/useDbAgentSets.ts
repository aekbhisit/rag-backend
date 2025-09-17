"use client";
import { useEffect, useState } from 'react';
import { AgentConfig } from '@/app/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useDbAgentSets() {
  const [agentSets, setAgentSets] = useState<Record<string, AgentConfig[]>>({});
  const [defaultSetKey, setDefaultSetKey] = useState<string>('default');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setError('');
        // Fetch agent sets server-side through Next route to avoid exposing prompts publicly
        const res = await fetch('/api/agent-sets', { cache: 'no-store' });
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


