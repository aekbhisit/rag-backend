"use client";

import React from 'react';
import { ActionType } from '@/botActionFramework';

// Parameter definitions for each action type
const actionParamDefinitions: Record<ActionType, Array<{
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}>> = {
  // Navigation actions
  [ActionType.NAVIGATE_PAGE]: [
    { name: 'pageName', type: 'string', label: 'Page Name', placeholder: 'e.g., home, search, details', required: true },
    { name: 'pageParams', type: 'object', label: 'Page Parameters (JSON)', placeholder: '{"id": "123"}' },
  ],
  [ActionType.NAVIGATE_SECTION]: [
    { name: 'sectionId', type: 'string', label: 'Section ID', placeholder: 'e.g., products-section', required: true },
    { name: 'behavior', type: 'string', label: 'Scroll Behavior', options: ['auto', 'smooth'] },
  ],
  [ActionType.NAVIGATE_BACK]: [
    { name: 'steps', type: 'number', label: 'Steps', placeholder: '1' },
  ],
  
  // Selection actions
  [ActionType.SELECT_ITEM]: [
    { name: 'itemType', type: 'string', label: 'Item Type', placeholder: 'e.g., product, place', required: true },
    { name: 'itemId', type: 'string', label: 'Item ID', placeholder: 'e.g., prod123', required: true },
    { name: 'listContext', type: 'string', label: 'List Context', placeholder: 'e.g., search-results' },
  ],
  [ActionType.SELECT_OPTION]: [
    { name: 'optionId', type: 'string', label: 'Option ID', required: true },
    { name: 'optionValue', type: 'string', label: 'Option Value', required: true },
    { name: 'controlId', type: 'string', label: 'Control ID', required: true },
  ],
  [ActionType.SELECT_TAB]: [
    { name: 'tabId', type: 'string', label: 'Tab ID', required: true },
    { name: 'tabsetId', type: 'string', label: 'Tabset ID', required: true },
  ],
  
  // Input actions
  [ActionType.FILL_INPUT]: [
    { name: 'inputId', type: 'string', label: 'Input ID', required: true },
    { name: 'inputValue', type: 'string', label: 'Input Value', required: true },
  ],
  [ActionType.FILL_FORM]: [
    { name: 'formId', type: 'string', label: 'Form ID', required: true },
    { name: 'formValues', type: 'object', label: 'Form Values (JSON)', placeholder: '{"name": "John", "email": "john@example.com"}', required: true },
    { name: 'autoSubmit', type: 'boolean', label: 'Auto Submit' },
  ],
  [ActionType.TOGGLE_CONTROL]: [
    { name: 'controlId', type: 'string', label: 'Control ID', required: true },
    { name: 'newState', type: 'boolean', label: 'New State' },
  ],
  [ActionType.SUBMIT_FORM]: [
    { name: 'formId', type: 'string', label: 'Form ID', required: true },
  ],
  
  // Interaction actions
  [ActionType.CLICK_BUTTON]: [
    { name: 'buttonId', type: 'string', label: 'Button ID', required: true },
    { name: 'contextId', type: 'string', label: 'Context ID' },
  ],
  [ActionType.EXPAND_COLLAPSE]: [
    { name: 'elementId', type: 'string', label: 'Element ID', required: true },
    { name: 'expand', type: 'boolean', label: 'Expand' },
  ],
  [ActionType.OPEN_MODAL]: [
    { name: 'modalType', type: 'string', label: 'Modal Type', required: true },
    { name: 'initialData', type: 'object', label: 'Initial Data (JSON)', placeholder: '{"productId": "123"}' },
  ],
  [ActionType.CLOSE_MODAL]: [
    { name: 'modalId', type: 'string', label: 'Modal ID' },
  ],
  [ActionType.PLAY_MEDIA]: [
    { name: 'mediaId', type: 'string', label: 'Media ID', required: true },
    { name: 'action', type: 'string', label: 'Action', options: ['play', 'pause', 'stop', 'seek'], required: true },
    { name: 'position', type: 'number', label: 'Position (seconds)' },
  ],
  
  // Contextual actions
  [ActionType.MAP_ZOOM]: [
    { name: 'zoomLevel', type: 'number', label: 'Zoom Level', required: true },
    { name: 'mapId', type: 'string', label: 'Map ID' },
  ],
  [ActionType.MAP_FOCUS]: [
    { name: 'latitude', type: 'number', label: 'Latitude', required: true },
    { name: 'longitude', type: 'number', label: 'Longitude', required: true },
    { name: 'zoomLevel', type: 'number', label: 'Zoom Level' },
    { name: 'mapId', type: 'string', label: 'Map ID' },
  ],
  [ActionType.FILTER_CONTENT]: [
    { name: 'filters', type: 'object', label: 'Filters (JSON)', placeholder: '{"category": "electronics", "price": "low"}', required: true },
    { name: 'contentType', type: 'string', label: 'Content Type', required: true },
    { name: 'replace', type: 'boolean', label: 'Replace Existing Filters' },
  ],
  [ActionType.SORT_CONTENT]: [
    { name: 'sortBy', type: 'string', label: 'Sort By', required: true },
    { name: 'sortOrder', type: 'string', label: 'Sort Order', options: ['asc', 'desc'], required: true },
    { name: 'contentType', type: 'string', label: 'Content Type', required: true },
  ],
  [ActionType.SWITCH_VIEW]: [
    { name: 'viewMode', type: 'string', label: 'View Mode', required: true },
    { name: 'contentType', type: 'string', label: 'Content Type', required: true },
  ],
};

