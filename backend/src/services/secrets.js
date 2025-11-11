import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
const SECRET_ID = process.env.ALPHA_VANTAGE_SECRET_ID;
const SECRET_CACHE_TTL = Number(process.env.SECRET_CACHE_TTL_MS ?? 300_000); // 5 minutes

let cachedSecret;
let cachedAt = 0;

export const getAlphaVantageKey = async () => {
  if (!SECRET_ID) {
    throw new Error('ALPHA_VANTAGE_SECRET_ID environment variable is not set');
  }

  const now = Date.now();
  if (cachedSecret && (now - cachedAt) < SECRET_CACHE_TTL) {
    return cachedSecret;
  }

  const { SecretString } = await client.send(new GetSecretValueCommand({
    SecretId: SECRET_ID,
  }));

  if (!SecretString) {
    throw new Error(`Secret ${SECRET_ID} does not contain a SecretString value`);
  }

  let parsed;
  try {
    parsed = JSON.parse(SecretString);
  } catch {
    parsed = SecretString;
  }

  const apiKey = typeof parsed === 'string' ? parsed : parsed.API_KEY ?? parsed.alphaVantageKey;
  if (!apiKey) {
    throw new Error(`Secret ${SECRET_ID} does not contain an Alpha Vantage API key`);
  }

  cachedSecret = apiKey;
  cachedAt = now;
  return apiKey;
};

