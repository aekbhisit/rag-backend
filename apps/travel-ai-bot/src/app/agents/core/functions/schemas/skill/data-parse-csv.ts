export const dataParseCSVSchema = {
  name: 'dataParseCSV',
  description: 'Parse CSV data and convert to structured format',
  parameters: {
    type: 'object',
    properties: {
      csvData: {
        type: 'string',
        description: 'CSV data to parse'
      },
      delimiter: {
        type: 'string',
        description: 'CSV delimiter character',
        default: ','
      },
      hasHeader: {
        type: 'boolean',
        description: 'Whether CSV has header row',
        default: true
      }
    },
    required: ['csvData']
  }
};
