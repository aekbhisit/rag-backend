'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BACKEND_URL } from '../../../../../../../components/config';

interface ToolData {
  id: string;
  agent_key: string;
  tool_key: string;
  alias?: string;
  enabled: boolean;
  position: number;
  arg_defaults: Record<string, any>;
  arg_templates: Record<string, any>;
  guardrails: Record<string, any>;
  overrides: Record<string, any>;
  function_name?: string;
  function_description?: string;
  function_parameters?: {
    type: string;
    properties: Record<string, {
      type: string | string[];
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  parameter_mapping?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface ToolRegistryEntry {
  tool_key: string;
  name: string;
  description: string;
  category: string;
  runtime: string;
  handler_key: string;
  input_schema: any;
  output_schema: any;
  default_settings: any;
  permissions: string[];
  version: string;
  is_enabled: boolean;
}

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

export default function ToolTestPage() {
  const params = useParams();
  const router = useRouter();
  const { agentKey, toolId } = params;

  const [toolData, setToolData] = useState<ToolData | null>(null);
  const [toolRegistry, setToolRegistry] = useState<ToolRegistryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Load tool data
  useEffect(() => {
    const loadToolData = async () => {
      try {
        // Load tool configuration
        const toolResponse = await fetch(`${BACKEND_URL}/api/admin/agents/${agentKey}/tools/${toolId}`);
        if (!toolResponse.ok) throw new Error('Failed to load tool');
        const tool = await toolResponse.json();
        setToolData(tool);

        // Load tool registry entry
        const registryResponse = await fetch(`${BACKEND_URL}/api/admin/tool-registry`);
        if (!registryResponse.ok) throw new Error('Failed to load tool registry');
        const registry = await registryResponse.json();
        const toolEntry = registry.find((entry: ToolRegistryEntry) => entry.tool_key === tool.tool_key);
        setToolRegistry(toolEntry || null);

        // Initialize test parameters based on AI function configuration
        const initialParams: Record<string, string> = {};
        if (tool.function_parameters?.properties) {
          Object.keys(tool.function_parameters.properties).forEach(key => {
            initialParams[key] = '';
          });
        }
        setTestParams(initialParams);

      } catch (error) {
        console.error('Error loading tool data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (agentKey && toolId) {
      loadToolData();
    }
  }, [agentKey, toolId]);

  // Generate test API call
  const generateTestApiCall = () => {
    if (!toolData || !toolRegistry) return null;

    const baseUrl = toolData.arg_defaults?.api_endpoint || '/api/rag/summary';
    const method = toolData.arg_defaults?.method || 'POST';

    // Generate request body by mapping AI function parameters to tool parameters
    let requestBody = { ...toolData.arg_defaults };
    
    // Use parameter mapping to transform AI function parameters to tool parameters
    if (toolData.parameter_mapping) {
      Object.entries(testParams).forEach(([aiParamName, paramValue]) => {
        if (paramValue.trim()) {
          // Find the corresponding tool parameter name from the mapping
          const toolParamName = toolData.parameter_mapping![aiParamName];
          if (toolParamName) {
            // Set the tool parameter with the AI parameter value
            requestBody[toolParamName] = paramValue;
          }
        }
      });
    } else {
      // Fallback: try to replace parameter placeholders with test values
      Object.entries(testParams).forEach(([paramName, paramValue]) => {
        if (paramValue.trim()) {
          // Replace in request body
          const bodyStr = JSON.stringify(requestBody);
          const updatedBodyStr = bodyStr.replace(
            new RegExp(`\\$\\{${paramName}\\}`, 'g'),
            paramValue
          );
          requestBody = JSON.parse(updatedBodyStr);
        }
      });
    }

    return {
      method,
      url: `${BACKEND_URL}${baseUrl}`,
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user'
      },
      body: requestBody
    };
  };

  // Execute tool test using skill handler
  const executeTest = async () => {
    if (!toolData) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Use the new skill handler endpoint instead of direct API calls
      const response = await fetch(`${BACKEND_URL}/api/admin/tool-test/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user'
        },
        body: JSON.stringify({
          toolId: toolData.id,
          testParams: testParams
        })
      });

      const responseData = await response.json();

      setTestResult({
        success: response.ok && responseData.success,
        data: responseData,
        error: response.ok ? undefined : responseData.error || 'Unknown error',
        executionTime: responseData.executionTime
      });

    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTesting(false);
    }
  };

  // Clear test results
  const clearResults = () => {
    setTestResult(null);
    setTestParams({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading tool data...</div>
      </div>
    );
  }

  if (!toolData || !toolRegistry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Tool not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🧪 Test Tool: {toolRegistry.name}
              </h1>
              <p className="text-gray-600 mt-2">
                Test tool execution from AI perspective
              </p>
            </div>
            <button
              onClick={() => router.push(`/admin/agents/${agentKey}/tools`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              ← Back to Tools
            </button>
          </div>
        </div>

        {/* Tool Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tool Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tool Name</label>
              <p className="text-gray-900">{toolRegistry.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tool Key</label>
              <p className="text-gray-900 font-mono">{toolData.tool_key}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alias</label>
              <p className="text-gray-900">{toolData.alias || 'None'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                toolData.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {toolData.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          {toolRegistry.description && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-900">{toolRegistry.description}</p>
            </div>
          )}
        </div>

        {/* Test Parameters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Parameters</h2>
          <p className="text-gray-600 mb-4">
            Enter test values for the AI function parameters. These simulate what the AI would provide when calling this function.
          </p>
          
          {Object.keys(testParams).length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="font-semibold text-yellow-800">No AI Function Parameters Defined</span>
              </div>
              <p className="text-yellow-700 mb-3">
                This tool doesn't have AI function parameters configured yet. To test this tool from the AI perspective, you need to:
              </p>
              <ol className="list-decimal list-inside text-yellow-700 space-y-1 mb-4">
                <li>Go to the Edit page for this tool</li>
                <li>Configure the AI Function parameters</li>
                <li>Save the tool configuration</li>
                <li>Return here to test the tool</li>
              </ol>
              <button
                onClick={() => router.push(`/admin/agents/${agentKey}/tools/${toolId}/edit`)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Go to Edit Page
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(testParams).map(([paramName, paramValue]) => {
                const paramInfo = toolData?.function_parameters?.properties[paramName];
                const isRequired = toolData?.function_parameters?.required?.includes(paramName);
                const paramType = Array.isArray(paramInfo?.type) ? paramInfo.type[0] : paramInfo?.type || 'string';
                
                return (
                  <div key={paramName}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {paramName}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-gray-500 ml-2">({paramType})</span>
                    </label>
                    {paramInfo?.description && (
                      <p className="text-sm text-gray-600 mb-2">{paramInfo.description}</p>
                    )}
                    {paramInfo?.enum ? (
                      <select
                        value={paramValue}
                        onChange={(e) => setTestParams(prev => ({
                          ...prev,
                          [paramName]: e.target.value
                        }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select {paramName}</option>
                        {paramInfo.enum.map(enumValue => (
                          <option key={enumValue} value={enumValue}>{enumValue}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={paramType === 'number' ? 'number' : 'text'}
                        value={paramValue}
                        onChange={(e) => setTestParams(prev => ({
                          ...prev,
                          [paramName]: e.target.value
                        }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Enter value for ${paramName}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex space-x-3 mt-6">
            <button
              onClick={executeTest}
              disabled={testing || Object.keys(testParams).length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Testing...
                </>
              ) : (
                <>
                  🚀 Execute Test
                </>
              )}
            </button>
            <button
              onClick={clearResults}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            <div className={`p-4 rounded-lg mb-4 ${
              testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <span className="text-green-600">✅</span>
                ) : (
                  <span className="text-red-600">❌</span>
                )}
                <span className={`font-semibold ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.success ? 'Test Successful' : 'Test Failed'}
                </span>
                {testResult.executionTime && (
                  <span className="text-sm text-gray-600">
                    ({testResult.executionTime}ms)
                  </span>
                )}
              </div>
              
              {testResult.error && (
                <div className="text-red-700 mb-2">
                  <strong>Error:</strong> {testResult.error}
                </div>
              )}
            </div>

            {/* Skill Handler Execution Flow */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Skill Handler Execution Flow</h3>
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium">1. AI Function Call</span>
                    <span className="text-xs text-gray-600">({testResult.data?.tool?.function_name})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium">2. Parameter Mapping Applied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium">3. Skill Handler Executed</span>
                    <span className="text-xs text-gray-600">({testResult.data?.tool?.tool_key})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium">4. API Call Made</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-sm font-medium">5. Response Processed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameter Mapping Details */}
            {testResult.data?.parameterMapping && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Parameter Mapping Details</h3>
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">AI Function Parameters:</h4>
                      <pre className="text-xs bg-white p-2 rounded border">
                        {JSON.stringify(testResult.data.parameterMapping.original, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">Mapped Parameters:</h4>
                      <pre className="text-xs bg-white p-2 rounded border">
                        {JSON.stringify(testResult.data.parameterMapping.mapped, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Skill Handler Result */}
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Skill Handler Result</h3>
              <div className="bg-gray-100 rounded p-4 font-mono text-sm">
                <pre>{JSON.stringify(testResult.data?.result, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
