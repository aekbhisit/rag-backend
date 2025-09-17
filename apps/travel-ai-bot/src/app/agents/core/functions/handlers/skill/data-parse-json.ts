export async function dataParseJSONHandler(params: {
  jsonData: string;
  schema?: any;
  strict?: boolean;
}) {
  const { jsonData, schema, strict = false } = params;
  
  // Validate JSON data
  if (!jsonData || typeof jsonData !== 'string') {
    throw new Error('JSON data is required and must be a string');
  }
  
  try {
    // Parse JSON data
    let parsedData: any;
    
    if (strict) {
      // Strict parsing - only allow valid JSON
      parsedData = JSON.parse(jsonData);
    } else {
      // Lenient parsing - try to clean up common issues
      const cleanedJson = jsonData
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"');  // Convert single quotes to double quotes
      
      parsedData = JSON.parse(cleanedJson);
    }
    
    // Basic schema validation if schema is provided
    let isValid = true;
    let validationErrors: string[] = [];
    
    if (schema && typeof schema === 'object') {
      const validation = validateAgainstSchema(parsedData, schema);
      isValid = validation.isValid;
      validationErrors = validation.errors;
    }
    
    return {
      success: true,
      strict,
      hasSchema: !!schema,
      parsedData,
      isValid,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      dataType: getDataType(parsedData),
      dataSize: JSON.stringify(parsedData).length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON parsing failed',
      strict,
      hasSchema: !!schema,
      parsedData: null,
      isValid: false,
      timestamp: new Date().toISOString()
    };
  }
}

// Helper function to validate data against a simple schema
function validateAgainstSchema(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Basic type validation
    if (schema.type) {
      const actualType = getDataType(data);
      if (actualType !== schema.type) {
        errors.push(`Expected type '${schema.type}', got '${actualType}'`);
      }
    }
    
    // Required fields validation
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((field: string) => {
        if (!(field in data)) {
          errors.push(`Required field '${field}' is missing`);
        }
      });
    }
    
    // Properties validation
    if (schema.properties && typeof schema.properties === 'object') {
      Object.keys(schema.properties).forEach(key => {
        if (key in data) {
          const fieldSchema = schema.properties[key];
          if (fieldSchema.type) {
            const fieldType = getDataType(data[key]);
            if (fieldType !== fieldSchema.type) {
              errors.push(`Field '${key}' expected type '${fieldSchema.type}', got '${fieldType}'`);
            }
          }
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

// Helper function to get data type
function getDataType(data: any): string {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  if (typeof data === 'object') return 'object';
  return typeof data;
}
