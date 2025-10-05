import { promises as fs } from 'fs';
import path from 'path';

export async function fsWriteTextHandler(params: {
  filePath: string;
  content: string;
  encoding?: string;
  append?: boolean;
}) {
  const { filePath, content, encoding = 'utf-8', append = false } = params;
  
  // Validate parameters
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path is required and must be a string');
  }
  if (content === undefined || content === null) {
    throw new Error('Content is required');
  }
  
  // Security: Prevent directory traversal attacks
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
    throw new Error('Invalid file path: directory traversal not allowed');
  }
  
  // Validate encoding
  const validEncodings = ['utf8', 'utf-8', 'ascii', 'base64', 'hex', 'latin1'];
  if (!validEncodings.includes(encoding.toLowerCase())) {
    throw new Error(`Invalid encoding: ${encoding}. Supported encodings: ${validEncodings.join(', ')}`);
  }
  
  try {
    // Ensure directory exists
    const dir = path.dirname(normalizedPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Convert content to string if it's not already
    const contentString = typeof content === 'string' ? content : String(content);
    
    // Write file content
    const writeFlag = append ? 'a' : 'w';
    await fs.writeFile(normalizedPath, contentString, { 
      encoding: encoding as BufferEncoding, 
      flag: writeFlag 
    });
    
    // Get file stats after writing
    const stats = await fs.stat(normalizedPath);
    
    return {
      success: true,
      filePath: normalizedPath,
      encoding,
      append,
      contentLength: contentString.length,
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString(),
      message: `Successfully ${append ? 'appended to' : 'wrote'} file: ${normalizedPath}`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'EACCES') {
        throw new Error(`Permission denied: ${normalizedPath}`);
      } else if (nodeError.code === 'ENOSPC') {
        throw new Error(`No space left on device: ${normalizedPath}`);
      } else if (nodeError.code === 'EMFILE' || nodeError.code === 'ENFILE') {
        throw new Error(`Too many open files: ${normalizedPath}`);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'File write failed',
      filePath: normalizedPath,
      encoding,
      append,
      contentLength: typeof content === 'string' ? content.length : String(content).length,
      timestamp: new Date().toISOString()
    };
  }
}
