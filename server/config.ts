import 'dotenv/config';

// APP rename these keys to match your external API's terminology
const requiredVars = [
  'EXTERNAL_API_CLIENT_ID',
  'EXTERNAL_API_CLIENT_SECRET',
  'EXTERNAL_API_BASE_URL',
] as const;

const missing = requiredVars.filter((v) => !process.env[v]);
if (missing.length) {
  throw new Error(`Missing required env vars in server/.env: ${missing.join(', ')}`);
}

interface Config {
  externalApi: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
  };
}

const config: Config = {
  externalApi: {
    // Non-null assertions are safe here. Missing vars throw above.
    clientId:     process.env.EXTERNAL_API_CLIENT_ID!,
    clientSecret: process.env.EXTERNAL_API_CLIENT_SECRET!,
    baseUrl:      process.env.EXTERNAL_API_BASE_URL!,
  },
};

export default config;
