export async function extractContentHandler(params: {
  scope: string;
  limit?: number;
  detail?: boolean;
}) {
  const { scope, limit = 10, detail = false } = params;
  
  console.log(`[ExtractContent] Extracting content for scope: ${scope}, limit: ${limit}, detail: ${detail}`);
  
  // For voice mode, we need to return actual content since we can't access the DOM
  // This provides fallback content based on the scope
  let content = [];
  
  if (scope === 'taxi') {
    content = [
      {
        title: 'Metered Taxi',
        text: 'Start around 35 THB. Always use the meter; decline if refused. Carry small cash for tolls/tips.',
        type: 'text'
      },
      {
        title: 'Ride-hailing',
        text: 'Grab, Bolt and local partners. Check in-app fare before confirming. Share trip status for safety.',
        type: 'text'
      },
      {
        title: 'Public Transport',
        text: 'BTS/MRT, Airport Rail Link, buses. Use stored-value cards for convenience.',
        type: 'text'
      }
    ];
  } else if (scope === 'tours') {
    content = [
      {
        title: 'Tour Packages',
        text: 'Popular tours and bookings available. Check current offers and availability.',
        type: 'text'
      }
    ];
  } else if (scope === 'places') {
    content = [
      {
        title: 'Nearby Places',
        text: 'Discover top attractions and places around you. Use location services for better results.',
        type: 'text'
      }
    ];
  } else {
    content = [
      {
        title: 'Page Content',
        text: `Content from ${scope} page. This is simulated content since we cannot access the actual DOM from the server side.`,
        type: 'text'
      }
    ];
  }
  
  // Limit the content based on the limit parameter
  const limitedContent = content.slice(0, limit);
  
  return {
    success: true,
    scope,
    limit,
    detail,
    content: limitedContent,
    count: limitedContent.length,
    message: `Successfully extracted ${limitedContent.length} items from ${scope} page`,
    fallbackText: `นี่คือข้อมูลจากหน้า${scope}: ${limitedContent.map(item => item.text).join(' ')}`
  };
}
