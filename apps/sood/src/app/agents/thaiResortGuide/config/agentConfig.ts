import { AgentConfig } from "@/app/types";
import { thaiResortFunctions } from './functions';
import { createTransferBackHandler } from '../../core/functions';
import { 
  getCoreImplementationsByConfig, 
  CoreFunctionConfig 
} from '../../core/functions';

// Configure which core functions to use
const CORE_CONFIG: CoreFunctionConfig = {
  core: true,      // Use core functions (intentionChange, transferAgents, transferBack)
  ui: true,        // Use UI functions (navigateToMain, navigateToPrevious)
  skill: true,     // Use skill functions (knowledgeSearch, webSearch)
};

// Get reusable core implementations
const coreImplementations = getCoreImplementationsByConfig(CORE_CONFIG);

const thaiResortGuide: AgentConfig = {
  name: "thaiResortGuide",
  publicDescription: "Thai resort guide agent for เฮือนไทรแก้วรีสอร์ท in Chiang Rai, Thailand",
  instructions: `
    คุณเป็นไกด์แนะนำที่พักและสถานที่ท่องเที่ยวของ "เฮือนไทรแก้วรีสอร์ท" ที่จังหวัดเชียงราย ประเทศไทย
    
    ตอบคำถามของผู้ใช้โดยตรงและให้ข้อมูลที่เป็นประโยชน์เกี่ยวกับ:
    - ข้อมูลห้องพักและราคา
    - สถานที่ท่องเที่ยวใกล้เคียง (เช่น รีสอร์ทติดทะเล รีสอร์ทบนเขา เกาะต่างๆ สปา วัฒนธรรม)
    - การเดินทางมาที่รีสอร์ท
    - สิ่งอำนวยความสะดวกในรีสอร์ท
    - กิจกรรมพิเศษของรีสอร์ท
    
    ใช้ภาษาไทยหรือภาษาอังกฤษตามที่ผู้ใช้สื่อสาร และตอบคำถามโดยตรงแทนที่จะทักทายซ้ำๆ
    
    หากผู้ใช้ถามเกี่ยวกับรีสอร์ทประเภทต่างๆ ให้ใช้ viewResortCategory function เพื่อแสดงข้อมูล
  `,
  tools: thaiResortFunctions,
  
  // Combine core implementations with Thai Resort specific implementations
  toolLogic: {
    // ===== REUSE CORE IMPLEMENTATIONS =====
    ...coreImplementations,
    
    // Override transferBack with specific handler
    transferBack: createTransferBackHandler("thaiResortGuide"),
    
    // Override navigateToMain with Thai-specific implementation
navigateToMain: async (args: any) => {
console.log('[ThaiResort] navigateToMain called:', args);
      
      const { resetState, welcomeMessage } = args;
      
      // Thai Resort specific main page navigation
      return {
        success: true,
        action: 'navigate_to_main',
        resetState: resetState || false,
        welcomeMessage: welcomeMessage || 'กลับสู่หน้าหลักแล้ว เลือกหมวดหมู่ที่ต้องการดูข้อมูลได้เลย',
        currentView: 'categories'
      };
    },

    // Override knowledgeSearch with Thai Resort specific knowledge
knowledgeSearch: async (args: any) => {
console.log('[ThaiResort] knowledgeSearch called:', args);
      
      const { searchQuery, maxResults } = args;
      
      // Thai Resort specific knowledge base
      const thaiResortKnowledge = [
        {
          title: 'ข้อมูลห้องพัก',
          content: 'เฮือนไทรแก้วรีสอร์ทมีห้องพักหลากหลายประเภท ตั้งแต่ห้องสแตนดาร์ดไปจนถึงห้องสวีท',
          relevance: 0.9
        },
        {
          title: 'สถานที่ท่องเที่ยว',
          content: 'ใกล้กับวัดร่องขุ่น วัดร่องเสือเต้น และแหล่งท่องเที่ยวอื่นๆ ในเชียงราย',
          relevance: 0.8
        },
        {
          title: 'รีสอร์ทติดทะเล',
          content: 'เฮือนไทรแก้วรีสอร์ทตั้งอยู่ในเชียงราย ไม่ใช่ติดทะเล แต่เรามีข้อมูลรีสอร์ทติดทะเลในภูเก็ต เกาะสมุย กระบี่ และเกาะต่างๆ ที่สามารถแนะนำได้',
          relevance: 0.9
        },
        {
          title: 'ทำเลที่ตั้ง',
          content: 'เฮือนไทรแก้วรีสอร์ทตั้งอยู่ในจังหวัดเชียงราย ภาคเหนือของประเทศไทย ล้อมรอบด้วยธรรมชาติและวัฒนธรรมล้านนา',
          relevance: 0.8
        }
      ];
      
      return {
        success: true,
        searchQuery,
        results: thaiResortKnowledge.slice(0, maxResults || 5),
        totalResults: thaiResortKnowledge.length
      };
    },

    // ===== THAI RESORT SPECIFIC FUNCTIONS =====
    viewResortCategory: async (args: any) => {
      console.log('[ThaiResort] viewResortCategory called:', args);
      
      const { categoryId } = args;
      
      // Import category data
      const { getArticlesByCategory, getCategoryName } = await import('../data/resortData');
      
      try {
        const articles = getArticlesByCategory(categoryId);
        const categoryName = getCategoryName(categoryId);
        
        return {
          success: true,
          categoryId,
          categoryName,
          articles: articles.map(article => ({
            id: article.id,
            name: article.name
          })),
          totalArticles: articles.length,
          currentView: 'categoryArticles'
        };
      } catch {
        return {
          success: false,
          error: `Category ${categoryId} not found`,
          message: 'ไม่พบหมวดหมู่ที่ระบุ'
        };
      }
    },

    viewResortDetail: async (args: any) => {
      console.log('[ThaiResort] viewResortDetail called:', args);
      
      const { resortId } = args;
      
      // Import article data
      const { getArticleById } = await import('./functions');
      
      try {
        const article = getArticleById(resortId);
        
        if (!article) {
          return {
            success: false,
            error: `Resort ${resortId} not found`,
            message: 'ไม่พบข้อมูลรีสอร์ทที่ระบุ'
          };
        }
        
        return {
          success: true,
          resortId,
          article: {
            id: article.id,
            name: article.name
          },
          currentView: 'articleDetail'
        };
      } catch {
        return {
          success: false,
          error: `Error loading resort details`,
          message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลรีสอร์ท'
        };
      }
    },

    searchResorts: async (args: any) => {
      console.log('[ThaiResort] searchResorts called:', args);
      
      const { searchQuery, location, priceRange } = args;
      
      // Simple search simulation
      const searchResults = [
        {
          id: 'resort1',
          name: 'ห้องสแตนดาร์ด',
          description: 'ห้องพักขนาดกลางพร้อมสิ่งอำนวยความสะดวกครบครัน',
          location: 'เชียงราย',
          priceRange: 'mid-range'
        },
        {
          id: 'resort2', 
          name: 'ห้องดีลักซ์',
          description: 'ห้องพักขนาดใหญ่พร้อมวิวสวยงาม',
          location: 'เชียงราย',
          priceRange: 'luxury'
        }
      ];
      
      // Filter by criteria
      let filteredResults = searchResults;
      
      if (location) {
        filteredResults = filteredResults.filter(r => 
          r.location.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      if (priceRange) {
        filteredResults = filteredResults.filter(r => r.priceRange === priceRange);
      }
      
      return {
        success: true,
        searchQuery,
        location,
        priceRange,
        results: filteredResults,
        totalResults: filteredResults.length
      };
    },

    compareResorts: async (args: any) => {
      console.log('[ThaiResort] compareResorts called:', args);
      
      const { resortIds } = args;
      
      if (!resortIds || resortIds.length < 2) {
        return {
          success: false,
          error: 'Need at least 2 resorts to compare',
          message: 'ต้องเลือกรีสอร์ทอย่างน้อย 2 แห่งเพื่อเปรียบเทียบ'
        };
      }
      
      // Simple comparison simulation
      const comparisonData = resortIds.map((id: string) => ({
        id,
        name: `รีสอร์ท ${id}`,
        price: Math.floor(Math.random() * 5000) + 1000,
        rating: (Math.random() * 2 + 3).toFixed(1),
        amenities: ['WiFi', 'Pool', 'Restaurant', 'Parking']
      }));
      
      return {
        success: true,
        resortIds,
        comparison: comparisonData,
        totalCompared: comparisonData.length,
        message: `เปรียบเทียบรีสอร์ท ${resortIds.length} แห่งเรียบร้อยแล้ว`
      };
    }
  },
  
  // Add transfer settings for this agent
  transferSettings: {
    autoGenerateFirstMessage: false,
    initialPrompt: "",
    initialSystemPrompt: "",
    waitForVoicePlayback: false
  }
};

export default thaiResortGuide; 