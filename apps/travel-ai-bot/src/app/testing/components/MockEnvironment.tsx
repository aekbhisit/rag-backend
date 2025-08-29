"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useActionContext } from '@/botActionFramework';
import { ActionType } from '@/botActionFramework';

/**
 * Mock environment that visually responds to actions
 */
export default function MockEnvironment() {
  const actionContext = useActionContext();
  
  // State for mock environment
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Track if handlers are registered to avoid re-registration
  const handlersRegistered = useRef(false);
  
  // Store stable references to actionContext functions
  const registerActionRef = useRef(actionContext.registerAction);
  const unregisterActionRef = useRef(actionContext.unregisterAction);
  const updateContextRef = useRef(actionContext.updateContext);
  
  // Update refs when actionContext changes
  useEffect(() => {
    registerActionRef.current = actionContext.registerAction;
    unregisterActionRef.current = actionContext.unregisterAction;
    updateContextRef.current = actionContext.updateContext;
  }, [actionContext]);
  
  // Mock data
  const mockItems = [
    { id: 'item1', name: 'Italian Restaurant', type: 'restaurant' },
    { id: 'item2', name: 'Coffee Shop', type: 'cafe' },
    { id: 'item3', name: 'Hotel Downtown', type: 'hotel' },
    { id: 'item4', name: 'City Park', type: 'place' },
  ];
  
  // Register handlers for the mock environment (only once)
  useEffect(() => {
    if (handlersRegistered.current) return;
    
    // Register navigation handler
    registerActionRef.current(
      ActionType.NAVIGATE_PAGE,
      'mock-environment-navigation',
      async (payload: any) => {
        if (payload.pageName) {
          setCurrentPage(payload.pageName);
          // Reset selections when changing pages
          setSelectedItem(null);
          return {
            success: true,
            message: `Navigated to ${payload.pageName} page`,
          };
        }
        return {
          success: false,
          error: 'Invalid page name',
        };
      }
    );
    
    // Register select item handler
    registerActionRef.current(
      ActionType.SELECT_ITEM,
      'mock-environment-selection',
      async (payload: any) => {
        const { itemId } = payload;
        const item = mockItems.find(item => item.id === itemId);
        
        if (item) {
          setSelectedItem(itemId);
          return {
            success: true,
            message: `Selected ${item.name}`,
            data: { item },
          };
        }
        
        return {
          success: false,
          error: `Item with ID ${itemId} not found`,
        };
      }
    );
    
    // Register form handler
    registerActionRef.current(
      ActionType.FILL_FORM,
      'mock-environment-form',
      async (payload: any) => {
        const { formId, formValues } = payload;
        
        if (formId && formValues) {
          setFormValues(formValues);
          return {
            success: true,
            message: `Filled form: ${formId}`,
            data: { formValues },
          };
        }
        
        return {
          success: false,
          error: 'Invalid form data',
        };
      }
    );
    
    // Register modal handler
    registerActionRef.current(
      ActionType.OPEN_MODAL,
      'mock-environment-modal',
      async (payload: any) => {
        const { modalType } = payload;
        
        if (modalType) {
          setIsModalOpen(true);
          setModalType(modalType);
          return {
            success: true,
            message: `Opened ${modalType} modal`,
          };
        }
        
        return {
          success: false,
          error: 'Invalid modal type',
        };
      }
    );
    
    // Register close modal handler
    registerActionRef.current(
      ActionType.CLOSE_MODAL,
      'mock-environment-close-modal',
      async () => {
        setIsModalOpen(false);
        setModalType(null);
        return {
          success: true,
          message: 'Closed modal',
        };
      }
    );
    
    // Register tab selection handler
    registerActionRef.current(
      ActionType.SELECT_TAB,
      'mock-environment-tab',
      async (payload: any) => {
        const { tabId } = payload;
        
        if (tabId) {
          setActiveTab(tabId);
          return {
            success: true,
            message: `Selected tab: ${tabId}`,
          };
        }
        
        return {
          success: false,
          error: 'Invalid tab ID',
        };
      }
    );
    
    handlersRegistered.current = true;
    
    // Cleanup on unmount
    return () => {
      unregisterActionRef.current(ActionType.NAVIGATE_PAGE, 'mock-environment-navigation');
      unregisterActionRef.current(ActionType.SELECT_ITEM, 'mock-environment-selection');
      unregisterActionRef.current(ActionType.FILL_FORM, 'mock-environment-form');
      unregisterActionRef.current(ActionType.OPEN_MODAL, 'mock-environment-modal');
      unregisterActionRef.current(ActionType.CLOSE_MODAL, 'mock-environment-close-modal');
      unregisterActionRef.current(ActionType.SELECT_TAB, 'mock-environment-tab');
      handlersRegistered.current = false;
    };
  }, []); // Empty dependency array
  
  // Update context with current mock state (with debouncing and stable ref)
  useEffect(() => {
    // Temporarily disable context updates to prevent infinite loop
    // TODO: Fix the circular dependency issue
    /*
    const timer = setTimeout(() => {
      updateContextRef.current({
        currentPage,
        selectedItem,
        formValues,
        isModalOpen,
        modalType,
        activeTab,
      });
    }, 100); // Small delay to prevent rapid updates
    
    return () => clearTimeout(timer);
    */
  }, [currentPage, selectedItem, formValues, isModalOpen, modalType, activeTab]); // Only state dependencies
  
  // Render mock UI based on current page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Home Page</h3>
            <p className="mb-4 text-slate-700">Welcome to the mock environment.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-2 bg-blue-100 rounded text-sm text-slate-700">Search</button>
              <button className="p-2 bg-blue-100 rounded text-sm text-slate-700">Browse</button>
              <button className="p-2 bg-blue-100 rounded text-sm text-slate-700">Popular</button>
              <button className="p-2 bg-blue-100 rounded text-sm text-slate-700">Featured</button>
            </div>
          </div>
        );
        
      case 'search':
        return (
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Search Results</h3>
            <div className="mb-4">
              <input
                type="text"
                className="w-full p-2 border rounded text-slate-700"
                placeholder="Search..."
                value={formValues.searchQuery || ''}
                readOnly
              />
            </div>
            <div className="space-y-2">
              {mockItems.map(item => (
                <div
                  key={item.id}
                  className={`p-3 border rounded cursor-pointer ${
                    selectedItem === item.id ? 'bg-blue-100 border-blue-500' : 'bg-gray-50'
                  }`}
                  onClick={() => setSelectedItem(item.id)}
                >
                  <div className="font-medium text-slate-700">{item.name}</div>
                  <div className="text-xs text-gray-600">{item.type}</div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'details':
        const item = mockItems.find(item => item.id === selectedItem);
        
        return (
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-bold mb-4 text-slate-800">
              {item ? item.name : 'Item Details'}
            </h3>
            
            {!item ? (
              <p className="text-gray-600">No item selected</p>
            ) : (
              <>
                <div className="mb-4">
                  <div className="tabs flex border-b mb-4">
                    <div
                      className={`px-4 py-2 cursor-pointer ${
                        activeTab === 'details' ? 'border-b-2 border-blue-500 font-medium' : 'text-slate-600'
                      }`}
                      onClick={() => setActiveTab('details')}
                    >
                      Details
                    </div>
                    <div
                      className={`px-4 py-2 cursor-pointer ${
                        activeTab === 'reviews' ? 'border-b-2 border-blue-500 font-medium' : 'text-slate-600'
                      }`}
                      onClick={() => setActiveTab('reviews')}
                    >
                      Reviews
                    </div>
                    <div
                      className={`px-4 py-2 cursor-pointer ${
                        activeTab === 'photos' ? 'border-b-2 border-blue-500 font-medium' : 'text-slate-600'
                      }`}
                      onClick={() => setActiveTab('photos')}
                    >
                      Photos
                    </div>
                  </div>
                  
                  <div className="tab-content">
                    {activeTab === 'details' && (
                      <div>
                        <p className="mb-2"><span className="font-medium text-slate-700">Type:</span> <span className="text-slate-700">{item.type}</span></p>
                        <p className="mb-2"><span className="font-medium text-slate-700">ID:</span> <span className="text-slate-700">{item.id}</span></p>
                        <button 
                          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
                          onClick={() => { setIsModalOpen(true); setModalType('booking'); }}
                        >
                          Book Now
                        </button>
                      </div>
                    )}
                    
                    {activeTab === 'reviews' && (
                      <div>
                        <p className="text-sm text-gray-600">No reviews yet.</p>
                      </div>
                    )}
                    
                    {activeTab === 'photos' && (
                      <div>
                        <p className="text-sm text-gray-600">No photos available.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );
        
      default:
        return (
          <div className="p-4 border rounded bg-white">
            <h3 className="text-lg font-bold mb-4 text-slate-800">{currentPage}</h3>
            <p className="text-slate-700">This is a mock page.</p>
          </div>
        );
    }
  };
  
  return (
    <div className="relative h-full">
      {/* Navigation bar */}
      <div className="flex border-b mb-4 pb-2">
        <button
          className={`mr-2 px-3 py-1 text-sm rounded ${
            currentPage === 'home' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-slate-700'
          }`}
          onClick={() => setCurrentPage('home')}
        >
          Home
        </button>
        <button
          className={`mr-2 px-3 py-1 text-sm rounded ${
            currentPage === 'search' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-slate-700'
          }`}
          onClick={() => setCurrentPage('search')}
        >
          Search
        </button>
        <button
          className={`px-3 py-1 text-sm rounded ${
            currentPage === 'details' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-slate-700'
          }`}
          onClick={() => setCurrentPage('details')}
        >
          Details
        </button>
      </div>
      
      {/* Current page content */}
      <div className="overflow-auto" style={{ height: 'calc(100% - 3rem)' }}>
        {renderPage()}
      </div>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {modalType === 'booking' ? 'Book Reservation' : modalType}
              </h3>
              <button
                className="text-slate-600 hover:text-slate-800"
                onClick={() => { setIsModalOpen(false); setModalType(null); }}
              >
                ✕
              </button>
            </div>
            
            {modalType === 'booking' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Date</label>
                  <input type="date" className="w-full p-2 border rounded text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Time</label>
                  <input type="time" className="w-full p-2 border rounded text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Guests</label>
                  <input type="number" className="w-full p-2 border rounded text-slate-700" min="1" defaultValue="2" />
                </div>
                <div className="pt-2">
                  <button className="w-full p-2 bg-blue-500 text-white rounded">
                    Confirm Booking
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 