"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../config";
import { Badge } from "./Badge";
import { useTranslation } from "../../hooks/useTranslation";

interface IntentScope {
  id: string;
  name: string;
  slug: string;
  actions?: IntentAction[];
}

interface IntentAction {
  id: string;
  scope_id: string;
  name: string;
  slug: string;
  scope_name?: string;
}

interface IntentSelectorProps {
  selectedScopes: string[];
  selectedActions: string[];
  onScopesChange: (scopeIds: string[]) => void;
  onActionsChange: (actionIds: string[]) => void;
  maxScopes?: number;
  maxActions?: number;
}

export function IntentSelector({
  selectedScopes = [],
  selectedActions = [],
  onScopesChange,
  onActionsChange,
  maxScopes = 3,
  maxActions = 10
}: IntentSelectorProps) {
  const { t, mounted: translationMounted } = useTranslation();
  const [scopes, setScopes] = React.useState<IntentScope[]>([]);
  const [loading, setLoading] = React.useState(true);
  // Nested UI (scopes with actions), no tabs

  React.useEffect(() => {
    fetchIntentData();
  }, []);

  const fetchIntentData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/intent-system/scopes-with-actions`, {
        headers: {
          'X-Tenant-ID': getTenantId()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setScopes(data.scopes || []);
      }
    } catch (error) {
      console.error('Failed to fetch intent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      onScopesChange(selectedScopes.filter(id => id !== scopeId));
    } else if (selectedScopes.length < maxScopes) {
      onScopesChange([...selectedScopes, scopeId]);
    }
  };

  const toggleAction = (actionId: string) => {
    if (selectedActions.includes(actionId)) {
      onActionsChange(selectedActions.filter(id => id !== actionId));
    } else if (selectedActions.length < maxActions) {
      onActionsChange([...selectedActions, actionId]);
    }
  };

  const removeScope = (scopeId: string) => {
    onScopesChange(selectedScopes.filter(id => id !== scopeId));
  };

  const removeAction = (actionId: string) => {
    onActionsChange(selectedActions.filter(id => id !== actionId));
  };

  const getSelectedScopeNames = () => {
    return scopes
      .filter(scope => selectedScopes.includes(scope.id))
      .map(scope => scope.name);
  };

  const getSelectedActionNames = () => {
    const allActions = scopes.flatMap(scope => scope.actions || []);
    return allActions
      .filter(action => selectedActions.includes(action.id))
      .map(action => `${action.scope_name || action.name}: ${action.name}`);
  };

  const getAvailableActionsByScope = (scopeId: string) => {
    const scope = scopes.find(s => s.id === scopeId);
    return scope?.actions || [];
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-[color:var(--text)]">
          {translationMounted ? t('intentConfiguration') : "Intent Configuration"}
        </label>
        <div className="animate-pulse bg-gray-200 h-20 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-[color:var(--text)]">
        {translationMounted ? t('intentConfiguration') : "Intent Configuration"}
      </label>

      {/* Nested Scopes with Actions */}
      <div className="space-y-3">
        {/* Selected summary */}
        {(selectedScopes.length > 0 || selectedActions.length > 0) && (
          <div className="text-xs text-gray-600">
            <span className="mr-4">{translationMounted ? t('scopes') : "Scopes"}: {selectedScopes.length}/{maxScopes}</span>
            <span>{translationMounted ? t('actions') : "Actions"}: {selectedActions.length}/{maxActions}</span>
          </div>
        )}

        <div className="border border-gray-300 rounded-md p-3 max-h-[28rem] overflow-y-auto">
          <div className="space-y-2">
            {scopes.map((scope) => (
              <div key={scope.id} className="border border-gray-200 rounded-md">
                <div className="flex items-center justify-between p-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      disabled={!selectedScopes.includes(scope.id) && selectedScopes.length >= maxScopes}
                    />
                    <span className="text-sm font-medium">{scope.name}</span>
                    <span className="text-xs text-gray-500">({scope.actions?.length || 0} actions)</span>
                  </label>
                </div>
                {/* Actions nested under each scope */}
                {selectedScopes.includes(scope.id) && (
                  <div className="border-t border-gray-200 p-2 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {getAvailableActionsByScope(scope.id).map((action) => (
                        <label
                          key={action.id}
                          className="flex items-center gap-2 p-1 rounded hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={selectedActions.includes(action.id)}
                            onChange={() => toggleAction(action.id)}
                            disabled={!selectedActions.includes(action.id) && selectedActions.length >= maxActions}
                          />
                          <span className="text-sm">{action.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500">
        {translationMounted ? t('selectScopeToReveal') : "Select a scope to reveal its available actions."}
      </div>
    </div>
  );
}
