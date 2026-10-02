import 'dotenv/config';
import path from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  openaiKey: required('OPENAI_API_KEY'),
  model: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
  telegramToken: required('TELEGRAM_BOT_TOKEN'),
  databaseUrl: required('DATABASE_URL'),
  workspace: path.resolve(process.env.WORKSPACE_DIR || './workspace'),
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  allowedUserIds: new Set(
    (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
      .split(',').map(s => s.trim()).filter(Boolean).map(Number)
  )
};
