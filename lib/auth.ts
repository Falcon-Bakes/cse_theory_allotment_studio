import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getUser } from './store';
const ITER=120000;
export function hashPassword(password:string,salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.pbkdf2Sync(password,salt,ITER,32,'sha256').toString('hex');return `${salt}:${ITER}:${hash}`}
export function verifyPassword(password:string,stored:string){if(!stored.includes(':')) return password===stored;const [salt,iters,hash]=stored.split(':');const got=crypto.pbkdf2Sync(password,salt,Number(iters),32,'sha256').toString('hex');return crypto.timingSafeEqual(Buffer.from(got,'hex'),Buffer.from(hash,'hex'))}
export function tokenFor(user:any){const payload=Buffer.from(JSON.stringify({id:user.faculty_id,user_id:user.user_id,role:user.role,name:user.faculty_name,ts:Date.now()})).toString('base64url');const secret=process.env.AUTH_SECRET||'dev-secret';const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url');return `${payload}.${sig}`}
export function readToken(token?:string){if(!token)return null;const [payload,sig]=token.split('.');const secret=process.env.AUTH_SECRET||'dev-secret';const good=crypto.createHmac('sha256',secret).update(payload).digest('base64url');if(sig!==good)return null;return JSON.parse(Buffer.from(payload,'base64url').toString())}
export async function setSession(user:any){(await cookies()).set('cas_session',tokenFor(user),{httpOnly:true,sameSite:'lax',path:'/',maxAge:60*60*10})}
export async function clearSession(){(await cookies()).delete('cas_session')}
export async function currentUser(){return readToken((await cookies()).get('cas_session')?.value)}
export async function requireUser(role?:string){const u=await currentUser();if(!u) return null;if(role && !(String(u.role).split(',').includes(role)) && !String(u.role).split(',').includes('Admin')) return null;return u}
export async function getDbUser(userId:string){return getUser(userId)}
