/**
 * Thai Resort Guide Functions
 * Uses new Functions structure with schema/handler separation
 */
import { CATEGORIES, getArticlesByCategory, getCategoryName, ResortArticle } from '../data/resortData';

// Import from new functions structure
export { 
  thaiResortFunctions,
  getThaiResortSchemas,
  getThaiResortHandlers
} from '../functions';

// ===== HELPER FUNCTIONS =====
// Keep existing helper functions for compatibility

export const getThaiResortViewContext = (context: any) => {
  if (!context) return 'You are viewing the main Thai Resort Guide page.';
  
  const { currentView, currentCategory, currentArticle } = context;
  
  if (currentView === 'articleDetail' && currentArticle) {
    return `You are viewing details about a specific resort. You can navigate back to the list of resorts.`;
  }
  
  if (currentView === 'categoryArticles' && currentCategory) {
    const categoryName = getCategoryName(currentCategory);
    return `You are viewing the ${categoryName} category. You can select a specific resort to view details or navigate back to the main categories.`;
  }
  
  return 'You are viewing the main Thai Resort Guide categories page. You can select a category to explore.';
};

export const getAvailableArticles = (categoryId: string): ResortArticle[] => {
  return getArticlesByCategory(categoryId);
};

export const getArticleById = (articleId: string, categoryId?: string): ResortArticle | null => {
  if (!categoryId) {
    for (const catId of Object.values(CATEGORIES)) {
      const articles = getArticlesByCategory(catId);
      const article = articles.find(a => a.id === articleId);
      if (article) return article;
    }
    return null;
  }
  
  const articles = getArticlesByCategory(categoryId);
  return articles.find(a => a.id === articleId) || null;
};

// ===== EXPORT STANDARD FUNCTION NAMES =====
export const THAI_RESORT_FUNCTION_NAMES = {
  // Core functions
  INTENTION_CHANGE: 'intentionChange',
  TRANSFER_AGENTS: 'transferAgents',
  TRANSFER_BACK: 'transferBack',
  
  // Skill functions
  KNOWLEDGE_SEARCH: 'knowledgeSearch',
  WEB_SEARCH: 'webSearch',
  
  // UI functions
  NAVIGATE_TO_MAIN: 'navigateToMain',
  NAVIGATE_TO_PREVIOUS: 'navigateToPrevious',
  
  // Thai Resort specific functions
  VIEW_RESORT_CATEGORY: 'viewResortCategory',
  VIEW_RESORT_DETAIL: 'viewResortDetail',
  SEARCH_RESORTS: 'searchResorts',
  COMPARE_RESORTS: 'compareResorts',
} as const; 