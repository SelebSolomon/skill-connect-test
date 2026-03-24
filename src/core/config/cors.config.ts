type CorsCallback = (err: Error | null, allow?: boolean) => void;

const DEFAULT_DEV_ORIGIN = 'http://localhost:3000';
const DEFAULT_PROD_ORIGIN = 'https://skill-links.vercel.app';

function normalizeOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsOrigins(): string[] {
  const fromEnv = normalizeOrigins(process.env.CORS_ORIGINS);
  if (fromEnv.length > 0) return fromEnv;

  const isProd = process.env.NODE_ENV === 'production';
  const devOrigin = process.env.FRONTEND_URL_DEV ?? DEFAULT_DEV_ORIGIN;
  const prodOrigin = process.env.FRONTEND_URL_PROD ?? DEFAULT_PROD_ORIGIN;
  return isProd ? [prodOrigin] : [devOrigin];
}

export function corsOriginFn(origin: string | undefined, callback: CorsCallback) {
  // In production, reject requests with no Origin header to block non-browser clients
  if (!origin) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) return callback(new Error('Origin header required'), false);
    return callback(null, true);
  }

  const allowed = getCorsOrigins();
  if (allowed.includes(origin)) return callback(null, true);

  return callback(new Error(`Not allowed by CORS: ${origin}`), false);
}
