import { Bot } from 'grammy';
import http from 'node:http';
import { config } from './config.js';
import { runAgent } from './agent.js';

const bot = new Bot(config.telegramToken);

function allowed(id:number) { return config.allowedUserIds.size === 0 || config.allowedUserIds.has(id); }

bot.command('start', ctx => ctx.reply('I am your dynamic AI agent. Tell me what you want done. I can write code, test it, manage the workspace, remember instructions, and deploy when configured.'));
bot.command('id', ctx => ctx.reply(`Your Telegram user ID is ${ctx.from?.id ?? 'unknown'}`));
bot.on('message:text', async ctx => {
  const id = ctx.from.id;
  if (!allowed(id)) return ctx.reply('Unauthorized.');
  await ctx.replyWithChatAction('typing');
  try {
    const result = await runAgent(id, ctx.message.text);
    for (let i=0;i<result.length;i+=3900) await ctx.reply(result.slice(i,i+3900));
  } catch (e:any) { await ctx.reply(`Agent error: ${e?.message || String(e)}`); }
});

if (config.publicBaseUrl) {
  const server = http.createServer(async (req,res) => {
    if (req.url === '/health') { res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({ok:true})); return; }
    if (req.method === 'POST' && req.url === '/telegram/webhook') {
      if (config.webhookSecret && req.headers['x-telegram-bot-api-secret-token'] !== config.webhookSecret) { res.writeHead(401); res.end(); return; }
      let body=''; req.on('data',c=>body+=c); req.on('end',async()=>{ try { await bot.handleUpdate(JSON.parse(body)); res.writeHead(200); res.end('ok'); } catch { res.writeHead(500); res.end('error'); }}); return;
    }
    res.writeHead(404); res.end();
  });
  server.listen(config.port, async()=>{
    const url=`${config.publicBaseUrl.replace(/\/$/,'')}/telegram/webhook`;
    await bot.api.setWebhook(url,{secret_token:config.webhookSecret || undefined});
    console.log(`Webhook mode: ${url}`);
  });
} else {
  bot.start();
  console.log('Polling mode started.');
}
