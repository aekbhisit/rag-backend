'use client';

import AgentIntegratedChatApp from '../../components/agents/AgentIntegratedChatApp';

export default function AgentChatPage() {
  // FIXED: Remove Suspense entirely - use manual URL parsing instead of useSearchParams
  return <AgentIntegratedChatApp />;
} 