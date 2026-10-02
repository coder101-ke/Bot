import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
export const pool = new Pool({ connectionString: config.databaseUrl, ssl: { rejectUnauthorized: false } });

export async function instructions() {
  const r = await pool.query('SELECT instruction FROM agent_instructions WHERE enabled=true ORDER BY id ASC');
  return r.rows.map(x => x.instruction as string);
}
export async function memories(limit = 30) {
  const r = await pool.query('SELECT content, kind FROM agent_memories ORDER BY id DESC LIMIT $1', [limit]);
  return r.rows as {content:string; kind:string}[];
}
export async function addInstruction(instruction: string) {
  await pool.query('INSERT INTO agent_instructions (instruction) VALUES ($1)', [instruction]);
}
export async function addMemory(content: string, kind='general') {
  await pool.query('INSERT INTO agent_memories (content, kind) VALUES ($1,$2)', [content, kind]);
}
export async function saveMessage(userId:number, role:'user'|'assistant'|'tool', content:string) {
  await pool.query('INSERT INTO conversations (telegram_user_id, role, content) VALUES ($1,$2,$3)', [userId, role, content]);
}
export async function recentMessages(userId:number, limit=20) {
  const r = await pool.query('SELECT role, content FROM conversations WHERE telegram_user_id=$1 ORDER BY id DESC LIMIT $2', [userId, limit]);
  return r.rows.reverse() as {role:'user'|'assistant'|'tool'; content:string}[];
}
