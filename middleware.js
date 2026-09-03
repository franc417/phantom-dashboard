// Protects the dashboard (index.html + /api/location) behind a browser
// login prompt. /api/ping is excluded since the device authenticates with
// its own DEVICE_SECRET header instead.
//
// The exclusion is checked explicitly inside the function (rather than
// relying on matcher regex syntax) so it behaves the same regardless of
// framework preset.
//
// Set DASHBOARD_USER and DASHBOARD_PASSWORD as environment variables in
// the Vercel project settings.

export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith('/api/ping')) {
    return; // device pings skip Basic Auth entirely
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    const separatorIndex = decoded.indexOf(':');
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (user === process.env.DASHBOARD_USER && pass === process.env.DASHBOARD_PASSWORD) {
      return;
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Phantom Dashboard"' },
  });
}
