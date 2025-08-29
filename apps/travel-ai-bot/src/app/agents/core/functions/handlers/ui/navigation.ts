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