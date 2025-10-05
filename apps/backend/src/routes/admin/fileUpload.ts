import { Router } from 'express';
import { secureUpload, fileUploadSecurityMiddleware } from '../../middleware/fileUploadSecurity';
import { jwtAuthMiddleware, requireJWT, requireRole } from '../../middleware/jwtAuth';

const router = Router();

// All file upload routes require admin authentication
router.use(jwtAuthMiddleware as any);
router.use(requireJWT as any);
router.use(requireRole('admin') as any);

// Example file upload endpoint
router.post('/upload', 
  secureUpload.single('file'),
  fileUploadSecurityMiddleware,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      res.json({
        message: 'File uploaded successfully',
        file: {
          originalname: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Multiple file upload endpoint
router.post('/upload-multiple', 
  secureUpload.array('files', 5),
  fileUploadSecurityMiddleware,
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      res.json({
        message: 'Files uploaded successfully',
        files: files.map(file => ({
          originalname: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
        })),
        count: files.length
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as fileUploadRouter };
