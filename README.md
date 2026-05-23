# FinTrack MVP

FinTrack is a modern full-stack web app for shared personal finance tracking between couples, roommates, or small groups.

This MVP supports:
- Google sign-in using Google Cloud OAuth (NextAuth)
- Group creation and rename
- Group invitation by email and invitation acceptance
- Income and expense entries
- Personal vs shared transaction visibility
- Dashboard summaries and recent transactions

## Tech Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui style components, Radix primitives
- Client data/state: TanStack Query
- Forms and validation: React Hook Form + Zod
- Auth: NextAuth + Google OAuth
- Backend and DB: Supabase Postgres + Drizzle ORM
- Deployment: Vercel (frontend), Supabase (backend)

## Project Structure

- [src/app](src/app)
- [src/components](src/components)
- [src/components/ui](src/components/ui)
- [src/features](src/features)
- [src/lib](src/lib)
- [src/db](src/db)
- [src/hooks](src/hooks)
- [src/types](src/types)
- [supabase/schema.sql](supabase/schema.sql)

## Data Model (MVP)

Implemented tables:
- `profiles`
- `groups`
- `group_members`
- `invitations`
- `transactions`

Schema source:
- Drizzle schema: [src/db/schema.ts](src/db/schema.ts)
- Supabase SQL + RLS: [supabase/schema.sql](supabase/schema.sql)

## Security and RLS

Row Level Security policies are defined in [supabase/schema.sql](supabase/schema.sql) with these rules:
- Users only see groups they belong to
- Users only see shared group transactions + their own personal transactions
- Users can only insert transactions inside groups they belong to
- Invitation and membership access is constrained to related groups and invited users

Note:
- This project stores authentication identity IDs (`text`) from Google OAuth subject IDs.
- The SQL includes a `current_user_id()` helper based on JWT claims (`sub`).

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create or update `.env.local`:

```dotenv
# Google OAuth (Google Cloud)
GOOGLE_CLIENT_ID=google-client-id-placeholder.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=google-client-secret-placeholder
NEXTAUTH_SECRET=nextauth-secret-placeholder
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgres://...
```

Use Supabase transaction or session pooler URL for `DATABASE_URL`.

In Google Cloud Console, create OAuth credentials and set the authorized redirect URI to:

`http://localhost:3000/api/auth/callback/google`

### 3) Apply database schema

Use Supabase SQL Editor and run:
- [supabase/schema.sql](supabase/schema.sql)

Or use Drizzle to push schema:

```bash
npm run db:push
```

### 4) Run app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Implemented Routes

Pages:
- `/` landing
- `/sign-in/[[...sign-in]]`
- `/sign-up/[[...sign-up]]`
- `/dashboard`

API endpoints:
- `GET /api/dashboard`
- `GET /api/groups`
- `POST /api/groups`
- `PATCH /api/groups`
- `POST /api/invitations`
- `POST /api/invitations/accept`
- `POST /api/transactions`
- `PATCH /api/transactions`
- `DELETE /api/transactions`

## MVP Features Included

1. Group Management
- Create group
- Rename group
- View group members

2. Invitations
- Invite by email
- Accept pending invitations

3. Transactions
- Add income
- Add expense
- Mark shared or personal

4. Dashboard
- Shared income total
- Shared expense total
- Personal totals
- Recent transactions
- Group switching

## Deploy

### Vercel
- Import repository
- Add all environment variables from `.env.local`
- Deploy

### Supabase
- Create project
- Execute [supabase/schema.sql](supabase/schema.sql)
- Configure JWT integration so `sub` maps to your auth provider user ID

## Notes

- This MVP intentionally excludes bank sync, AI insights, budgeting, multi-currency, recurring payments, OCR, exports, and advanced analytics.
- UI is mobile-first and includes loading skeletons, empty states, dialogs, and toast notifications.
