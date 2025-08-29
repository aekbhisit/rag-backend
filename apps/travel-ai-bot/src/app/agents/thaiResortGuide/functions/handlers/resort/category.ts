/**
 * Resort Handler: Category Viewing
 * Implementation for viewing resort categories
 */
import { ActionType } from '@/botActionFramework';

export interface ViewResortCategoryArgs {
  categoryId: string;
}

export const viewResortCategoryHandler = async (
  args: ViewResortCategoryArgs,
  executeAction: (actionType: string, payload: any) => Promise<any>
) => {
  console.log(`[ThaiResort] viewResortCategory called with args:`, args);
  
  const { categoryId } = args;
  
  if (!categoryId) {
    console.error(`[ThaiResort] Missing category ID in args:`, args);
    return { 
      error: 'Missing category ID - please specify which category to view (beach, mountain, island, spa, cultural)',
      availableCategories: ['beach', 'mountain', 'island', 'spa', 'cultural']
    };
  }
  
  console.log(`[ThaiResort] Executing viewResortCategory for categoryId: ${categoryId}`);
  
  try {
    const result = await executeAction(ActionType.SELECT_ITEM, {
      itemType: 'category',
      itemId: categoryId
    });
    
    console.log(`[ThaiResort] viewResortCategory result:`, result);
    
    return {
      success: true,
      categoryId,
      message: `Successfully loaded ${categoryId} category`,
      ...result
    };
  } catch (error) {
    console.error(`[ThaiResort] Error executing viewResortCategory:`, error);
    return {
      error: `Failed to load category: ${error}`,
      categoryId
    };
  }
}; 