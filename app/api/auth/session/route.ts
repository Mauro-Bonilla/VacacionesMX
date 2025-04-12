import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  
  // Return the user from the session
  // Strip sensitive data like password
  if (session?.user) {
    const { password, ...safeUser } = session.user as any;
    return NextResponse.json({ user: safeUser });
  }
  
  return NextResponse.json({ user: null });
}