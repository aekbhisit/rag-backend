/**
 * Utility to extract token usage information from OpenAI API responses
 * This handles various formats as the API structure might change
 */

interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  audioDuration?: number; // Duration of audio in seconds for Whisper transcriptions
}

/**
 * Helper to recursively search for token-related properties and audio duration in an object
 */
function findTokenProperties(obj: any, path = ''): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {};
  
  let results: Record<string, any> = {};
  
  // Check each property
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const keyLower = key.toLowerCase();
    
    // If key contains 'token', save it
    if (keyLower.includes('token')) {
      results[currentPath] = value;
    }
    
    // If key suggests audio duration, save it
    if ((keyLower.includes('duration') || 
         keyLower.includes('audio_seconds') || 
         keyLower === 'seconds' || 
         keyLower === 'length') && 
        (typeof value === 'number' || typeof value === 'string')) {
      results[currentPath] = value;
    }
    
    // If the value is a key called usage, check that specifically
    if (key === 'usage' && typeof value === 'object') {
      results[`${currentPath}`] = value;
    }
    
    // If the value is usage_metadata, check that too
    if (key === 'usage_metadata' && typeof value === 'object') {
      results[`${currentPath}`] = value;
    }
    
    // Special check for transcription info
    if ((keyLower === 'transcription' || keyLower === 'transcription_info') && typeof value === 'object') {
      results[`${currentPath}`] = value;
    }
    
    // If value is an object or array, recursively search it
    if (value && typeof value === 'object') {
      const nestedResults = findTokenProperties(value, currentPath);
      results = { ...results, ...nestedResults };
    }
  }
  
  return results;
}

/**
 * Extract token usage from an OpenAI API response
 * This handles different possible structures where token usage might be found
 */
export function extractTokenUsage(responseMetadata: any): TokenUsage | undefined {
  if (!responseMetadata) return undefined;
  
  // Try to extract audio duration for Whisper responses
  let audioDuration: number | undefined = undefined;
  
  // Check for direct duration field (Whisper API might include this)
  if (typeof responseMetadata.duration === 'number') {
    audioDuration = responseMetadata.duration;
  } else if (typeof responseMetadata.audio_duration === 'number') {
    audioDuration = responseMetadata.audio_duration;
  } else if (responseMetadata.metadata && typeof responseMetadata.metadata.duration === 'number') {
    audioDuration = responseMetadata.metadata.duration;
  } else if (responseMetadata.audio && typeof responseMetadata.audio.duration === 'number') {
    audioDuration = responseMetadata.audio.duration;
  } else if (responseMetadata.audio_data && typeof responseMetadata.audio_data.duration === 'number') {
    audioDuration = responseMetadata.audio_data.duration;
  } else if (typeof responseMetadata.audio_seconds === 'number') {
    audioDuration = responseMetadata.audio_seconds;
  } else if (responseMetadata.transcription && typeof responseMetadata.transcription.duration === 'number') {
    audioDuration = responseMetadata.transcription.duration;
  }
  
  // Additional check for string values that could be parsed as numbers
  if (audioDuration === undefined) {
    if (typeof responseMetadata.duration === 'string' && !isNaN(parseFloat(responseMetadata.duration))) {
      audioDuration = parseFloat(responseMetadata.duration);
    } else if (typeof responseMetadata.audio_duration === 'string' && !isNaN(parseFloat(responseMetadata.audio_duration))) {
      audioDuration = parseFloat(responseMetadata.audio_duration);
    }
  }
  
  // Format 1: OpenAI standard API format
  if (responseMetadata.usage) {
    return {
      promptTokens: responseMetadata.usage.prompt_tokens,
      completionTokens: responseMetadata.usage.completion_tokens,
      totalTokens: responseMetadata.usage.total_tokens,
      audioDuration
    };
  }
  
  // Format 2: Realtime API format
  if (responseMetadata.usage_metadata) {
    return {
      promptTokens: responseMetadata.usage_metadata.prompt_tokens,
      completionTokens: responseMetadata.usage_metadata.completion_tokens,
      totalTokens: responseMetadata.usage_metadata.total_tokens,
      audioDuration
    };
  }
  
  // Format 3: Direct properties at metadata root
  if (responseMetadata.prompt_tokens && responseMetadata.completion_tokens) {
    return {
      promptTokens: responseMetadata.prompt_tokens,
      completionTokens: responseMetadata.completion_tokens,
      totalTokens: (responseMetadata.prompt_tokens + responseMetadata.completion_tokens),
      audioDuration
    };
  }
  
  // Format 4: Deep search for token-related properties
  const tokenProperties = findTokenProperties(responseMetadata);
  
  if (Object.keys(tokenProperties).length > 0) {
    // Check for audio duration in the token properties
    if (audioDuration === undefined) {
      for (const [path, value] of Object.entries(tokenProperties)) {
        const pathLower = path.toLowerCase();
        if (pathLower.includes('duration') && typeof value === 'number') {
          audioDuration = value;
          break;
        }
      }
    }
    
    // Check if we found a clear usage object
    for (const [, value] of Object.entries(tokenProperties)) {
      // Check for a usage object with the expected properties
      if (typeof value === 'object' && 
          'prompt_tokens' in value && 
          'completion_tokens' in value) {
        return {
          promptTokens: value.prompt_tokens,
          completionTokens: value.completion_tokens,
          totalTokens: value.total_tokens || (value.prompt_tokens + value.completion_tokens),
          audioDuration
        };
      }
    }
    
    // If no complete usage object, try to piece together from individual properties
    const found = {
      promptTokens: undefined as number | undefined,
      completionTokens: undefined as number | undefined,
      totalTokens: undefined as number | undefined,
      audioDuration
    };
    
    for (const [path, value] of Object.entries(tokenProperties)) {
      const pathLower = path.toLowerCase();
      
      if (pathLower.includes('prompt') && pathLower.includes('token') && typeof value === 'number') {
        found.promptTokens = value;
      }
      
      if ((pathLower.includes('completion') || pathLower.includes('complete')) && 
          pathLower.includes('token') && typeof value === 'number') {
        found.completionTokens = value;
      }
      
      if (pathLower.includes('total') && pathLower.includes('token') && typeof value === 'number') {
        found.totalTokens = value;
      }
    }
    
    // If we found any token information, return it
    if (found.promptTokens !== undefined || found.completionTokens !== undefined || found.totalTokens !== undefined || found.audioDuration !== undefined) {
      // Calculate total tokens if not directly available
      if (found.totalTokens === undefined && found.promptTokens !== undefined && found.completionTokens !== undefined) {
        found.totalTokens = found.promptTokens + found.completionTokens;
      }
      
      return found;
    }
  }
  
  // If we only have audio duration but no token usage, still return what we have
  if (audioDuration !== undefined) {
    return { audioDuration };
  }
  
  return undefined;
} 