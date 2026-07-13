import { NextResponse } from 'next/server';import { requireUser } from '@/lib/auth';import { resetDB } from '@/lib/store';
export async function POST(req:Request){const u=await requireUser('Admin');if(!u)return NextResponse.redirect(new URL('/login',req.url));await resetDB();return NextResponse.redirect(new URL('/admin?ok=Database reset to V1.2 seed',req.url))}
