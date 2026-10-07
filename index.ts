import { Bot } from 'grammy';
import http from 'node:http';
import { config } from './config.js';
import { runAgent } from './agent.js';

const bot = new Bot(config.telegramToken);

function allowed(id: number) {
  return (
    config.allowedUserIds.size === 0 ||
    config.allowedUserIds.has(id)
  );
}

// Log Telegram/Grammy errors instead of failing silently.
bot.catch((err) => {
  console.error('GRAMMY BOT ERROR:', err.error);
});

bot.command('start', async (ctx) => {
  console.log('Received /start from Telegram user:', ctx.from?.id);

  await ctx.reply(
    'I am your dynamic AI agent. Tell me what you want done. I can write code, test it, manage the workspace, remember instructions, and deploy when configured.'
  );
});

bot.command('id', async (ctx) => {
  console.log('Received /id from Telegram user:', ctx.from?.id);

  await ctx.reply(
    `Your Telegram user ID is ${ctx.from?.id ?? 'unknown'}`
  );
});

bot.on('message:text', async (ctx) => {
  const id = ctx.from.id;

  console.log(
    `Received message from Telegram user ${id}: ${ctx.message.text}`
  );

  if (!allowed(id)) {
    console.log(`Unauthorized Telegram user: ${id}`);
    await ctx.reply('Unauthorized.');
    return;
  }

  await ctx.replyWithChatAction('typing');

  try {
    const result = await runAgent(id, ctx.message.text);

    for (let i = 0; i < result.length; i += 3900) {
      await ctx.reply(result.slice(i, i + 3900));
    }
  } catch (e: any) {
    console.error('AGENT ERROR:', e);

    await ctx.reply(
      `Agent error: ${e?.message || String(e)}`
    );
  }
});

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'content-type': 'application/json'
    });

    res.end(
      JSON.stringify({
        ok: true,
        service: 'benito-ai-agent'
      })
    );

    return;
  }

  if (
    req.method === 'POST' &&
    req.url === '/telegram/webhook'
  ) {
    if (
      config.webhookSecret &&
      req.headers['x-telegram-bot-api-secret-token'] !==
        config.webhookSecret
    ) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        await bot.handleUpdate(JSON.parse(body));

        res.writeHead(200);
        res.end('ok');
      } catch (error) {
        console.error('WEBHOOK ERROR:', error);

        res.writeHead(500);
        res.end('error');
      }
    });

    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(config.port, async () => {
  console.log(`HTTP server listening on port ${config.port}`);

  try {
    // Verify that the Telegram token actually works.
    const me = await bot.api.getMe();

    console.log(
      `Telegram authentication successful: @${me.username}`
    );

    // Check whether Telegram currently has a webhook.
    const webhook = await bot.api.getWebhookInfo();

    console.log(
      `Current Telegram webhook URL: ${webhook.url || '(none)'}`
    );

    if (config.publicBaseUrl) {
      const url =
        `${config.publicBaseUrl.replace(/\/$/, '')}` +
        `/telegram/webhook`;

      await bot.api.setWebhook(url, {
        secret_token:
          config.webhookSecret || undefined
      });

      console.log(`Telegram webhook mode enabled: ${url}`);
    } else {
      // Remove any old webhook before starting polling.
      await bot.api.deleteWebhook({
        drop_pending_updates: false
      });

      console.log(
        'Webhook removed. Starting Telegram polling...'
      );

      bot.start({
        onStart: (info) => {
          console.log(
            `Telegram polling started successfully for @${info.username}`
          );
        }
      }).catch((error) => {
        console.error(
          'TELEGRAM POLLING FAILED:',
          error
        );
      });
    }
  } catch (error) {
    console.error(
      'TELEGRAM INITIALIZATION FAILED:',
      error
    );
  }
});
