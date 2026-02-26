import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Get the BASIC_AUTH_USER and BASIC_AUTH_PASSWORD from env
  const authUser = process.env.BASIC_AUTH_USER
  const authPassword = process.env.BASIC_AUTH_PASSWORD

  // If credentials are not set in the environment, we can optionally bypass auth
  // But for security, we'll enforce it if they are set, or use defaults
  const user = authUser || 'weberry'
  const pwd = authPassword || 'password'

  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [providedUser, providedPwd] = atob(authValue).split(':')

    if (providedUser === user && providedPwd === pwd) {
      return NextResponse.next()
    }
  }

  // Not authenticated
  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}

// Ensure the middleware only runs on actual pages and API routes,
// ignoring static files, images, etc.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
