# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIL-LMS is a full-featured Learning Management System built with React 18, TypeScript, Vite, and Supabase. It supports traditional LMS functionality plus AI-powered language learning with offline capabilities.

**Tech Stack:**
- Frontend: React 18.3.1 + TypeScript 5.5.3 + Vite 5.4.1
- UI: shadcn/ui + Radix UI + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- State: React Context + TanStack Query
- AI: OpenAI integration (GPT models)
- Integrations: Stripe, Zoom, Firebase (FCM)
- Offline: IndexedDB + Service Workers + PWA

## Development Commands

### Run Development Server
```bash
npm run dev                    # Default dev server (port 8080)
npm run dev:development        # Development environment
npm run dev:staging           # Staging environment
npm run dev:production        # Production environment
```

### Build
```bash
npm run build                 # Production build
npm run build:dev            # Development build
npm run build:staging        # Staging build
npm run build:prod           # Production build
```

### Testing & Quality
```bash
npm run lint                 # Run ESLint
npm run preview              # Preview production build locally
npm run preview:dev          # Preview development build
npm run preview:staging      # Preview staging build
npm run preview:prod         # Preview production build
```

### Supabase Commands
```bash
# Run from project root
supabase start               # Start local Supabase
supabase db reset            # Reset local database
supabase db diff             # Generate migration from changes
supabase functions deploy    # Deploy edge functions
supabase migration new <name> # Create new migration
```

Note: There are no automated tests configured. Testing is currently manual.

## Architecture

### User Roles & Permissions

The system has **6 user roles** with different access levels:

1. **student** - Enroll in courses, submit assignments, take quizzes
2. **teacher** - Create/manage courses, grade assignments, manage own classes
3. **admin** - Full system access (except super user privileges)
4. **content_creator** - Create/edit/delete courses, but cannot manage users
5. **super_user** - Full system access (only ONE allowed per system)
6. **view_only** - Read-only access to published courses

**Portal URLs:**
- Student Portal: `/auth/student` (student, view_only roles)
- Teacher Portal: `/auth/teacher` (teacher, content_creator roles)
- Admin Portal: `/auth/admin` (admin, super_user roles)

**Dashboard Routing:** See `src/config/roleNavigation.ts` for role-based navigation configuration.

### Frontend Architecture

**Component Organization:**
```
src/components/
├── ui/              # shadcn/ui primitives (60+ components)
├── admin/           # Admin dashboard components
├── auth/            # Authentication UI
├── course/          # Course management
├── student/         # Student-specific components
├── quiz/            # Quiz/assessment components
├── assignment/      # Assignment handling
├── discussion/      # Discussion forums
└── [feature]/       # Other feature-based components
```

**Service Layer Pattern:**
- All business logic and API calls live in `src/services/` (58+ files)
- Components remain presentational
- Services handle Supabase queries, mutations, and external API calls
- Example: `courseDataLayer.ts`, `notificationService.ts`, `meetingService.ts`

**State Management:**
- **9 React Contexts** for global state (see `src/contexts/`)
  - `AuthContext` - Authentication state
  - `AILMSContext` - AI/LMS mode switching
  - `NotificationContext` - Real-time notifications
  - `ViewPreferencesContext` - User preferences
  - `AIAssistantContext` - AI assistant state
- **TanStack Query** for server state and caching
- **Local state** for component-level state

**Routing:**
- Main router: `src/App.tsx`
- Dashboard routing hub: `src/pages/Dashboard.tsx`
- Role-based navigation: `src/config/roleNavigation.ts`
- Route guards for offline mode: `src/hooks/useOfflineRouteGuard.ts`

### Backend Architecture (Supabase)

**Row Level Security (RLS):**
- All tables protected with RLS policies
- Helper functions for permission checks:
  - `is_admin_user()` - Check if user is admin
  - `is_content_creator()` - Check if user is content creator
  - `is_super_user()` - Check if user is super user
  - `is_view_only()` - Check if user has view-only access
  - `has_elevated_privileges()` - Admin or super user
  - `can_modify_content()` - Can create/edit content
- All policies use these helpers for consistency

**Database Structure:**
Key tables (37+ migrations in `supabase/migrations/`):
- `profiles` - User profiles with role information
- `courses` - Course catalog with payment fields
- `course_sections`, `course_lessons`, `course_content` - Course structure
- `quiz_questions`, `quiz_attempts` - Quiz system
- `assignments`, `assignment_submissions` - Assignment system
- `classes`, `boards`, `schools` - Organization structure
- `meetings` - Zoom integration
- `notifications` - Real-time notifications
- `observation_reports` - Secure observation data

