import { S3Client } from '@aws-sdk/client-s3';

// This bucket is declared private in neon.ts. Persist object keys, not URLs,
// so the same tenant records work when a Neon branch is forked.
export const LOGO_BUCKET = 'uploads';

export function createObjectStorage(env = process.env) {
  for (const name of ['AWS_ENDPOINT_URL_S3', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']) {
    if (!env[name]) throw new Error(`Object storage is missing ${name}. Run neon deploy to pull the branch configuration.`);
  }
  return new S3Client({
    endpoint: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}
