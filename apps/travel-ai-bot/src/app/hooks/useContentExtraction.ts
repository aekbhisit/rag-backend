"use client";

import { useCallback } from 'react';

export interface ExtractedContent {
  title: string;
  content: string;
  type: 'card' | 'list' | 'text';
  details?: Record<string, any>;
}

export function useContentExtraction() {
  const extractContent = useCallback((scope: string, limit: number = 10, detail: boolean = false): ExtractedContent[] => {
    console.log(`[ContentExtraction] Extracting content for scope: ${scope}, limit: ${limit}, detail: ${detail}`);
    
    const results: ExtractedContent[] = [];
    
    try {
      // Define selectors based on scope
      let selectors: string[] = [];
      
      switch (scope.toLowerCase()) {
        case 'taxi':
          selectors = [
            '.border.border-stone-200.rounded-lg.bg-white.p-4', // Taxi cards
            '[data-testid="taxi-card"]',
            '.taxi-card'
          ];
          break;
        case 'tours':
          selectors = [
            '.tour-card',
            '.border.rounded-lg.p-4',
            '[data-testid="tour-card"]'
          ];
          break;
        case 'places':
          selectors = [
            '.place-card',
            '.border.rounded-lg.p-4',
            '[data-testid="place-card"]'
          ];
          break;
        case 'help':
          selectors = [
            '.help-card',
            '.border.rounded-lg.p-4',
            '[data-testid="help-card"]'
          ];
          break;
        default:
          // Generic fallback - look for common card patterns
          selectors = [
            '.border.rounded-lg.p-4',
            '.card',
            '[class*="card"]'
          ];
      }
      
      // Try each selector until we find content
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length > 0) {
          console.log(`[ContentExtraction] Found ${elements.length} elements with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(elements.length, limit); i++) {
            const element = elements[i] as HTMLElement;
            
            // Extract title (look for common title patterns)
            const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6, .font-semibold, .font-bold, [class*="title"]') || 
                                element.querySelector('.text-stone-900.font-semibold') ||
                                element.querySelector('.font-medium');
            
            const title = titleElement?.textContent?.trim() || `Item ${i + 1}`;
            
            // Extract content (look for text content)
            const contentElement = element.querySelector('p, .text-sm, .text-stone-700, ul, ol') || element;
            let content = '';
            let hasList = false;
            
            if (contentElement) {
              // Handle lists
              const listNodes = contentElement.querySelectorAll('li');
              if (listNodes.length > 0) {
                hasList = true;
                content = Array.from(listNodes).map(li => li.textContent?.trim()).filter(Boolean).join('\n');
              } else {
                content = contentElement.textContent?.trim() || '';
              }
            }
            
            // Extract additional details if requested
            let details: Record<string, any> = {};
            if (detail) {
              details = {
                className: element.className,
                id: element.id,
                tagName: element.tagName,
                hasImage: !!element.querySelector('img'),
                hasButton: !!element.querySelector('button'),
                hasLink: !!element.querySelector('a')
              };
            }
            
            if (title && content) {
              results.push({
                title,
                content,
                type: hasList ? 'list' : 'card',
                details: detail ? details : undefined
              });
            }
          }
          
          // If we found content, break out of the selector loop
          if (results.length > 0) {
            break;
          }
        }
      }
      
      // If no specific cards found, try to extract from the main content area
      if (results.length === 0) {
        const mainContent = document.querySelector('main, .main-content, [role="main"]') || document.body;
        const textContent = mainContent.textContent?.trim();
        
        if (textContent && textContent.length > 50) {
          // Split content into chunks and create a summary
          const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
          const relevantSentences = sentences.slice(0, 3);
          
          results.push({
            title: 'Page Content',
            content: relevantSentences.join('. '),
            type: 'text',
            details: detail ? { totalLength: textContent.length, sentenceCount: sentences.length } : undefined
          });
        }
      }
      
      console.log(`[ContentExtraction] Extracted ${results.length} items`);
      return results;
      
    } catch (error) {
      console.error('[ContentExtraction] Error extracting content:', error);
      return [];
    }
  }, []);
  
  return { extractContent };
}
