"use client";

import React, { useState } from 'react';
import { ActionType, useActionContext } from '@/botActionFramework';
import ActionTypeSelector from '@/app/testing/components/ActionTypeSelector';
import ActionParamsForm from '@/app/testing/components/ActionParamsForm';

/**
 * Control panel for dispatching actions
 * Allows selecting action types and parameters
 */
export default function ActionControlPanel() {
  // Get action context
  const actionContext = useActionContext();
  
  // Local state
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
  const [actionParams, setActionParams] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Handle action type change
  const handleActionTypeChange = (actionType: ActionType) => {
    setSelectedActionType(actionType);
    // Reset params when action type changes
    setActionParams({});
  };
  
  // Handle parameter changes
  const handleParamChange = (paramName: string, value: any) => {
    setActionParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  // Execute the selected action with params
  const executeAction = async () => {
    if (!selectedActionType) return;
    
    setIsExecuting(true);
    
    try {
      // Execute the action
      const result = await actionContext.executeAction(selectedActionType, actionParams);
      
      console.log(`[Testing] Action ${selectedActionType} executed:`, result);
    } catch (error) {
      console.error(`[Testing] Error executing action ${selectedActionType}:`, error);
    } finally {
      setIsExecuting(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Action type selector */}
      <div>
        <h3 className="text-md font-medium mb-2 text-slate-700">Select Action Type</h3>
        <ActionTypeSelector 
          value={selectedActionType} 
          onChange={handleActionTypeChange} 
        />
      </div>
      
      {/* Parameters form */}
      {selectedActionType && (
        <div>
          <h3 className="text-md font-medium mb-2 text-slate-700">Action Parameters</h3>
          <ActionParamsForm
            actionType={selectedActionType}
            params={actionParams}
            onChange={handleParamChange}
          />
        </div>
      )}
      
      {/* Execute button */}
      <div className="mt-4">
        <button
          className={`px-4 py-2 rounded w-full ${
            selectedActionType && !isExecuting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-slate-700 cursor-not-allowed'
          }`}
          onClick={executeAction}
          disabled={!selectedActionType || isExecuting}
        >
          {isExecuting ? 'Executing...' : 'Execute Action'}
        </button>
      </div>
    </div>
  );
} 