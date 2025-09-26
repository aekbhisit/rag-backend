/**
 * Core Handler: Intention Management
 * Essential bot intelligence for intention detection and adaptation
 */

export const intentionChangeHandler = async (args: any) => {
  console.log('[Core] intentionChange called:', args);
  
  const { currentIntention, communicationStyle, triggerReason } = args;
  
  // Log the intention change
  console.log(`[Core] User intention changed to: ${currentIntention}, style: ${communicationStyle}`);
  console.log(`[Core] Trigger reason: ${triggerReason}`);
  
  // Silent success: do not produce assistant-visible text; just acknowledge
  return {
    success: true,
    currentIntention,
    communicationStyle,
    triggerReason
  };
}; 