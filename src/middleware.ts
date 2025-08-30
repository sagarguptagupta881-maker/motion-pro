// middleware.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
export const runtime = "nodejs";


export function middleware(request) {
  const { pathname } = request.nextUrl;
  console.log("🔍 Requested Path:", pathname);

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  const authRoutes = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'];

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  console.log("🔒 Is Protected Route:", isProtectedRoute);

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  console.log("🔑 Is Auth Route:", isAuthRoute);

  // Get the token from cookies
  const token = request.cookies.get('auth-token')?.value;
  console.log("🍪 Token Found:", token ? "Yes" : "No");

  // If it's a protected route and no token, redirect to login
  if (isProtectedRoute && !token) {
    console.log("🚫 Access blocked! No token for protected route. Redirecting to /login");
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If token exists, verify it
  if (token) {
    try {
      console.log("✅ Verifying token...");
      const decoded = jwt.verify(token, "Aman1234");
      console.log("📨 Token Verified. User Data:", decoded);

      // If user is authenticated and trying to access auth routes, redirect to dashboard
      if (isAuthRoute) {
        console.log("⚠️ Logged in user tried to access auth route. Redirecting to /dashboard");
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Add user info to request headers for API routes
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('user-id', decoded.id);
      requestHeaders.set('user-email', decoded.email);
      console.log("📝 User info added to headers");

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      console.error("❌ Token verification failed:", error.message);

      // Invalid token, clear it and redirect to login if accessing protected route
      const response = isProtectedRoute 
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.next();

      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      console.log("🧹 Cleared invalid token cookie");
      return response;
    }
  }

  console.log("➡️ No special conditions met. Allowing request to continue");
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
