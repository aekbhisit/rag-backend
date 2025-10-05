export async function dataParseCSVHandler(params: {
  csvData: string;
  delimiter?: string;
  hasHeader?: boolean;
}) {
  const { csvData, delimiter = ',', hasHeader = true } = params;
  
  // Validate CSV data
  if (!csvData || typeof csvData !== 'string') {
    throw new Error('CSV data is required and must be a string');
  }
  
  try {
    // Split CSV data into lines
    const lines = csvData.trim().split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: true,
        delimiter,
        hasHeader,
        rows: [],
        totalRows: 0,
        columns: [],
        timestamp: new Date().toISOString()
      };
    }
    
    // Parse CSV lines
    const rows: any[] = [];
    let columns: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line, delimiter);
      
      if (i === 0 && hasHeader) {
        // First line is header
        columns = values.map(col => col.trim());
      } else {
        // Data row
        const row: any = {};
        if (hasHeader && columns.length > 0) {
          // Use column names as keys
          columns.forEach((col, index) => {
            row[col] = values[index] ? values[index].trim() : '';
          });
        } else {
          // Use index as keys
          values.forEach((value, index) => {
            row[`column_${index}`] = value ? value.trim() : '';
          });
        }
        rows.push(row);
      }
    }
    
    // If no header was specified, generate column names
    if (!hasHeader && rows.length > 0) {
      const firstRow = rows[0];
      columns = Object.keys(firstRow);
    }
    
    return {
      success: true,
      delimiter,
      hasHeader,
      rows,
      totalRows: rows.length,
      columns,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CSV parsing failed',
      delimiter,
      hasHeader,
      rows: [],
      totalRows: 0,
      columns: [],
      timestamp: new Date().toISOString()
    };
  }
}

// Helper function to parse a single CSV line, handling quoted values
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}
