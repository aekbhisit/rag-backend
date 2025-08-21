import MinioClient from 'minio';

console.log('✅ MinIO import successful');
console.log('MinIO Client constructor:', typeof MinioClient);

try {
  const client = new MinioClient({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minio',
    secretKey: 'minio123',
  });
  console.log('✅ MinIO Client instantiation successful');
  console.log('Client type:', typeof client);
} catch (error) {
  console.error('❌ MinIO Client instantiation failed:', error);
}
