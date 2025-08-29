"use client";

import React from 'react';
import { ActionType } from '@/botActionFramework';

// Group actions by category
const actionGroups = {
  'Navigation': [
    ActionType.NAVIGATE_PAGE,
    ActionType.NAVIGATE_SECTION,
    ActionType.NAVIGATE_BACK,
  ],
  'Selection': [
    ActionType.SELECT_ITEM,
    ActionType.SELECT_OPTION,
    ActionType.SELECT_TAB,
  ],
  'Input': [
    ActionType.FILL_INPUT,
    ActionType.FILL_FORM,
    ActionType.TOGGLE_CONTROL,
    ActionType.SUBMIT_FORM,
  ],
  'Interaction': [
    ActionType.CLICK_BUTTON,
    ActionType.EXPAND_COLLAPSE,
    ActionType.OPEN_MODAL,
    ActionType.CLOSE_MODAL,
    ActionType.PLAY_MEDIA,
  ],
  'Contextual': [
    ActionType.MAP_ZOOM,
    ActionType.MAP_FOCUS,
    ActionType.FILTER_CONTENT,
    ActionType.SORT_CONTENT,
    ActionType.SWITCH_VIEW,
  ],
};

interface ActionTypeSelectorProps {
  value: ActionType | null;
  onChange: (type: ActionType) => void;
}

/**
 * Component for selecting action types grouped by category
 */
export default function ActionTypeSelector({ value, onChange }: ActionTypeSelectorProps) {
  return (
    <select
      className="w-full p-2 border border-gray-300 rounded text-slate-700"
      value={value || ''}
      onChange={(e) => onChange(e.target.value as ActionType)}
    >
      <option value="">Select an action type</option>
      
      {Object.entries(actionGroups).map(([group, actions]) => (
        <optgroup key={group} label={group}>
          {actions.map((actionType) => (
            <option key={actionType} value={actionType}>
              {formatActionType(actionType)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Format action type for display
 * Converts SNAKE_CASE to Title Case with spaces
 */
function formatActionType(actionType: string): string {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
} 