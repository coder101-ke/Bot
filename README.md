# Benito Agent — Telegram-first dynamic AI agent

A starter personal agent with:
- Telegram interface
- OpenAI Responses API tool calling
- Persistent PostgreSQL/Neon memory and instructions
- Workspace file creation/editing
- Restricted development command execution
- Build/test workflow
- Vercel deployment tool
- Optional production Telegram webhook

## 1. Requirements
Node.js 20+, a Telegram bot token from @BotFather, an OpenAI API key, and a PostgreSQL/Neon database.

## 2. Setup
```bash
cp .env.example .env
npm install
npm run db:init
npm run dev
```
Put secrets only in `.env`; never paste them into source code or Telegram.

## 3. Telegram
Create the bot with @BotFather and put the token in `TELEGRAM_BOT_TOKEN`.
Start the app and send `/id` to learn your numeric Telegram ID. Put it into `TELEGRAM_ALLOWED_USER_IDS` and restart to restrict access.

## 4. Database
Put your Neon connection string in `DATABASE_URL`.

## 5. Coding
The agent's coding workspace is `./workspace`. It can read/write files and run an allowlisted set of development commands. This is intentionally restricted; expand the command policy only when you understand the security implications.

## 6. Vercel deployment
Install Vercel CLI if needed:
```bash
npm i -g vercel
```
Set `VERCEL_TOKEN`. Then tell the agent to deploy. Production deployment requires the token and a Vercel project/environment configured for the workspace.

## 7. Production Telegram webhook
Set:
- `PUBLIC_BASE_URL=https://your-domain.example`
- `TELEGRAM_WEBHOOK_SECRET=long-random-secret`
- `PORT=3000`

The app will register `/telegram/webhook` automatically.

## Important
This is the foundation, not a promise of unrestricted autonomy. Add external integrations through explicit tools and permissions. Keep production credentials out of model prompts and source files.
