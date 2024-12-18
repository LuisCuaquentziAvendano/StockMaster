export const PORT = process.env.PORT || 3000;
export const API_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
export const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:3001`;
export const DB_URL = process.env.DB_URL;
export const JWT_KEY = process.env.JWT_KEY;
export const STRIPE_KEY = process.env.STRIPE_KEY;
export const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
export const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
export const S3_REGION = process.env.S3_REGION;
export const S3_BUCKET = process.env.S3_BUCKET;
export const GOOGLE_ID = process.env.GOOGLE_ID;
export const GOOGLE_SECRET = process.env.GOOGLE_SECRET;
export const SECRET_KEY = process.env.SECRET_KEY;
export const EMAIL_HOST = process.env.EMAIL_HOST;
export const EMAIL_PORT = process.env.EMAIL_PORT;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;