# LitRevTool - Next.js SSR Frontend

This is the **isomorphic (server-side rendered)** version of the LitRevTool frontend built with Next.js 14 and the App Router.

## Features

- **Server-Side Rendering (SSR)**: Pages are rendered on the server for better SEO and initial load performance
- **Material-UI with SSR**: Properly configured Emotion cache for server-side style injection
- **Cookie-Based Authentication**: Secure httpOnly cookies instead of localStorage
- **TypeScript**: Full type safety throughout the application
- **Google OAuth Integration**: Seamless authentication with Google
- **Real-time Updates**: Polling-based job status updates every 5 seconds
- **Live Browser Screenshots**: View scraper progress in real-time
- **PRISMA Metrics**: Systematic literature review methodology tracking

## Architecture

```
┌─────────────────────────────────────────────┐
│ Client Browser                              │
│ - React Hydration                           │
│ - Interactive Components                    │
└─────────────────────────────────────────────┘
                   ↕
┌─────────────────────────────────────────────┐
│ Next.js Server (Port 3001)                  │
│ ┌─────────────────────────────────────────┐ │
│ │ Server-Side Rendering                   │ │
│ │ - Initial HTML generation               │ │
│ │ - Material-UI Emotion cache             │ │
│ │ - SEO-optimized pages                   │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ API Rewrites (Proxy)                    │ │
│ │ /api/v1/* → http://localhost:8000/api/* │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ FastAPI Backend (Port 8000)                 │
│ - REST API endpoints                        │
│ - Google OAuth handling                     │
│ - Database operations                       │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
frontend-nextjs/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page (redirects)
│   ├── login/
│   │   └── page.tsx       # Login page
│   └── dashboard/
│       └── page.tsx       # Dashboard page
├── components/            # React components
│   └── CreateJobDialog.tsx
├── lib/                   # Utilities and configurations
│   ├── theme.ts          # Material-UI theme
│   ├── registry.tsx      # Emotion SSR registry
│   ├── auth.ts           # Cookie-based auth utilities
│   ├── api.ts            # API client (axios)
│   ├── AuthContext.tsx   # Authentication context
│   └── GoogleOAuthProvider.tsx
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
└── .env.local           # Environment variables
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running FastAPI backend on port 8000

### Installation

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.local.example .env.local
# Edit .env.local with your Google Client ID

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

### Environment Variables

Create a `.env.local` file:

```bash
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google OAuth Client ID (must match backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Available Scripts

- `npm run dev` - Start development server with hot reload (port 3001)
- `npm run build` - Build optimized production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler checks

## Key Differences from React Version

### Authentication
- **Old (React)**: `localStorage.setItem('token', ...)`
- **New (Next.js)**: `Cookies.set('auth_token', ..., { httpOnly: false, secure: true })`

### Routing
- **Old (React)**: `react-router-dom` with `<BrowserRouter>`
- **New (Next.js)**: File-based routing with App Router

### Navigation
- **Old (React)**: `useNavigate()` from react-router
- **New (Next.js)**: `useRouter()` from next/navigation

### API Calls
- **Old (React)**: Direct calls to `http://localhost:8000/api/v1/*`
- **New (Next.js)**: Proxied through Next.js rewrites

### Rendering
- **Old (React)**: Client-side only
- **New (Next.js)**: Server-side first, then hydrated on client

## SSR Benefits

1. **SEO**: Search engines can crawl fully rendered HTML
2. **Performance**: Faster Time to First Byte (TTFB)
3. **User Experience**: Content visible before JavaScript loads
4. **Social Sharing**: Proper meta tags for social media previews

## Verifying SSR

To verify server-side rendering is working:

1. Visit http://localhost:3001
2. View page source (Ctrl+U or Cmd+U)
3. You should see fully rendered HTML content, not just `<div id="root"></div>`
4. Look for Material-UI styles in `<style data-emotion="mui">` tags
5. Disable JavaScript in browser - page should still show content

## Material-UI SSR Configuration

The Emotion cache is configured in `lib/registry.tsx` to:
- Extract critical CSS on the server
- Inject styles into HTML before sending to client
- Prevent Flash of Unstyled Content (FOUC)
- Enable progressive enhancement

## Production Deployment

### With PM2

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "litrev-frontend-nextjs" -- start

# Or use the deployment script
cd ..
./deploy-nextjs.sh prod
```

### Environment-Specific Configuration

For production, update `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://litrev.haielab.org
NEXT_PUBLIC_APP_URL=https://litrev.haielab.org
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_client_id
```

## Migration from React Frontend

The Next.js version maintains 100% feature parity with the React version:

- ✅ Google OAuth authentication
- ✅ Job creation with semantic filtering
- ✅ Real-time progress tracking
- ✅ Live browser screenshots
- ✅ PRISMA methodology metrics
- ✅ Multiple download formats (CSV, LaTeX, BibTeX, PRISMA)
- ✅ Pause/Resume functionality
- ✅ Auto-refresh polling

**Additional benefits**:
- ✅ Server-side rendering
- ✅ Better SEO
- ✅ Faster initial page load
- ✅ TypeScript type safety
- ✅ Modern Next.js 14 App Router

## Troubleshooting

### Hydration Errors

If you see hydration mismatch warnings:
- Ensure server and client render the same content
- Check for Date/Time formatting differences
- Verify Material-UI SSR setup in `lib/registry.tsx`

### Authentication Issues

- Cookies must be accessible to client JavaScript (not httpOnly for auth token)
- Ensure NEXT_PUBLIC_GOOGLE_CLIENT_ID matches backend
- Check browser console for CORS errors

### API Proxy Not Working

- Verify `next.config.js` rewrites configuration
- Check backend is running on port 8000
- Review browser Network tab for failed requests

## License

Same as parent LitRevTool project.
