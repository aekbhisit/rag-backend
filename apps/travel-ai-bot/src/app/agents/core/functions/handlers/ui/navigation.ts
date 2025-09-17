/**
 * UI Handler: Navigation
 * Actions that work with bot action framework for navigation
 */

export const navigateToMainHandler = async (args: any) => {
  console.log('[UI] navigateToMain called:', args);
  
  const { resetState, welcomeMessage } = args;
  
  // Reset to main view
  return {
    success: true,
    action: 'navigate_to_main',
    resetState: resetState || false,
    welcomeMessage: welcomeMessage || 'Returned to main page',
    currentView: 'main'
  };
};

export const navigateToPreviousHandler = async (args: any) => {
  console.log('[UI] navigateToPrevious called:', args);
  
  const { steps } = args;
  
  return {
    success: true,
    action: 'navigate_back',
    steps: steps || 1,
    message: 'Navigated back to previous view'
  };
};

export const navigateHandler = async (args: any) => {
  console.log('[UI] navigate called:', args);
  
  const { uri } = args;
  
  if (!uri || typeof uri !== 'string') {
    console.log('[UI] navigate error: URI is required');
    return {
      success: false,
      error: 'URI is required for navigation'
    };
  }
  
  try {
    // Use bot action framework to navigate
    const { handleFunctionCall } = await import('@/botActionFramework');
    console.log('[UI] navigate: calling handleFunctionCall with navigatePage');
    const result = await handleFunctionCall({ 
      name: 'navigatePage', 
      arguments: JSON.stringify({ pageName: 'travel', path: uri }) 
    });
    
    console.log('[UI] navigate result:', result);
    
    return {
      success: true,
      navigated: uri,
      message: `Navigated to ${uri}`,
      botActionResult: result
    };
  } catch (error) {
    console.error('[UI] navigate error:', error);
    return {
      success: false,
      error: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}; 