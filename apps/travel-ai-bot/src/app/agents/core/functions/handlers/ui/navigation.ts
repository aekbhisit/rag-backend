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
    // Direct URL navigation for travel pages
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      params.delete('content');
      const query = params.toString();
      const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${uri}${url.hash || ''}`;
      
      console.log('[UI] navigate: updating URL to', next);
      window.history.pushState({}, '', next);
      
      // Dispatch a custom event to notify the travel page component
      window.dispatchEvent(new CustomEvent('navigate', { detail: { uri } }));
      
      return {
        success: true,
        navigated: uri,
        message: `Navigated to ${uri}`,
        fallbackText: `ฉันได้พาคุณไปที่หน้า${uri.replace('/travel/', '')}แล้วค่ะ คุณสามารถดูรายละเอียดเพิ่มเติมได้ที่นี่ค่ะ!`,
        url: next
      };
    } else {
      // Server-side fallback - try bot action framework
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
        fallbackText: `ฉันได้พาคุณไปที่หน้า${uri.replace('/travel/', '')}แล้วค่ะ คุณสามารถดูรายละเอียดเพิ่มเติมได้ที่นี่ค่ะ!`,
        botActionResult: result
      };
    }
  } catch (error) {
    console.error('[UI] navigate error:', error);
    return {
      success: false,
      error: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}; 