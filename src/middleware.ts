import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

const PUBLIC_PATHS = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (pathname.startsWith('/app') && !valid) {
    const login = new URL('/login', req.url);
    return NextResponse.redirect(login);
  }

  if (valid && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
    const app = new URL('/app', req.url);
    return NextResponse.redirect(app);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/app/:path*'],
};