interface ActionParamsFormProps {
  actionType: ActionType;
  params: Record<string, any>;
  onChange: (name: string, value: any) => void;
}

/**
 * Form for entering action parameters based on the selected action type
 */
export default function ActionParamsForm({ actionType, params, onChange }: ActionParamsFormProps) {
  const paramDefinitions = actionParamDefinitions[actionType] || [];
  
  const handleChange = (name: string, type: string, value: string) => {
    let parsedValue: any = value;
    
    // Parse values based on type
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'boolean') {
      parsedValue = value === 'true';
    } else if (type === 'object' && value) {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Keep as string if not valid JSON
        parsedValue = value;
      }
    }
    
    onChange(name, parsedValue);
  };
  
  return (
    <div className="space-y-3">
      {paramDefinitions.map((param) => (
        <div key={param.name} className="flex flex-col">
          <label className="text-sm font-medium mb-1 text-slate-700">
            {param.label}
            {param.required && <span className="text-red-600 ml-1">*</span>}
          </label>
          
          {param.type === 'boolean' ? (
            <select
              className="p-2 border border-gray-300 rounded text-slate-700"
              value={params[param.name]?.toString() || ''}
              onChange={(e) => handleChange(param.name, param.type, e.target.value)}
            >
              <option value="">Select</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : param.options ? (
            <select
              className="p-2 border border-gray-300 rounded text-slate-700"
              value={params[param.name] || ''}
              onChange={(e) => handleChange(param.name, param.type, e.target.value)}
            >
              <option value="">Select</option>
              {param.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : param.type === 'object' ? (
            <textarea
              className="p-2 border border-gray-300 rounded h-24 font-mono text-sm text-slate-700"
              placeholder={param.placeholder}
              value={
                typeof params[param.name] === 'object'
                  ? JSON.stringify(params[param.name], null, 2)
                  : params[param.name] || ''
              }
              onChange={(e) => handleChange(param.name, param.type, e.target.value)}
            />
          ) : (
            <input
              className="p-2 border border-gray-300 rounded text-slate-700"
              type={param.type === 'number' ? 'number' : 'text'}
              placeholder={param.placeholder}
              value={params[param.name] || ''}
              onChange={(e) => handleChange(param.name, param.type, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
} 