"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { ActionType, useActionContext } from '@/botActionFramework';

// Mock data for Thai resort categories and articles
const articleCategories = [
  { 
    id: 'beach', 
    name: 'Beach Resorts',
    description: 'Luxury beachfront properties in Thailand',
    icon: '🏝️'
  },
  { 
    id: 'mountain', 
    name: 'Mountain Retreats',
    description: 'Serene getaways in Northern Thailand',
    icon: '⛰️'
  },
  { 
    id: 'island', 
    name: 'Island Escapes',
    description: 'Idyllic island destinations',
    icon: '🏝️'
  },
  { 
    id: 'spa', 
    name: 'Wellness & Spa',
    description: 'Relaxation and rejuvenation centers',
    icon: '💆'
  },
  { 
    id: 'cultural', 
    name: 'Cultural Experiences',
    description: 'Immersive Thai cultural stays',
    icon: '🏯'
  },
];

const articlesByCategory = {
  beach: [
    { id: 'b1', title: 'Phuket Luxury Beach Resorts', summary: 'Explore the finest beachfront properties in Phuket with private beaches and world-class amenities.', date: '2023-05-10' },
    { id: 'b2', title: 'Koh Samui Beachfront Villas', summary: 'Exclusive villas with stunning ocean views and direct beach access in Koh Samui.', date: '2023-05-15' },
    { id: 'b3', title: 'Krabi\'s Hidden Beach Retreats', summary: 'Discover secluded beach resorts nestled among Krabi\'s limestone cliffs.', date: '2023-05-20' },
  ],
  mountain: [
    { id: 'm1', title: 'Chiang Mai Mountaintop Retreats', summary: 'Peaceful resorts with panoramic views of Northern Thailand\'s mountains and valleys.', date: '2023-05-12' },
    { id: 'm2', title: 'Pai Riverside Mountain Lodges', summary: 'Authentic wooden lodges alongside Pai\'s serene rivers and mountain landscapes.', date: '2023-05-18' },
    { id: 'm3', title: 'Doi Inthanon Luxury Camps', summary: 'High-altitude glamping near Thailand\'s highest peak with stunning sunrise views.', date: '2023-05-22' },
  ],
  island: [
    { id: 'i1', title: 'Phi Phi Islands Private Resorts', summary: 'Exclusive resorts on the world-famous Phi Phi Islands with crystal clear waters.', date: '2023-05-08' },
    { id: 'i2', title: 'Koh Lipe Boutique Stays', summary: 'Intimate boutique accommodations on the pristine island of Koh Lipe.', date: '2023-05-14' },
    { id: 'i3', title: 'Similan Islands Eco Retreats', summary: 'Sustainable luxury in one of Thailand\'s most preserved marine national parks.', date: '2023-05-19' },
  ],
  spa: [
    { id: 's1', title: 'Bangkok Luxury Spa Resorts', summary: 'Urban wellness retreats offering traditional Thai therapies in the heart of Bangkok.', date: '2023-05-11' },
    { id: 's2', title: 'Hua Hin Wellness Sanctuaries', summary: 'Comprehensive wellness programs in the royal seaside town of Hua Hin.', date: '2023-05-16' },
    { id: 's3', title: 'Koh Phangan Detox Retreats', summary: 'Holistic health and detoxification programs on the spiritual island of Koh Phangan.', date: '2023-05-21' },
  ],
  cultural: [
    { id: 'c1', title: 'Sukhothai Heritage Stays', summary: 'Immersive accommodations near the ancient capital of Thailand.', date: '2023-05-09' },
    { id: 'c2', title: 'Ayutthaya Historical Resorts', summary: 'Luxurious stays amidst the ruins of the former Thai kingdom.', date: '2023-05-17' },
    { id: 'c3', title: 'Lanna Cultural Experiences', summary: 'Traditional Northern Thai architecture and experiences in authentic Lanna-style resorts.', date: '2023-05-23' },
  ],
};

type Article = {
  id: string;
  title: string;
  summary: string;
  date: string;
};

