import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sign out route — clears the session and redirects to login.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Use the request origin so it works on both localhost and production (Vercel)
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL('/login', origin));
}
