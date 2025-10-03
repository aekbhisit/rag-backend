/**
 * Cleanup script for removing empty AI messages from localStorage
 * Run this in the browser console to clean up existing chat history
 */

function cleanupEmptyMessages() {
  console.log('🧹 Starting cleanup of empty AI messages from localStorage...');
  
  let cleanedCount = 0;
  let totalSessions = 0;
  
  // Get all localStorage keys that start with 'chat-history-'
  const chatHistoryKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('chat-history-')
  );
  
  console.log(`Found ${chatHistoryKeys.length} chat history sessions`);
  
  chatHistoryKeys.forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const messages = JSON.parse(stored);
        const originalCount = messages.length;
        
        // Filter out empty and deleted messages
        const cleanedMessages = messages.filter(message => {
          // Don't keep empty AI messages
          if (message.metadata?.source === 'ai' && !message.content?.trim()) {
            return false;
          }
          // Don't keep deleted messages
          if (message.metadata?.deleted) {
            return false;
          }
          // Don't keep streaming placeholders
          if (message.metadata?.isStreaming) {
            return false;
          }
          return true;
        });
        
        const removedCount = originalCount - cleanedMessages.length;
        if (removedCount > 0) {
          console.log(`📝 ${key}: Removed ${removedCount} empty/deleted messages (${originalCount} → ${cleanedMessages.length})`);
          localStorage.setItem(key, JSON.stringify(cleanedMessages));
          cleanedCount += removedCount;
        }
        
        totalSessions++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${key}:`, error);
    }
  });
  
  console.log(`✅ Cleanup complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Sessions processed: ${totalSessions}`);
  console.log(`   - Empty messages removed: ${cleanedCount}`);
  console.log(`   - Chat history cleaned and optimized`);
  
  return {
    sessionsProcessed: totalSessions,
    messagesRemoved: cleanedCount
  };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('🚀 Auto-running cleanup...');
  cleanupEmptyMessages();
} else {
  console.log('📋 Copy and paste this function into your browser console to clean up localStorage');
}