**Edge Functions:**
Located in `supabase/functions/` (30+ functions):
- JWT verification for authentication
- Complex business logic (bulk uploads, AI chat, Stripe webhooks)
- Shared utilities in `_shared/` directory
- Deploy with `supabase functions deploy <function-name>`

### Offline Support

**Key Files:**
- `src/services/offlineDatabase.ts` (677 lines) - IndexedDB wrapper
- `src/utils/offlineStateManager.ts` - Track online/offline state
- `src/utils/offlineRequestHandler.ts` - Queue requests when offline
- `src/utils/serviceWorker.ts` - Service worker registration
- `public/sw.js` - Service worker implementation

**Offline Features:**
- Download entire courses for offline viewing
- Cache videos, attachments, and images
- Hide quizzes/assignments when offline (require internet)
- Auto-redirect from unavailable content
- Network status detection via `useNetworkStatus` hook

**Limitations:**
- Quizzes and assignments require internet connection
- Course creation/editing requires internet
- User management requires internet
- Real-time features unavailable offline

## Code Patterns

### Adding a New Feature

1. **Create Service** in `src/services/`
   ```typescript
   // Example: src/services/myFeatureService.ts
   import { supabase } from "@/integrations/supabase/client";

   export const getMyData = async () => {
     const { data, error } = await supabase
       .from('my_table')
       .select('*');
     if (error) throw error;
     return data;
   };
   ```

2. **Create Components** in `src/components/[feature]/`
   ```typescript
   // Example: src/components/myfeature/MyFeatureList.tsx
   import { useQuery } from "@tanstack/react-query";
   import { getMyData } from "@/services/myFeatureService";

   export const MyFeatureList = () => {
     const { data, isLoading } = useQuery({
       queryKey: ['my-feature'],
       queryFn: getMyData
     });
     // Component logic
   };
   ```

3. **Add Route** in `src/pages/Dashboard.tsx`
4. **Update Role Navigation** in `src/config/roleNavigation.ts` if needed
5. **Add Database Migration** in `supabase/migrations/` if schema changes needed

### Adding New Role Permissions

1. **Update Database Migration:**
   ```sql
   -- Add new RLS policy
   CREATE POLICY "policy_name" ON table_name
     FOR operation
     USING (is_admin_user() OR your_condition);
   ```

2. **Update Helper Functions** (if needed) in migration
3. **Update `roleNavigation.ts`** to add/remove menu items for role
4. **Update Portal Access** in auth pages if new role needs different portal

### Working with Supabase

**Client Location:** `src/integrations/supabase/client.ts`

