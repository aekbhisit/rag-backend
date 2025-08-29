/**
 * Resort Handler: Detail Viewing
 * Implementation for viewing detailed resort information
 */
import { ActionType } from '@/botActionFramework';
import { getArticleById } from '../../../config/functions';

export interface ViewResortDetailArgs {
  resortId: string;
}

export const viewResortDetailHandler = async (
  args: ViewResortDetailArgs,
  executeAction: (actionType: string, payload: any) => Promise<any>
) => {
  const { resortId } = args;
  
  if (!resortId) {
    return { error: 'Missing resort ID' };
  }
  
  // Validate that article exists
  const article = getArticleById(resortId);
  if (!article) {
    console.error(`[ThaiResort] Article not found: ${resortId}`);
    return { error: `Resort with ID ${resortId} not found` };
  }
  
  console.log(`[ThaiResort] Executing viewResortDetail for ${resortId}`);
  return await executeAction(ActionType.SELECT_ITEM, {
    itemType: 'article',
    itemId: resortId
  });
}; 