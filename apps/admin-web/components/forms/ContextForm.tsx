"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Select } from "../ui/Select";
import { Switch } from "../ui/Switch";
import { Card } from "../Card";

export interface ContextFormData {
  id?: string;
  type: "place" | "website" | "ticket" | "document" | "text";
  title: string;
  body: string;
  instruction?: string;
  trust_level: number;
  language?: string;
  attributes: Record<string, any>;
  intent_scopes?: string[];
  status?: string;
}

interface EditHistoryItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  description: string;
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
}

interface ContextFormProps {
  initialData?: Partial<ContextFormData>;
  onSubmit: (data: ContextFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  editHistory?: EditHistoryItem[];
}

export function ContextForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  editHistory = []
}: ContextFormProps) {
  const [formData, setFormData] = useState<ContextFormData>({
    type: "website",
    title: "",
    body: "",
    instruction: "",
    trust_level: 3,
    language: "en",
    attributes: { analyze: true },
    intent_scopes: [],
    status: "active",
    ...initialData
  });

  const [intentScopeInput, setIntentScopeInput] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleInputChange = (field: keyof ContextFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAttributeChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value
      }
    }));
  };

  const addIntentScope = () => {
    if (intentScopeInput.trim() && !formData.intent_scopes?.includes(intentScopeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        intent_scopes: [...(prev.intent_scopes || []), intentScopeInput.trim()]
      }));
      setIntentScopeInput("");
    }
  };

  const removeIntentScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      intent_scopes: prev.intent_scopes?.filter(s => s !== scope) || []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const contextTypeOptions = [
    { value: "place", label: "Place" },
    { value: "website", label: "Website" },
    { value: "ticket", label: "Ticket" },
    { value: "document", label: "Document" },
    { value: "text", label: "Text" }
  ];

  const trustLevelOptions = [
    { value: "1", label: "1 - Low" },
    { value: "2", label: "2 - Medium-Low" },
    { value: "3", label: "3 - Medium" },
    { value: "4", label: "4 - Medium-High" },
    { value: "5", label: "5 - High" }
  ];

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "th", label: "Thai" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" }
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select
                  value={formData.type}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                  options={contextTypeOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter context title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <Select
                  value={formData.language || "en"}
                  onChange={(e) => handleInputChange("language", e.target.value)}
                  options={languageOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Trust Level</label>
                <Select
                  value={formData.trust_level.toString()}
                  onChange={(e) => handleInputChange("trust_level", parseInt(e.target.value))}
                  options={trustLevelOptions}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Content */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Body</label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => handleInputChange("body", e.target.value)}
                  placeholder="Enter context body content"
                  rows={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Instruction (Optional)</label>
                <Textarea
                  value={formData.instruction || ""}
                  onChange={(e) => handleInputChange("instruction", e.target.value)}
                  placeholder="Enter specific instructions for this context"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Intent Scopes */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Intent Scopes</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={intentScopeInput}
                  onChange={(e) => setIntentScopeInput(e.target.value)}
                  placeholder="Enter intent scope"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIntentScope())}
                />
                <Button type="button" onClick={addIntentScope} variant="outline">
                  Add
                </Button>
              </div>
              {formData.intent_scopes && formData.intent_scopes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.intent_scopes.map((scope, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {scope}
                      <button
                        type="button"
                        onClick={() => removeIntentScope(scope)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Attributes */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Attributes</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Analyze</label>
                <Switch
                  checked={formData.attributes.analyze || false}
                  onCheckedChange={(checked) => handleAttributeChange("analyze", checked)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Custom Attributes (JSON)</label>
                <Textarea
                  value={JSON.stringify(formData.attributes, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleInputChange("attributes", parsed);
                    } catch {
                      // Invalid JSON, keep the text for editing
                    }
                  }}
                  placeholder="Enter custom attributes as JSON"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Edit History */}
        {editHistory && editHistory.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Edit History</h3>
              <div className="space-y-3">
                {editHistory.map((item) => (
                  <div key={item.id} className="border-l-2 border-gray-200 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{item.action}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        {item.changes && item.changes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.changes.map((change, idx) => (
                              <div key={idx} className="text-xs text-gray-500">
                                <span className="font-medium">{change.field}:</span>{" "}
                                <span className="line-through">{change.oldValue}</span> →{" "}
                                <span className="text-green-600">{change.newValue}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{item.user}</p>
                        <p>{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Context"}
          </Button>
        </div>
      </form>
    </div>
  );
}
