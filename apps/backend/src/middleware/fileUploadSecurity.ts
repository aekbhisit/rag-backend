import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'text/csv',
];

const maxFileSize = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

export const secureUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 5, // Max 5 files per request
  },
});

export function fileUploadSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Additional file validation
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    for (const file of files) {
      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.json', '.csv'];
      
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: 'Invalid file extension' });
      }
      
      // Check file size again (double check)
      if (file.size > maxFileSize) {
        return res.status(400).json({ error: 'File too large' });
      }
    }
  }
  
  next();
}
