import OpenAI from 'openai';
import { config } from './config.js';
import { instructions, memories, recentMessages, saveMessage } from './db.js';
import { executeTool, toolDefinitions } from './tools.js';

const client = new OpenAI({ apiKey: config.openaiKey });

const BASE = `You are the user's personal software and operations agent. Follow the user's current request and the persistent operating instructions. You can write code, inspect files, run allowed development commands, test/build projects, remember useful information, and deploy through configured tools. Be proactive: execute tasks rather than merely explaining them. Never claim an action succeeded unless a tool result confirms it. Work inside the assigned workspace. For destructive, financial, credential-changing, or externally consequential actions, request explicit confirmation unless the user's persistent instructions already authorize that exact class of action.`;

export async function runAgent(userId:number, text:string) {
  await saveMessage(userId,'user',text);
  const [rules, mems, history] = await Promise.all([instructions(), memories(), recentMessages(userId)]);
  const system = `${BASE}\n\nPERSISTENT INSTRUCTIONS:\n${rules.join('\n') || '(none)'}\n\nMEMORY:\n${mems.map(m=>`[${m.kind}] ${m.content}`).join('\n') || '(none)'}`;
  let input:any[] = history.map(m=>({role:m.role === 'tool' ? 'assistant' : m.role, content:m.content}));
  if (!input.length || input[input.length-1]?.content !== text) input.push({role:'user',content:text});

  for (let round=0; round<12; round++) {
    const response = await client.responses.create({ model:config.model, instructions:system, input, tools:toolDefinitions as any, tool_choice:'auto' });
    const calls = response.output.filter((x:any)=>x.type === 'function_call');
    if (!calls.length) {
      const out = response.output_text || 'Done.';
      await saveMessage(userId,'assistant',out);
      return out;
    }
    input.push(...response.output as any);
    for (const call of calls as any[]) {
      let result:string;
      try { result = await executeTool(call.name, JSON.parse(call.arguments || '{}')); }
      catch (e:any) { result = `ERROR: ${e?.message || String(e)}`; }
      input.push({type:'function_call_output',call_id:call.call_id,output:result});
    }
  }
  throw new Error('Agent reached its tool-call limit before completing the task.');
}