const WebContent: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  // Places support for placeGuide agent
  type Place = { id: string; name: string; address?: string; distance_km?: number; category?: string; lat?: number; long?: number };
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [travelPath, setTravelPath] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [travelPath, setTravelPath] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  // Get action context from Bot Action Framework
  const actionContext = useActionContext();
  
  // Listen for context updates from Thai Resort Guide
  useEffect(() => {
    // Add listener for Thai Resort context updates
    const handleThaiResortContextUpdate = (event: CustomEvent) => {
      console.log('[WebContent] Received Thai Resort context update:', event.detail);
      
      const { view, category, article } = event.detail;
      
      if (view === 'categories') {
        setSelectedCategory(null);
        setSelectedArticle(null);
        console.log('[WebContent] Updated to categories view');
      }
      else if (view === 'categoryArticles' && category) {
        console.log(`[WebContent] Updating to category view: ${category}`);
        setSelectedCategory(category);
        setSelectedArticle(null);
      }
      else if (view === 'articleDetail' && article) {
        const categoryId = category || selectedCategory;
        if (categoryId) {
          console.log(`[WebContent] Updating to article view: ${article} in category ${categoryId}`);
          const articles = articlesByCategory[categoryId as keyof typeof articlesByCategory] || [];
          const foundArticle = articles.find(a => a.id === article);
          if (foundArticle) {
            setSelectedArticle(foundArticle);
          }
        }
      }
    };
    
    // Add event listener
    window.addEventListener('thaiResort:contextUpdated', 
      handleThaiResortContextUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('thaiResort:contextUpdated', 
        handleThaiResortContextUpdate as EventListener);
    };
  }, [selectedCategory]);
  
  // Sync with context on initial load and context changes
  useEffect(() => {
    const context = actionContext.getContext();
    console.log('[WebContent] Current context on load/change:', context);
    
    // If we have a valid context with view information, update the UI
    if (context && context.currentView) {
      if (context.currentView === 'categories') {
        setSelectedCategory(null);
        setSelectedArticle(null);
      }
      else if (context.currentView === 'categoryArticles' && context.currentCategory) {
        console.log(`[WebContent] Setting category from context: ${context.currentCategory}`);
        setSelectedCategory(context.currentCategory);
        setSelectedArticle(null);
      }
      else if (context.currentView === 'articleDetail' && context.currentArticle) {
        const categoryId = context.currentCategory || selectedCategory;
        if (categoryId) {
          const articles = articlesByCategory[categoryId as keyof typeof articlesByCategory] || [];
          const article = articles.find(a => a.id === context.currentArticle);
          if (article) {
            setSelectedCategory(categoryId);
            setSelectedArticle(article);
          }
        }
      }
    }
  }, [actionContext, actionContext.getContext]);

  // Register handlers for bot navigation
  useEffect(() => {
    // Handler for page navigation
    actionContext.registerAction(
      ActionType.NAVIGATE_PAGE,
      'webcontent-navigation',
      async (payload: any) => {
        if (payload.pageName === 'home' || payload.pageName === 'main') {
          setSelectedCategory(null);
          setSelectedArticle(null);
          setPlaces(null);
          setSelectedPlaceId(null);
          
          // Update context to show main categories
          actionContext.updateContext({
            currentView: 'categories',
            currentCategory: null,
            currentArticle: null
          });
          
          console.log(`[WebContent] Navigated to main categories page`);
          
          return {
            success: true,
            message: 'Navigated to main categories page',
          };
        }
        if (payload.pageName === 'taxi') {
          setSelectedCategory(null);
          setSelectedArticle(null);
          setPlaces(null);
          setSelectedPlaceId(null);
          actionContext.updateContext({ currentView: 'taxi' });
          return { success: true, message: 'Opened Taxi page' };
        }
        if (payload.pageName === 'travel') {
          let path: string | null = typeof payload.path === 'string' ? payload.path
            : Array.isArray(payload.segments) && payload.segments.length > 0 ? `/travel/${payload.segments.join('/')}`
            : typeof payload.slug === 'string' ? `/travel/${payload.slug}`
            : typeof payload.pageParams?.slug === 'string' ? `/travel/${payload.pageParams.slug}`
            : null;
          try { if (path) path = decodeURIComponent(path); } catch {}
          if (path && path.startsWith('/travel')) {
            setTravelPath(path);
            actionContext.updateContext({ currentView: 'travelPage', travelPath: path });
            return { success: true, message: `Opened travel page in panel: ${path}` };
          }
          return { success: false, error: 'Invalid travel path' };
        }
        return {
          success: false,
          error: 'Unknown page name',
        };
      }
    );
    
    // Handler for selecting a category
    actionContext.registerAction(
      ActionType.SELECT_ITEM,
      'webcontent-category-selection',
      async (payload: any) => {
        if (payload.itemType === 'category' && payload.itemId) {
          const category = articleCategories.find(c => c.id === payload.itemId);
          if (category) {
            setSelectedCategory(payload.itemId);
            setSelectedArticle(null);
            setPlaces(null);
            setSelectedPlaceId(null);
            
            // 🔥 CRITICAL FIX: Update the action context so other components know the state changed
            actionContext.updateContext({
              currentView: 'categoryArticles',
              currentCategory: payload.itemId,
              currentArticle: null
            });
            
            console.log(`[WebContent] Updated context for category: ${payload.itemId}`);
            
            return {
              success: true,
              message: `Opened ${category.name} category`,
              data: { category }
            };
          }
          return {
            success: false,
            error: `Category with ID ${payload.itemId} not found`,
          };
        }
        
        if (payload.itemType === 'article' && payload.itemId) {
          const categoryId = selectedCategory;
          if (!categoryId) {
            return {
              success: false,
              error: 'No category selected',
            };
          }
          
          const articles = articlesByCategory[categoryId as keyof typeof articlesByCategory] || [];
          const article = articles.find(a => a.id === payload.itemId);
          
          if (article) {
            setSelectedArticle(article);
            
            // 🔥 CRITICAL FIX: Update the action context for article selection
            actionContext.updateContext({
              currentView: 'articleDetail',
              currentCategory: categoryId,
              currentArticle: payload.itemId
            });
            
            console.log(`[WebContent] Updated context for article: ${payload.itemId} in category: ${categoryId}`);
            
            return {
              success: true,
              message: `Opened article: ${article.title}`,
              data: { article }
            };
          }
          return {
            success: false,
            error: `Article with ID ${payload.itemId} not found`,
          };
        }

        // New: select a place by id
        if (payload.itemType === 'place' && payload.itemId) {
          const pid = String(payload.itemId);
          const found = (places || []).find(p => String(p.id) === pid);
          if (found) {
            setSelectedPlaceId(pid);
            setHighlightId(pid);
            actionContext.updateContext({ currentView: 'placeDetail', selectedPlaceId: pid });
            return { success: true, message: `Opened place: ${found.name}`, data: { place: found } };
          }
          return { success: false, error: `Place with ID ${pid} not found` };
        }
        
        return {
          success: false,
          error: 'Invalid selection parameters',
        };
      }
    );

    // New: filterContent to display places list
    actionContext.registerAction(
      ActionType.FILTER_CONTENT,
      'webcontent-filter-places',
      async (payload: any) => {
        if (payload.contentType === 'places' && Array.isArray(payload.filters?.items)) {
          const items = payload.filters.items as Place[];
          setPlaces(items);
          setSelectedPlaceId(null);
          setHighlightId(null);
          actionContext.updateContext({ currentView: 'placesList', placesCount: items.length });
          return { success: true, message: `Displayed ${items.length} places` };
        }
        return { success: false, error: 'Unsupported filterContent payload' };
      }
    );

    // New: switchView to highlight a place
    actionContext.registerAction(
      ActionType.SWITCH_VIEW,
      'webcontent-highlight-place',
      async (payload: any) => {
        if (payload.viewMode === 'highlight' && payload.contentType === 'places' && payload.placeId) {
          setHighlightId(String(payload.placeId));
          return { success: true, message: 'Highlighted place', data: { placeId: payload.placeId } };
        }
        return { success: false, error: 'Unsupported switchView payload' };
      }
    );
    
    // Handler for navigating back
    actionContext.registerAction(
      ActionType.NAVIGATE_BACK,
      'webcontent-navigate-back',
      async () => {
        if (selectedArticle) {
          setSelectedArticle(null);
          
          // Update context to show category articles
          actionContext.updateContext({
            currentView: 'categoryArticles',
            currentCategory: selectedCategory,
            currentArticle: null
          });
          
          console.log(`[WebContent] Navigated back to category: ${selectedCategory}`);
          
          return {
            success: true,
            message: 'Navigated back to article list',
          };
        }
        
        if (selectedCategory) {
          setSelectedCategory(null);
          
          // Update context to show main categories
          actionContext.updateContext({
            currentView: 'categories',
            currentCategory: null,
            currentArticle: null
          });
          
          console.log(`[WebContent] Navigated back to categories`);
          
          return {
            success: true,
            message: 'Navigated back to categories',
          };
        }
        
        return {
          success: false,
          error: 'Already at main page',
        };
      }
    );
    
    // Cleanup on unmount
    return () => {
      actionContext.unregisterAction(ActionType.NAVIGATE_PAGE, 'webcontent-navigation');
      actionContext.unregisterAction(ActionType.SELECT_ITEM, 'webcontent-category-selection');
      actionContext.unregisterAction(ActionType.NAVIGATE_BACK, 'webcontent-navigate-back');
      actionContext.unregisterAction(ActionType.FILTER_CONTENT, 'webcontent-filter-places');
      actionContext.unregisterAction(ActionType.SWITCH_VIEW, 'webcontent-highlight-place');
    };
  }, [actionContext, selectedCategory, selectedArticle]);

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
    
    // Notify the bot action framework about the navigation
    actionContext.updateContext({
      currentView: 'categoryArticles',
      currentCategory: categoryId
    });
  };

  // Handle article selection
  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    
    // Notify the bot action framework about the navigation
    actionContext.updateContext({
      currentView: 'articleDetail',
      currentArticle: article.id
    });
  };

  // Handle back button in article view
  const handleBackToArticles = () => {
    setSelectedArticle(null);
    
    // Notify the bot action framework about the navigation
    actionContext.updateContext({
      currentView: 'categoryArticles',
      currentCategory: selectedCategory
    });
  };

  // Handle back button in category list
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedArticle(null);
    
    // Notify the bot action framework about the navigation
    actionContext.updateContext({
      currentView: 'categories',
      currentCategory: null,
      currentArticle: null
    });
  };

  // Render article content
  const renderArticleContent = () => {
    if (!selectedArticle) return null;
    
    return (
      <div className="p-4">
        <button 
          onClick={handleBackToArticles} 
          className="mb-4 text-blue-500 flex items-center hover:text-blue-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to articles
        </button>
        
        <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedArticle.title}</h2>
        <p className="text-sm text-gray-500 mb-4">Published on {new Date(selectedArticle.date).toLocaleDateString()}</p>
        
        <div className="prose prose-slate max-w-none">
          <p className="mb-4">{selectedArticle.summary}</p>
          <p className="mb-4">
            Discover the unique charm of Thailand's finest resorts. With world-class service and 
            authentic Thai hospitality, these destinations offer unforgettable experiences.
            From pristine beaches to lush mountain retreats, Thailand offers diverse landscapes
            and accommodations to suit every traveler's preference.
          </p>
          <p className="mb-4">
            Each resort boasts exceptional amenities including spa treatments using traditional 
            Thai techniques, fresh local cuisine prepared by expert chefs, and cultural activities 
            that immerse guests in Thailand's rich heritage. 
          </p>
          <p className="mb-4">
            Whether you're seeking adventure, relaxation, or cultural enrichment, 
            Thailand's resorts provide the perfect base to explore this beautiful country.
          </p>
        </div>
      </div>
    );
  };

  // Render article list for a category
  const renderArticleList = () => {
    if (!selectedCategory) return null;
    
    const category = articleCategories.find(cat => cat.id === selectedCategory);
    const articles = articlesByCategory[selectedCategory as keyof typeof articlesByCategory] || [];
    
    return (
      <div className="p-4">
        <button 
          onClick={handleBackToCategories} 
          className="mb-4 text-blue-500 flex items-center hover:text-blue-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to categories
        </button>
        
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <span className="mr-2">{category?.icon}</span>
            {category?.name}
          </h2>
          <p className="text-gray-600">{category?.description}</p>
        </div>
        
        <div className="space-y-3">
          {articles.map(article => (
            <div 
              key={article.id} 
              className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => handleArticleSelect(article)}
              data-article-id={article.id}
            >
              <h3 className="font-medium text-slate-800">{article.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{article.summary}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(article.date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render category list
  const renderCategoryList = () => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Thai Resort Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {articleCategories.map(category => (
            <div 
              key={category.id} 
              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => handleCategorySelect(category.id)}
              data-category-id={category.id}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{category.icon}</span>
                <h3 className="font-medium text-slate-800">{category.name}</h3>
              </div>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render taxi page
  const renderTaxiPage = () => {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-3">Taxi Services</h2>
        <p className="text-sm text-gray-700 mb-4">Quick actions to get a taxi near you.</p>
        <div className="space-y-3">
          <div className="border rounded-lg p-3">
            <h3 className="font-medium text-slate-800">Request a Taxi</h3>
            <p className="text-sm text-gray-600">Share your pickup location to request a nearby taxi.</p>
            <button className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Share Location</button>
          </div>
          <div className="border rounded-lg p-3">
            <h3 className="font-medium text-slate-800">Airport Taxi</h3>
            <p className="text-sm text-gray-600">Book a taxi to or from the nearest airport.</p>
            <button className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Book Airport Taxi</button>
          </div>
          <div className="border rounded-lg p-3">
            <h3 className="font-medium text-slate-800">Tour Taxi</h3>
            <p className="text-sm text-gray-600">Hire a taxi for a half-day or full-day city tour.</p>
            <button className="mt-2 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Plan Tour</button>
          </div>
        </div>
      </div>
    );
  };

  // Initialize the context on first render
  useEffect(() => {
    actionContext.updateContext({
      currentView: selectedArticle ? 'articleDetail' : selectedCategory ? 'categoryArticles' : 'categories',
      currentCategory: selectedCategory,
      currentArticle: selectedArticle?.id
    });
  }, []);

  // Sync travel content from URL (?content=/travel/slug)
  useEffect(() => {
    try {
      const c = searchParams?.get('content');
      let p: string | null = c || null;
      try { if (p) p = decodeURIComponent(p); } catch {}
      if (p && p.startsWith('/travel')) {
        setTravelPath(p);
        actionContext.updateContext({ currentView: 'travelPage', travelPath: p });
      }
    } catch {}
  }, [searchParams]);

  // Fallback: also listen to popstate and initial location in case searchParams is not reactive in this tree
  useEffect(() => {
    const updateFromLocation = () => {
      try {
        const url = new URL(window.location.href);
        let p: string | null = url.searchParams.get('content');
        try { if (p) p = decodeURIComponent(p); } catch {}
        if (p && p.startsWith('/travel')) {
          setTravelPath(p);
          actionContext.updateContext({ currentView: 'travelPage', travelPath: p });
        }
      } catch {}
    };
    updateFromLocation();
    window.addEventListener('popstate', updateFromLocation);
    return () => window.removeEventListener('popstate', updateFromLocation);
  }, [actionContext]);

  // Sync travel content from URL (?content=/travel/slug)
  useEffect(() => {
    try {
      const c = searchParams?.get('content');
      if (c && c.startsWith('/travel')) {
        setTravelPath(c);
        actionContext.updateContext({ currentView: 'travelPage', travelPath: c });
      }
    } catch {}
  }, [searchParams]);

  // Main render logic
  return (
    <div className="h-full">
      {(() => {
        const ctx = actionContext.getContext();
        if (ctx?.currentView === 'taxi') return renderTaxiPage();
        if (ctx?.currentView === 'travelPage' && travelPath) {
          return (
            <div className="h-full w-full">
              <div className="p-2 text-sm text-gray-700">Showing: {travelPath}</div>
              <iframe src={travelPath} className="w-full h-[520px] border rounded" />
            </div>
          );
        }
        if (ctx?.currentView === 'travelPage' && travelPath) {
          return (
            <div className="h-full w-full">
              <div className="p-2 text-sm text-gray-700">Showing: {travelPath}</div>
              <iframe src={travelPath} className="w-full h-[520px] border rounded" />
            </div>
          );
        }
        if (selectedArticle) return renderArticleContent();
        if (!selectedArticle && selectedCategory) return renderArticleList();
        return renderCategoryList();
      })()}
    </div>
  );
};

export default WebContent; 