/**
 * OCR Service for Ticket Data Extraction
 * 
 * This service processes ticket images and extracts structured data using:
 * - Tesseract.js for basic OCR
 * - OpenAI GPT Vision API for intelligent field extraction
 * - Custom parsing algorithms for ticket-specific patterns
 */

import { OCRData, TicketCategory } from '@/app/types/marketplace';
// import { callOai } from './callOai'; // Commented out for now

interface OCRConfig {
  enableGPTVision: boolean;
  enableTesseract: boolean;
  confidenceThreshold: number;
  maxImageSize: number; // MB
}

const DEFAULT_CONFIG: OCRConfig = {
  enableGPTVision: true,
  enableTesseract: true,
  confidenceThreshold: 0.7,
  maxImageSize: 10
};

/**
 * Main OCR Service Class
 */
export class OCRService {
  private config: OCRConfig;

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process ticket image and extract data
   */
  async processTicketImage(
    imageFile: File | string, // File object or base64 string
    userId?: string
  ): Promise<OCRData> {
    const startTime = Date.now();
    
    try {
      // Validate image
      await this.validateImage(imageFile);

      // Convert to base64 if needed
      const imageData = await this.prepareImage(imageFile);
      
      // Extract text using multiple methods
      const extractionResults = await Promise.allSettled([
        this.config.enableGPTVision ? this.extractWithGPTVision(imageData) : null,
        this.config.enableTesseract ? this.extractWithTesseract(imageData) : null
      ]);

      // Combine and process results
      const combinedResults = this.combineExtractionResults(extractionResults);
      
      // Parse structured data
      const structuredData = await this.parseTicketData(combinedResults.text);
      
      // Calculate confidence and quality
      const confidence = this.calculateConfidence(combinedResults, structuredData);
      const imageQuality = this.assessImageQuality(combinedResults);

      const processingTime = Date.now() - startTime;

      return {
        extractedText: combinedResults.text,
        confidence,
        detectedFields: structuredData,
        processingInfo: {
          processedAt: new Date().toISOString(),
          processingTimeMs: processingTime,
          imageQuality
        }
      };

    } catch (error) {
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract ticket data using GPT Vision API
   */
  private async extractWithGPTVision(imageData: string): Promise<{
    text: string;
    structured: any;
    confidence: number;
  }> {
    const prompt = `
You are an expert at extracting ticket information from images. Analyze this ticket image and extract the following information in JSON format:

{
  "eventName": "Name of the event/show/game",
  "date": "Date in YYYY-MM-DD format",
  "time": "Time in HH:MM format",
  "venue": "Venue/stadium/theater name",
  "location": "City and venue address",
  "section": "Section number/name",
  "row": "Row number/letter",
  "seat": "Seat number(s)",
  "price": "Original ticket price as number",
  "category": "One of: CONCERT, SPORTS, THEATER, COMEDY, FESTIVAL, CONFERENCE, OTHER",
  "performer": "Main performer/team names",
  "gateInfo": "Gate/entrance information",
  "restrictions": "Any restrictions or notes",
  "barcode": "If visible, barcode number",
  "ticketType": "General admission, VIP, etc."
}

Only extract information that is clearly visible and readable. Use null for fields not visible in the image.
Provide the raw extracted text first, then the structured JSON.

RAW TEXT:
[Extract all visible text here]

STRUCTURED JSON:
[Provide the JSON structure above]
`;

    try {
      // Mock callOai function
      const callOai = async (params: any) => {
        return { choices: [{ message: { content: '' } }] };
      };
      
      const response = await callOai({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/jpeg;base64,${imageData}`,
                  detail: 'high'
                } 
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });
      
      const content = response.choices[0]?.message?.content || '';
      
      // Parse the response
      const sections = content.split('STRUCTURED JSON:');
      const rawText = sections[0]?.replace('RAW TEXT:', '').trim() || '';
      
      let structured = {};
      let confidence = 0.5;

      if (sections[1]) {
        try {
          const jsonStr = sections[1].trim().replace(/```json\n?|\n?```/g, '');
          structured = JSON.parse(jsonStr);
          confidence = 0.9; // High confidence for GPT Vision
        } catch (e) {
          console.warn('Failed to parse GPT Vision JSON response:', e);
        }
      }

      return {
        text: rawText,
        structured,
        confidence
      };

    } catch (error) {
      console.error('GPT Vision extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract text using Tesseract OCR (fallback method)
   */
  private async extractWithTesseract(imageData: string): Promise<{
    text: string;
    confidence: number;
  }> {
    // Note: In a real implementation, you'd use Tesseract.js here
    // For now, we'll implement a basic text extraction simulation
    
    try {
      // This would be replaced with actual Tesseract.js implementation
      // const { createWorker } = require('tesseract.js');
      // const worker = await createWorker();
      // const { data } = await worker.recognize(`data:image/jpeg;base64,${imageData}`);
      // await worker.terminate();
      
      // Simulated extraction for now
      return {
        text: "Simulated OCR extraction - replace with actual Tesseract.js implementation",
        confidence: 0.6
      };
      
    } catch (error) {
      console.error('Tesseract extraction failed:', error);
      return {
        text: '',
        confidence: 0
      };
    }
  }

  /**
   * Parse extracted text into structured ticket data
   */
  private async parseTicketData(text: string): Promise<Record<string, any>> {
    const fields: Record<string, any> = {};

    // Date patterns
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g
    ];

    // Time patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s?(AM|PM)/gi,
      /(\d{1,2}):(\d{2})/g
    ];

    // Price patterns
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/g,
      /(\d+(?:\.\d{2})?)\s?USD/gi,
      /Price:?\s?\$?(\d+(?:\.\d{2})?)/gi
    ];

    // Section/Row/Seat patterns
    const seatPatterns = [
      /Section:?\s?([A-Z0-9]+)/gi,
      /Row:?\s?([A-Z0-9]+)/gi,
      /Seat:?\s?([A-Z0-9\-,\s]+)/gi
    ];

    // Extract dates
    for (const pattern of datePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        fields.date = this.parseDate(matches[0][0]);
        break;
      }
    }

    // Extract times
    for (const pattern of timePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        fields.time = matches[0][0];
        break;
      }
    }

    // Extract prices
    for (const pattern of pricePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        fields.price = parseFloat(matches[0][1]);
        break;
      }
    }

    // Extract seating information
    const sectionMatch = text.match(/Section:?\s?([A-Z0-9]+)/i);
    if (sectionMatch) fields.section = sectionMatch[1];

    const rowMatch = text.match(/Row:?\s?([A-Z0-9]+)/i);
    if (rowMatch) fields.row = rowMatch[1];

    const seatMatch = text.match(/Seat:?\s?([A-Z0-9\-,\s]+)/i);
    if (seatMatch) fields.seat = seatMatch[1];

    // Extract venue (typically in all caps or after "at")
    const venuePatterns = [
      /at\s+([A-Z\s&]{3,})/gi,
      /venue:?\s?([A-Za-z\s&]{3,})/gi
    ];

    for (const pattern of venuePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 0) {
        fields.venue = matches[0][1].trim();
        break;
      }
    }

    return fields;
  }

  /**
   * Combine results from multiple extraction methods
   */
  private combineExtractionResults(results: PromiseSettledResult<any>[]): {
    text: string;
    structured: any;
    confidence: number;
  } {
    let bestResult = { text: '', structured: {}, confidence: 0 };

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.confidence > bestResult.confidence) {
          bestResult = result.value;
        }
      }
    }

    return bestResult;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    extractionResult: any,
    structuredData: any
  ): number {
    let confidence = extractionResult.confidence || 0;

    // Boost confidence based on extracted fields
    const fieldCount = Object.keys(structuredData).length;
    const fieldBonus = Math.min(fieldCount * 0.1, 0.3);
    
    // Check for key fields
    if (structuredData.eventName) confidence += 0.1;
    if (structuredData.date) confidence += 0.1;
    if (structuredData.venue) confidence += 0.1;
    if (structuredData.price) confidence += 0.05;

    return Math.min(confidence + fieldBonus, 1.0);
  }

  /**
   * Assess image quality
   */
  private assessImageQuality(extractionResult: any): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    const confidence = extractionResult.confidence || 0;
    
    if (confidence >= 0.9) return 'EXCELLENT';
    if (confidence >= 0.7) return 'GOOD';
    if (confidence >= 0.5) return 'FAIR';
    return 'POOR';
  }

  /**
   * Validate uploaded image
   */
  public async validateImage(imageFile: File | string): Promise<void> {
    if (typeof imageFile === 'string') {
      // Base64 validation
      if (!imageFile.match(/^data:image\/(jpeg|jpg|png|gif);base64,/)) {
        throw new Error('Invalid image format. Must be JPEG, PNG, or GIF');
      }
    } else {
      // File validation
      if (!imageFile.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
        throw new Error('Invalid file type. Must be JPEG, PNG, or GIF');
      }

      if (imageFile.size > this.config.maxImageSize * 1024 * 1024) {
        throw new Error(`File too large. Maximum size is ${this.config.maxImageSize}MB`);
      }
    }
  }

  /**
   * Convert image to base64
   */
  private async prepareImage(imageFile: File | string): Promise<string> {
    if (typeof imageFile === 'string') {
      // Extract base64 data from data URL
      return imageFile.split(',')[1];
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Parse date string to ISO format
   */
  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  }

  /**
   * Detect ticket category based on text content
   */
  static detectCategory(text: string): TicketCategory {
    const lowerText = text.toLowerCase();

    if (lowerText.match(/concert|tour|music|band|artist|festival/)) return 'CONCERT';
    if (lowerText.match(/football|soccer|basketball|baseball|hockey|sport|game|match/)) return 'SPORTS';
    if (lowerText.match(/theater|theatre|play|musical|broadway/)) return 'THEATER';
    if (lowerText.match(/comedy|stand.?up|comedian/)) return 'COMEDY';
    if (lowerText.match(/festival|fair|expo/)) return 'FESTIVAL';
    if (lowerText.match(/conference|summit|seminar|workshop/)) return 'CONFERENCE';

    return 'OTHER';
  }

  /**
   * Enhance extracted data with AI analysis
   */
  async enhanceExtractedData(ocrData: OCRData, userInput?: any): Promise<OCRData> {
    try {
      const enhancementPrompt = `
Based on the OCR extracted text and detected fields, enhance and validate the ticket information:

Original Text: ${ocrData.extractedText}
Detected Fields: ${JSON.stringify(ocrData.detectedFields)}

Please provide enhanced information in JSON format:
- Correct any obvious errors
- Fill in missing information if derivable
- Standardize formats (dates, times, etc.)
- Suggest category if not detected
- Validate venue and location information

Return only the enhanced fields JSON.
      `;

      // const response = await callOai({
      //   model: 'gpt-4',
      //   messages: [{ role: 'user', content: enhancementPrompt }],
      //   max_tokens: 500,
      //   temperature: 0.1
      // });
      
      // Mock implementation for development
      const response = {
        choices: [{
          message: {
            content: JSON.stringify(ocrData.detectedFields)
          }
        }]
      };
      
      const enhancedFields = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        ...ocrData,
        detectedFields: {
          ...ocrData.detectedFields,
          ...enhancedFields
        },
        confidence: Math.min(ocrData.confidence + 0.1, 1.0)
      };

    } catch (error) {
      console.warn('Failed to enhance OCR data:', error);
      return ocrData;
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService();

// Export utility functions
export const ocrUtils = {
  detectCategory: OCRService.detectCategory,
  validateTicketImage: async (file: File): Promise<boolean> => {
    try {
      await new OCRService().validateImage(file);
      return true;
    } catch {
      return false;
    }
  }
};