import { promises as fs } from 'fs';
import path from 'path';

export async function fsReadTextHandler(params: {
  filePath: string;
  encoding?: string;
  maxSize?: number;
}) {
  const { filePath, encoding = 'utf-8', maxSize = 1048576 } = params;
  
  // Validate file path
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path is required and must be a string');
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
    // Check if file exists
    const stats = await fs.stat(normalizedPath);
    
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${normalizedPath}`);
    }
    
    // Check file size against limit
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`);
    }
    
    // Read file content
    const content = await fs.readFile(normalizedPath, encoding as BufferEncoding);
    
    return {
      success: true,
      filePath: normalizedPath,
      encoding,
      content,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new Error(`File not found: ${normalizedPath}`);
      } else if (nodeError.code === 'EACCES') {
        throw new Error(`Permission denied: ${normalizedPath}`);
      } else if (nodeError.code === 'EISDIR') {
        throw new Error(`Path is a directory, not a file: ${normalizedPath}`);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'File read failed',
      filePath: normalizedPath,
      encoding,
      content: null,
      size: 0,
      timestamp: new Date().toISOString()
    };
  }
}
