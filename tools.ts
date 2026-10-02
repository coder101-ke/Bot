import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';
import { addInstruction, addMemory } from './db.js';
const execFileAsync = promisify(execFile);

await fs.mkdir(config.workspace, { recursive: true });

function safePath(p: string) {
  const resolved = path.resolve(config.workspace, p);
  if (resolved !== config.workspace && !resolved.startsWith(config.workspace + path.sep)) throw new Error('Path escapes the agent workspace.');
  return resolved;
}

export const toolDefinitions = [
  { type:'function', name:'read_file', description:'Read a text file inside the agent workspace.', parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}, strict:true },
  { type:'function', name:'write_file', description:'Create or replace a text file inside the agent workspace.', parameters:{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content'],additionalProperties:false}, strict:true },
  { type:'function', name:'list_files', description:'List files/directories inside the agent workspace.', parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}, strict:true },
  { type:'function', name:'run_command', description:'Run a development command in the workspace. Intended for coding, tests and builds. Commands are restricted to a safe allowlist.', parameters:{type:'object',properties:{command:{type:'string'}},required:['command'],additionalProperties:false}, strict:true },
  { type:'function', name:'save_memory', description:'Persist a useful long-term fact or project note.', parameters:{type:'object',properties:{content:{type:'string'},kind:{type:'string'}},required:['content','kind'],additionalProperties:false}, strict:true },
  { type:'function', name:'add_instruction', description:'Add a persistent operating instruction for future conversations.', parameters:{type:'object',properties:{instruction:{type:'string'}},required:['instruction'],additionalProperties:false}, strict:true },
  { type:'function', name:'deploy_vercel', description:'Deploy the current workspace using the Vercel CLI. Requires VERCEL_TOKEN and a configured Vercel project/environment.', parameters:{type:'object',properties:{production:{type:'boolean'}},required:['production'],additionalProperties:false}, strict:true }
];

const allowedCommands = new Set(['npm','npx','node','tsc','git','vercel','pwd','ls','find','cat']);

export async function executeTool(name:string, args:any):Promise<string> {
  if (name === 'read_file') return await fs.readFile(safePath(args.path), 'utf8');
  if (name === 'write_file') { const p=safePath(args.path); await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p,args.content,'utf8'); return `Wrote ${args.path}`; }
  if (name === 'list_files') return (await fs.readdir(safePath(args.path),{withFileTypes:true})).map(x=>x.isDirectory()?`${x.name}/`:x.name).join('\n');
  if (name === 'save_memory') { await addMemory(args.content,args.kind); return 'Memory saved.'; }
  if (name === 'add_instruction') { await addInstruction(args.instruction); return 'Instruction added.'; }
  if (name === 'run_command') {
    const parts = args.command.trim().split(/\s+/); const exe=parts[0];
    if (!allowedCommands.has(exe)) throw new Error(`Command '${exe}' is not allowed.`);
    const {stdout,stderr}=await execFileAsync(exe, parts.slice(1), {cwd:config.workspace, timeout:120000, maxBuffer:2_000_000});
    return JSON.stringify({stdout,stderr});
  }
  if (name === 'deploy_vercel') {
    if (!process.env.VERCEL_TOKEN) throw new Error('VERCEL_TOKEN is not configured.');
    const argsList=['--token',process.env.VERCEL_TOKEN];
    if (args.production) argsList.push('--prod');
    const {stdout,stderr}=await execFileAsync('vercel',argsList,{cwd:config.workspace,timeout:180000,maxBuffer:2_000_000});
    return JSON.stringify({stdout,stderr});
  }
  throw new Error(`Unknown tool: ${name}`);
}