**Common Patterns:**
```typescript
// Query data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Insert data
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: value });

// Update data
const { data, error } = await supabase
  .from('table_name')
  .update({ column: value })
  .eq('id', id);

// Real-time subscription
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'table_name' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

**Authentication:**
```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Sign out
await supabase.auth.signOut();
```

### Path Aliases

TypeScript path alias `@/*` maps to `./src/*`:
```typescript
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
```

### Styling with Tailwind

This project uses shadcn/ui components with Tailwind CSS:
- **Brand Colors:** green (#8DC63F), blue (#0061AF)
- **Dark Mode:** Supported via `next-themes`
- **CSS Variables:** Enabled for theming
- **Typography Plugin:** Available for rich text

Use className prop with Tailwind utilities:
```typescript
<div className="flex items-center gap-4 p-6 bg-primary text-primary-foreground">
```

## Key Features

### AI-Powered Learning (AILMS Mode)

The system has two modes: **LMS Mode** and **AI Mode** (toggle in UI).

**AI Learning Stages (0-6):**
- Stage 0-6: Progressive language learning exercises
- Components: `src/components/practice/` and `src/pages/practice/`
- AI Assistants: IRIS (admin), APEX framework, AI Tutor (student)
- Configuration: `src/components/admin/AISettings.tsx`

### Payment Integration (Stripe)

- Service: `src/services/stripeService.ts`
- Webhook: `supabase/functions/stripe-webhook/`
- Tables: `course_payments`, `courses.price`
- Components: `src/components/course/CoursePayment.tsx`

### Zoom Integration

- Service: `src/services/meetingService.ts`
- Edge Function: `supabase/functions/zoom-meeting-manager/`
- Components: `src/components/class/ZoomMeetingManager.tsx`
- Multi-role support: Students, teachers, admins can join

### Bulk User Upload

- Template: `public/bulk-upload-template.xlsx`
- Edge Function: `supabase/functions/bulk-upload-users/`
- Components: `src/components/admin/BulkUserUpload.tsx`
- Supports password generation and role assignment

## Environment Variables

Required environment variables (see `.env.development.template`):

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API
VITE_API_BASE_URL=your_api_url

# OpenAI
VITE_OPENAI_API_KEY=your_openai_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key

# MCP Adapter (AI)
VITE_MCP_ADAPTER_URL=your_mcp_url
VITE_MCP_SSE_URL=your_mcp_sse_url
```

Create environment-specific files:
- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Deployment

**CI/CD Pipeline:** GitHub Actions (`.github/workflows/`)

**Workflow:**
1. Checkout code
2. Setup Node 20
3. Install dependencies (`npm ci`)
4. Build with Vite (`npm run build:prod`)
5. Configure AWS credentials (from GitHub Secrets)
6. Sync to S3 bucket
7. Fix index.html MIME type
8. Invalidate CloudFront cache

**Platform:** AWS S3 + CloudFront CDN

**GitHub Secrets Required:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID`
- Environment variables (prefixed with `VITE_`)

See `GITHUB_SECRETS_SETUP_GUIDE.md` and `MULTI_ENVIRONMENT_CICD_GUIDE.md` for details.

## Security Considerations

### Authentication & Session Management

- **Supabase Auth** with MFA support (`src/hooks/useSupabaseMFA.ts`)
- **Session Timeout:** Auto-logout after inactivity (`src/utils/sessionManager.ts`)
- **Cross-Tab Sync:** Sessions synced across browser tabs
- **Auth Error Handling:** Handle user_not_found errors gracefully

### Best Practices

- **Never bypass RLS:** All queries go through Supabase client with RLS enabled
- **Validate input:** Use Zod schemas with React Hook Form
- **Sanitize HTML:** Be cautious with rich text content (React Quill)
- **Check permissions:** Use helper functions (`is_admin_user()`, etc.) in policies
- **Secure secrets:** Never commit `.env` files, use environment variables
- **CORS:** Edge functions should validate origins
- **SQL Injection:** Use parameterized queries, never string concatenation

## TypeScript Configuration

**Relaxed Settings (for rapid development):**
- `noImplicitAny: false` - Allows implicit any types
- `strictNullChecks: false` - Allows null/undefined without checks
- `allowJs: true` - Allows JavaScript files

When adding strict typing:
1. Enable `strictNullChecks` first
2. Fix null/undefined errors
3. Enable `noImplicitAny`
4. Add explicit types to any

## Troubleshooting

### Common Issues

**Infinite Reload:** See `INFINITE_RELOAD_FIX.md` - Usually auth state loop
**Offline Videos:** See `OFFLINE_VIDEO_ATTACHMENT_FIX_V2.md` - IndexedDB caching
**API Key Errors:** See `SUPABASE_API_KEY_ERROR_SOLUTION.md` - Environment config
**Auth Errors:** Check `user_not_found` error handling in AuthContext

### Debug Logging

Enable debug logging (see `DEBUG_LOGGING_ADDED.md`):
- Check browser console for errors
- Use React DevTools for component inspection
- Use Network tab for API call inspection
- Check Supabase logs for backend errors

## Documentation

The project includes 35+ markdown files documenting features:
- `NEW_USER_ROLES_IMPLEMENTATION.md` - Role system details
- `ZOOM_MEETINGS_IMPLEMENTATION.md` - Zoom integration
- `OFFLINE_QUIZ_ASSIGNMENT_HIDING_FEATURE.md` - Offline behavior
- `SUPER_USER_SETUP_GUIDE.md` - Create super user
- `CREATE_SUPER_USER_README.md` - Super user instructions

Refer to these for detailed implementation notes on specific features.

## Quick Start for New Features

1. **Understand the role system** - Check `src/config/roleNavigation.ts`
2. **Start with Dashboard** - `src/pages/Dashboard.tsx` is the routing hub
3. **Create service first** - Business logic in `src/services/`
4. **Follow existing patterns** - Look at similar features for guidance
5. **Check RLS policies** - Review `supabase/migrations/` for permissions
6. **Test offline behavior** - Consider offline mode for all features
7. **Update documentation** - Add markdown file for complex features
