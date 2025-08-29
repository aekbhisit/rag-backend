'use client';

import AgentIntegratedChatApp from '../../components/AgentIntegratedChatApp';

export default function AgentChatPage() {
  // FIXED: Remove Suspense entirely - use manual URL parsing instead of useSearchParams
  return <AgentIntegratedChatApp />;
} 