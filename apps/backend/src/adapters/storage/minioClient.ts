import MinioClient from 'minio';

let client: MinioClient | null = null;

export function getMinio() {
  if (!client) {
    // Don't create client in development mode unless explicitly configured
    if (process.env.NODE_ENV === 'development' && !process.env.MINIO_ENDPOINT) {
      throw new Error('MinIO disabled in development mode');
    }
    
    client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: false,
      accessKey: process.env.MINIO_ROOT_USER || 'minio',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio123',
    });
  }
  return client;
}

export async function init() {
  try {
    // Only initialize MinIO if explicitly configured
    if (!process.env.MINIO_ENDPOINT || process.env.NODE_ENV === 'development') {
      console.log('MinIO not configured or in development mode, skipping initialization');
      return;
    }
    
    const c = getMinio();
    const bucket = process.env.MINIO_BUCKET || 'uploads';
    
    // MinIO v1.0.0 still uses callback-style API, so we'll wrap it in a Promise
    try {
      const exists = await new Promise<boolean>((resolve, reject) => {
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => reject(new Error('MinIO connection timeout')), 5000);
        
        c.bucketExists(bucket, (err, exists) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve(exists);
        });
      });
      
      if (!exists) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('MinIO bucket creation timeout')), 5000);
          
          c.makeBucket(bucket, 'us-east-1', (err) => {
            clearTimeout(timeout);
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`MinIO bucket '${bucket}' created successfully`);
      } else {
        console.log(`MinIO bucket '${bucket}' already exists`);
      }
      console.log('MinIO initialized successfully');
    } catch (bucketError) {
      console.warn('MinIO bucket operation failed (continuing without file storage):', bucketError.message);
    }
  } catch (error) {
    console.warn('MinIO initialization failed, continuing without file storage:', error);
  }
}

export async function health() {
  try {
    if (!process.env.MINIO_ENDPOINT || process.env.NODE_ENV === 'development') {
      return { status: 'disabled' as const, message: 'MinIO not configured or in development mode' };
    }
    
    const c = getMinio();
    // Wrap callback-style API in Promise with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MinIO health check timeout')), 3000);
      
      c.listBuckets((err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    });
    return { status: 'ok' as const };
  } catch (e) {
    return { status: 'error' as const, error: (e as Error).message };
  }
}


