'use server';

import * as fs from 'fs';
import * as path from 'path';
import { ConversationLogEntry } from './logger';
import { createLogger } from './logger';

// Create a logger instance
const logger = createLogger('ServerLogger');

// Use environment variable to control file logging
const FILE_LOGGING_ENABLED = process.env.FILE_LOGGING_ENABLED !== 'false';

/**
 * Check if file logging is enabled
 */
export async function isFileLoggingEnabled(): Promise<boolean> {
  return FILE_LOGGING_ENABLED;
}

/**
 * Ensure the logs directory exists
 */
export async function ensureLogsDirectory(): Promise<string> {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
      logger.log(`Created logs directory: ${logsDir}`);
    } catch (error) {
      logger.error(`Failed to create logs directory: ${error}`);
    }
  }
  
  return logsDir;
}

/**
 * Log a conversation entry to a file
 */
export async function logEntryToFile(entry: ConversationLogEntry): Promise<boolean> {
  const enabled = await isFileLoggingEnabled();
  if (!enabled) {
    return false;
  }
  
  try {
    // Make sure audioDuration is explicitly included in the log entry if available
    if (entry.tokenUsage?.audioDuration !== undefined && entry.audioDuration === undefined) {
      entry.audioDuration = entry.tokenUsage.audioDuration;
    }
    
    // Create ISO date string YYYY-MM-DD for grouping logs by date
    const dateKey = entry.timestamp.split('T')[0];
    
    // Ensure logs directory exists
    const logsDir = await ensureLogsDirectory();
    const logFilePath = path.join(logsDir, `${dateKey}.jsonl`);
    
    // Append the entry as a JSON line
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(logFilePath, logLine);
    
    // Log success
    // logger.debug(`Saved log entry to file: ${logFilePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to write log to file: ${error}`);
    return false;
  }
}

/**
 * Read logs directly from file for a specific date
 */
export async function readLogsFromFile(dateString: string): Promise<ConversationLogEntry[]> {
  const enabled = await isFileLoggingEnabled();
  if (!enabled) {
    return [];
  }
  
  try {
    // Ensure logs directory exists
    const logsDir = await ensureLogsDirectory();
    const logFilePath = path.join(logsDir, `${dateString}.jsonl`);
    
    if (!fs.existsSync(logFilePath)) {
      return [];
    }
    
    // Read file content
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    
    // Parse each line as a JSON object
    const entries: ConversationLogEntry[] = fileContent
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line) as ConversationLogEntry);
    
    return entries;
  } catch (error) {
    logger.error(`Failed to read logs from file: ${error}`);
    return [];
  }
}

/**
 * Get all log files
 */
export async function getAllLogFiles(): Promise<string[]> {
  try {
    // Ensure logs directory exists
    const logsDir = await ensureLogsDirectory();
    
    // Get all .jsonl files in the logs directory
    return fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.jsonl'))
      .map(file => file.replace('.jsonl', ''));
  } catch (error) {
    logger.error(`Failed to get log files: ${error}`);
    return [];
  }
} 