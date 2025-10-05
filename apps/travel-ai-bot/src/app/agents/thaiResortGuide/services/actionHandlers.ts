import { ActionType } from '@/botActionFramework';
import { getArticleById } from '../config/functions';
import { searchKnowledge } from '@/app/data/knowledge/client';
import { createTransferBackHandler, TransferBackArgs } from '../../core/functions';
import { aiIntentionHandler, IntentionChangeRequest } from './aiIntentionHandler';

/**
 * Interface for viewResortCategory function arguments
 */
interface ViewResortCategoryArgs {
  categoryId: string;
}

/**
 * Interface for viewResortDetail function arguments
 */
interface ViewResortDetailArgs {
  articleId: string;
}

/**
 * Interface for knowledge search function arguments
 */
interface KnowledgeSearchArgs {
  query: string;
}

// Create the transfer back handler for Thai Resort Guide
const handleTransferBack = createTransferBackHandler('thaiResortGuide');

/**
 * Handle function calls for the Thai Resort Guide
 */
export async function handleThaiResortFunctionCall(
  functionCall: { name: string; arguments: string },
  executeAction: (actionType: string, payload: any) => Promise<any>
): Promise<any> {
  console.log(`[ThaiResort] Processing function: ${functionCall.name}`);
  
  const { name, arguments: argsString } = functionCall;
  let args;
  
  try {
    args = JSON.parse(argsString);
  } catch (e) {
    console.error('Failed to parse function arguments:', e);
    return { error: 'Invalid function arguments' };
  }
  
  switch (name) {
    case 'viewResortCategory':
      return handleViewResortCategory(args as ViewResortCategoryArgs, executeAction);
    
    case 'viewResortDetail':
      return handleViewResortDetail(args as ViewResortDetailArgs, executeAction);
    
    case 'navigateToMainPage':
      return handleNavigateToMainPage(executeAction);
    
    case 'navigateBack':
      return handleNavigateBack(executeAction);
      
    case 'knowledge':
      return handleKnowledgeSearch(args as KnowledgeSearchArgs);
      
    case 'transferBack':
      return handleTransferBack(args as TransferBackArgs);
    
    case 'intentionChange': {
      // Handle AI-detected intention change
      const request: IntentionChangeRequest = {
        intent: args.intent,
        style: args.style,
        reasoning: args.reasoning
      };
      
      const response = aiIntentionHandler.handleIntentionChange(request);
      
      console.log(`[ThaiResort] Intention change processed: ${request.intent}.${request.style}`);
      
      return {
        success: response.success,
        message: response.instructions,
        newInstructions: response.instructions,
        responseStyle: response.responseStyle,
        expectedFunctions: response.expectedFunctions,
        mayTransfer: response.mayTransfer,
        currentIntention: `resort.${request.intent}.${request.style}`
      };
    }
    
    default:
      return { error: `Unknown function: ${name}` };
  }
}

/**
 * Handle viewResortCategory function
 */
async function handleViewResortCategory(
  args: ViewResortCategoryArgs,
  executeAction: (actionType: string, payload: any) => Promise<any>
) {
  console.log(`[ThaiResort] viewResortCategory called with args:`, args);
  console.log(`[ThaiResort] ===== FUNCTION CALL DETAILS =====`);
  console.log(`[ThaiResort] Function: viewResortCategory`);
  console.log(`[ThaiResort] Input Arguments:`, JSON.stringify(args, null, 2));
  
  const { categoryId } = args;
  
  if (!categoryId) {
    console.error(`[ThaiResort] Missing category ID in args:`, args);
    const errorResult = { 
      error: 'Missing category ID - please specify which category to view (beach, mountain, island, spa, cultural)',
      availableCategories: ['beach', 'mountain', 'island', 'spa', 'cultural']
    };
    console.log(`[ThaiResort] ===== ERROR RESULT =====`);
    console.log(`[ThaiResort] Error Result:`, JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
  
  console.log(`[ThaiResort] Executing viewResortCategory for categoryId: ${categoryId}`);
  
  try {
    const result = await executeAction(ActionType.SELECT_ITEM, {
      itemType: 'category',
      itemId: categoryId
    });
    
    console.log(`[ThaiResort] ===== FUNCTION EXECUTION RESULT =====`);
    console.log(`[ThaiResort] executeAction result:`, JSON.stringify(result, null, 2));
    
    const finalResult = {
      success: true,
      categoryId,
      message: `Successfully loaded ${categoryId} category`,
      ...result
    };
    
    console.log(`[ThaiResort] ===== FINAL RESULT TO OPENAI =====`);
    console.log(`[ThaiResort] Final result being returned to OpenAI:`, JSON.stringify(finalResult, null, 2));
    console.log(`[ThaiResort] ===== END FUNCTION RESULT =====`);
    
    return finalResult;
  } catch (error) {
    console.error(`[ThaiResort] Error executing viewResortCategory:`, error);
    const errorResult = {
      error: `Failed to load category: ${error}`,
      categoryId
    };
    console.log(`[ThaiResort] ===== ERROR RESULT TO OPENAI =====`);
    console.log(`[ThaiResort] Error result being returned to OpenAI:`, JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
}

/**
 * Handle viewResortDetail function
 */
async function handleViewResortDetail(
  args: ViewResortDetailArgs,
  executeAction: (actionType: string, payload: any) => Promise<any>
) {
  const { articleId } = args;
  
  if (!articleId) {
    return { error: 'Missing article ID' };
  }
  
  // Validate that article exists
  const article = getArticleById(articleId);
  if (!article) {
    console.error(`[ThaiResort] Article not found: ${articleId}`);
    return { error: `Article with ID ${articleId} not found` };
  }
  
  console.log(`[ThaiResort] Executing viewResortDetail for ${articleId}`);
  return await executeAction(ActionType.SELECT_ITEM, {
    itemType: 'article',
    itemId: articleId
  });
}

/**
 * Handle navigateToMainPage function
 */
async function handleNavigateToMainPage(
  executeAction: (actionType: string, payload: any) => Promise<any>
) {
  console.log('[ThaiResort] Executing navigateToMainPage');
  return await executeAction(ActionType.NAVIGATE_PAGE, {
    pageName: 'home'
  });
}

/**
 * Handle navigateBack function
 */
async function handleNavigateBack(
  executeAction: (actionType: string, payload: any) => Promise<any>
) {
  console.log('[ThaiResort] Executing navigateBack');
  return await executeAction(ActionType.NAVIGATE_BACK, {});
}

/**
 * Handle knowledge search function
 */
async function handleKnowledgeSearch(args: KnowledgeSearchArgs) {
  const { query } = args;
  
  if (!query) {
    return { 
      error: 'Query is required for knowledge search',
      results: []
    };
  }
  
  try {
    console.log(`[ThaiResort] Searching knowledge base for: ${query}`);
    
    // Call the client-side search function
    const results = await searchKnowledge(query);
    
    // Format the results for the response
    const formattedResults = results.map(result => ({
      title: result.entry.title,
      content: result.entry.content,
      category: result.entry.category,
      tags: result.entry.tags,
      relevanceScore: result.score
    }));
    
    return {
      query,
      results: formattedResults,
      count: formattedResults.length
    };
  } catch (error) {
    console.error('[ThaiResort] Knowledge search error:', error);
    return {
      error: 'Failed to search knowledge base',
      query,
      results: []
    };
  }
} 