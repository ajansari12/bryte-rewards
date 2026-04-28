# Bryte Rewards Codebase Exploration Report

## Project Overview
**Bryte** is a React-based peer recognition and rewards platform built with:
- **Frontend**: React 19.2.4, React Router 7, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL) with Edge Functions (Deno)
- **State Management**: TanStack React Query
- **Build Tool**: Vite 6

---

## 1. Admin Panel Components

### Location: `/src/components/Additions.tsx` and `/src/components/Extras.tsx`

#### **BillingPanel**
- **File Path**: `/tmp/cc-agent/66194858/project/src/components/Additions.tsx` (lines 751-817)
- **Purpose**: Displays subscription details, invoicing, and points pool management
- **Current Features**:
  - Shows current plan (e.g., "Growth plan · CA$4/teammate/month")
  - Displays active seats count and next invoice date
  - Shows 3 key metrics: Next invoice amount, Points pool remaining, Annual value
  - Invoice history table with date, amount, status (Paid/Pending), invoice ID
  - Buttons: "Top up points pool", "Change plan", "Export invoices"
  - Upsell section for Enterprise tier with features list
- **Data Structure**: Static/hardcoded data (no real API calls currently)
- **Components Used**: Icon, buttons, cards, pills

#### **IntegrationsPanel**
- **File Path**: `/tmp/cc-agent/66194858/project/src/components/Additions.tsx` (lines 821-850)
- **Purpose**: Manage third-party integrations (Slack, Teams, Workday, ADP, etc.)
- **Current Features**:
  - Grid layout of integration cards
  - Shows app name, color-coded icon, description
  - Connected status badge (green "● Connected" for active integrations)
  - "Connect" or "Manage" button based on connection status
  - Data sourced from: `BRYTE_DATA.INTEGRATIONS`
- **Integrations Listed** (from `/src/lib/data.ts`):
  - Slack (connected: true)
  - Microsoft Teams (connected: false)
  - Workday (connected: false)
  - ADP (connected: false)
  - HRIS Sync (connected: false)
  - Zapier (connected: false)
- **Query Hook**: `useIntegrations()` available in `/src/lib/queries/integrations.ts`

#### **ApprovalQueuePanel**
- **File Path**: `/tmp/cc-agent/66194858/project/src/components/Extras.tsx` (lines 398-466)
- **Purpose**: Managers/admins review and approve/deny redemption requests
- **Current Features**:
  - Shows count of pending approvals
  - Pending requests section with:
    - Avatar, requester name, reward name
    - Points amount, requested date, optional reason
    - "Decline" and "Approve" buttons
  - Recently processed section (table view):
    - Avatar, requester + reward, status (approved/denied), date
  - Approval state management with local React state
  - Toast notifications for approve/deny actions
- **Data Structure**: Uses `BRYTE_DATA.APPROVAL_QUEUE`
- **Database Support**: Can integrate with real data via:
  - `useApproveRedemption()` mutation (already exists)
  - Query for org redemptions via `qk.orgRedemptions()`

---

## 2. Supabase Edge Functions

All Edge Functions are written in Deno and located in `/supabase/functions/`

### **Function 1: invite-teammate**
- **File Path**: `/tmp/cc-agent/66194858/project/supabase/functions/invite-teammate/index.ts`
- **Trigger**: Manual edge function call
- **Purpose**: Invite a new teammate to the org
- **Auth**: Requires Bearer token; caller must be manager or admin in the org
- **Inputs**:
  - `email` (required): Email to invite
  - `org_id` (required): Organization ID
  - `role` (optional, default: "employee"): employee/manager/admin
- **Logic**:
  1. Validate authorization header and JWT
  2. Verify caller is manager/admin in the org
  3. Call Supabase Auth Admin API to invite user by email
  4. Return new user ID
- **Error Handling**: Returns 400 for missing params, 401 for unauthorized, 403 for forbidden

### **Function 2: on-recognition-insert**
- **File Path**: `/tmp/cc-agent/66194858/project/supabase/functions/on-recognition-insert/index.ts`
- **Trigger**: Database webhook (when recognitions are inserted)
- **Purpose**: Create notifications when recognition is given
- **Inputs**: Webhook payload with recognition record data
- **Logic**:
  1. Extract recognition details (sender, recipient, value, message, points)
  2. Fetch recipient's notification preferences and manager ID
  3. Fetch sender and value names for payload
  4. Insert notifications to:
     - Recipient (if in_app notifications enabled)
     - Recipient's manager (if they exist and team_recognition in_app enabled)
  5. Return count of notifications inserted
- **Notification Payload Structure**:
  ```
  {
    recognition_id, org_id, sender_name, recipient_name,
    value_name, message_snippet, points
  }
  ```

### **Function 3: weekly-digest**
- **File Path**: `/tmp/cc-agent/66194858/project/supabase/functions/weekly-digest/index.ts`
- **Trigger**: Scheduled via pg_cron (every Monday at 13:00 UTC)
- **Purpose**: Send weekly email digests to opted-in users
- **Auth**: Requires service_role JWT
- **External Dependencies**: Resend API (via `RESEND_API_KEY` env var)
- **Logic**:
  1. Validate service_role JWT
  2. Fetch all users with `email_digest` preference enabled
  3. Group users by organization
  4. For each org, fetch:
     - Top 5 recognitions by points (last 7 days)
     - New badges awarded (last 7 days)
     - Weekly leaderboard (top 5 recipients)
  5. Build HTML email using branded template
  6. Send via Resend API
- **Email Template Features**:
  - Bryte branding header
  - Top recognitions with value chips
  - Weekly leaderboard (top recipients)
  - New badges earned
  - Organization name and week label
  - Preference management link
- **Returns**:
  ```
  {
    orgs_processed: number,
    emails_sent: number,
    errors: string[]
  }
  ```

---

## 3. Database Schema

All tables use UUID primary keys and include RLS (Row-Level Security) policies. Located in `/supabase/migrations/`

### Core Tables

#### **organizations**
- `id` (uuid, pk)
- `name` (text)
- `industry` (text)
- `plan` (text) - free/growth/enterprise
- `points_pool_remaining` (int)
- `created_at` (timestamptz)
- **Policies**: Members can read their org; admins can update

#### **users**
- `id` (uuid, pk, refs auth.users)
- `org_id` (uuid, fk)
- `display_name` (text)
- `role` (text) - employee/manager/admin
- `title` (text)
- `avatar_url` (text)
- `points` (int)
- `manager_id` (uuid, nullable, self-reference)
- `start_date` (date)
- `notification_prefs` (jsonb) - {in_app, email_immediate, email_digest}
- **Policies**: Read teammates; update own profile

#### **rewards**
- `id` (uuid, pk)
- `org_id` (uuid, fk)
- `title` (text)
- `brand` (text)
- `denom` (text)
- `points` (int)
- `color` (text)
- `kind` (text) - giftcard/experience/etc
- `active` (boolean)
- **Policies**: All org members read; admins manage

#### **redemptions**
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `reward_id` (uuid, fk)
- `points_spent` (int)
- `status` (text) - pending/approved/fulfilled/cancelled
- `requested_at` (timestamptz)
- `processed_at` (timestamptz, nullable)
- `processed_by` (uuid, nullable)
- **Policies**: Users see own; managers/admins see all in org

#### **recognitions**
- `id` (uuid, pk)
- `org_id` (uuid, fk)
- `sender_id` (uuid, fk)
- `recipient_id` (uuid, fk)
- `value_id` (uuid, fk, nullable)
- `message` (text)
- `points` (int)
- `type` (text) - public/private/milestone/spotlight
- `created_at` (timestamptz)
- **Policies**: Public/milestone/spotlight visible to org; private only to sender/recipient

#### **values**
- `id` (uuid, pk)
- `org_id` (uuid, fk)
- `name` (text)
- `icon` (text)
- `points` (int) - points awarded per recognition
- `sort_order` (int)
- **Policies**: All read; managers/admins manage

#### **badges**
- `id` (uuid, pk)
- `org_id` (uuid, fk)
- `name` (text)
- `icon` (text)
- `category` (text)
- `criteria` (text)
- `is_seasonal` (boolean)
- **Policies**: All read; admins manage

#### **user_badges**
- `user_id` (uuid) + `badge_id` (uuid) = composite PK
- `awarded_at` (timestamptz)
- **Policies**: All read; admins award/revoke

#### **nominations**
- `id` (uuid, pk)
- `org_id` (uuid, fk)
- `badge_id` (uuid, fk)
- `nominator_id` (uuid, fk)
- `nominee_id` (uuid, fk)
- `reason` (text)
- `status` (text) - pending/approved/rejected
- `created_at` (timestamptz)
- **Policies**: All read; users nominate; admins approve

#### **reactions**
- `recognition_id` (uuid) + `user_id` (uuid) + `emoji` (text) = composite PK
- **Policies**: Users add/remove own reactions

#### **comments**
- `id` (uuid, pk)
- `recognition_id` (uuid, fk)
- `author_id` (uuid, fk)
- `body` (text)
- `created_at` (timestamptz)
- **Policies**: All read; users post; authors edit/delete

#### **notifications**
- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `kind` (text) - recognition/team_recognition/badge/etc
- `payload_json` (jsonb) - flexible payload structure
- `read_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- **Policies**: Users read/update own rows

#### **integrations**
- `org_id` (uuid) + `kind` (text) = composite PK
- `connected_at` (timestamptz)
- `config_json` (jsonb) - stores API keys, tokens, settings
- **Policies**: All org members read; admins manage

### Helper Functions

#### **get_my_org_id()**
- **Type**: SQL function (STABLE, SECURITY DEFINER)
- **Purpose**: Used in RLS policies to scope queries to current user's org
- **Returns**: `org_id` from users table for `auth.uid()`

#### **redeem_reward(p_reward_id, p_user_id)**
- **Type**: PL/pgSQL function (SECURITY DEFINER)
- **Purpose**: Atomic redemption with point deduction
- **Logic**:
  1. Verify caller is the user making redemption
  2. Fetch reward cost and org
  3. Check user has sufficient points
  4. Create redemption record (status: pending)
  5. Deduct points from user
  6. Deduct from org pool
  7. Return redemption ID
- **Error Cases**: unauthorized, reward not found, insufficient points

---

## 4. Project Structure

```
/src
  /components
    - AppShell.tsx (main layout, route rendering)
    - Pages.tsx (AdminPage, RewardsPage, etc.)
    - Additions.tsx (ProfilePage, SearchPalette, BillingPanel, IntegrationsPanel, etc.)
    - Extras.tsx (ApprovalQueuePanel, OrgChartPanel, useFocusTrap hook)
    - Auth.tsx (login, signup)
    - Feed.tsx (recognition feed)
    - GiveModal.tsx (create recognition)
    - Icon.tsx (icon component)
    - IosFrame.tsx, Mobile.tsx (mobile preview)
    - Shell.tsx, Mobile.tsx, Extras2.tsx (UI components)

  /context
    - AppContext.tsx (global app state: theme, modals, toasts, industry)

  /lib
    /auth
      - requireSession.ts (route guard)
    /queries
      - users.ts (useCurrentUser, useCurrentOrg, useOrgUsers, useDirectReports)
      - recognitions.ts (useMyRecognitions, useOrgRecognitions, etc.)
      - rewards.ts (useRewards, useRedemptions, etc.)
      - integrations.ts (useIntegrations)
      - badges.ts, leaderboard.ts, analytics.ts, keys.ts
      - notifications.ts
      - values.ts
    /mutations
      - useRequestRedemption.ts (calls redeem_reward RPC)
      - useApproveRedemption.ts (updates redemption status)
      - useGiveRecognition.ts
      - useInviteTeammate.ts
      - useNominateBadge.ts
      - useAddReaction.ts
      - useUpdateValues.ts
      - useMarkNotificationsRead.ts
      - useUpdateNotificationPrefs.ts
    - supabase.ts (Supabase client init)
    - types.ts (TypeScript interfaces)
    - data.ts (BRYTE_DATA constant with sample data)
    - hooks/useNotificationSync.ts

  /routes
    - Root.tsx (legacy, no longer used)

  - main.tsx (React entry)
  - router.tsx (React Router config)

/supabase
  /functions
    - invite-teammate/index.ts
    - on-recognition-insert/index.ts
    - weekly-digest/index.ts

  /migrations
    - 001_orgs_and_users.sql
    - 002_values_recognitions_reactions_comments.sql
    - 003_badges_nominations.sql
    - 004_rewards_redemptions.sql
    - 005_notifications_integrations.sql
    - 006_redeem_reward_rpc.sql
    - 007_notification_prefs.sql
    - 008_pg_cron_digest_schedule.sql

  /seeds (empty)

/public (static assets)

- vite.config.ts
- tsconfig.json
- package.json
- eslint.config.mjs
```

### UI Library
- **Styling**: Tailwind CSS 4 (not shadcn/ui)
- **Components**: Custom-built using HTML + inline styles
- **CSS Variables**: Custom theme variables (--b-gold, --b-ink, --b-forest, etc.)

---

## 5. Existing Integrations

### Status in Codebase:
- **Slack**: Listed as "connected: true" (sample data)
- **Resend**: Email service (integrated in weekly-digest function)
- **Stripe**: Not found in codebase
- **Others**: Placeholder integrations (Teams, Workday, ADP, HRIS, Zapier) with no backend implementation

### Integration Storage
- **Database**: `integrations` table with composite PK (org_id, kind)
- **Config Storage**: `config_json` column stores API keys/tokens/settings
- **Query Hook**: `useIntegrations()` fetches all integrations for org

---

## 6. Authentication & Org Context

### How It Works:

1. **Session Management**:
   - Supabase Auth handles JWT sessions
   - `requireSession()` guards routes
   - On sign-out: redirect to `/login`

2. **Org Discovery**:
   - User logs in via Supabase Auth
   - `useCurrentUser()` query fetches user row with `org_id`
   - `useCurrentOrg()` query fetches org details using `org_id`
   - Every query scopes via RLS policies using `get_my_org_id()` function

3. **RLS Policies Pattern**:
   ```sql
   USING (org_id = get_my_org_id())
   ```
   This ensures users only see data for their organization

4. **Role-Based Access**:
   - Roles: employee / manager / admin
   - Stored in `users.role` column
   - Policies check role in WHERE clause, e.g.:
   ```sql
   WHERE id = auth.uid() AND role IN ('manager', 'admin')
   ```

---

## 7. Server-Side Functions & Mutations

### Query Functions (React Query hooks in `/src/lib/queries/`)

| Function | Purpose | Scope |
|----------|---------|-------|
| useCurrentUser() | Get logged-in user profile | Single user |
| useCurrentOrg() | Get org details | Single org |
| useOrgUsers() | List all users in org | Org-wide |
| useDirectReports() | List users reporting to logged-in user | User's reports |
| useOrgRecognitions() | Get recognitions visible to user | Org-wide (RLS filtered) |
| useMyRecognitions() | Get recognitions where user is recipient | User-specific |
| useRewards() | List active rewards in org | Org-wide |
| useRedemptions() | Get user's redemption history | User-specific |
| useBadges() | Get badges (with earned status) | Org-wide |
| useIntegrations() | Get connected integrations | Org-wide |
| useNotifications() | Get user's notifications | User-specific |

### Mutation Functions (React Query mutations in `/src/lib/mutations/`)

| Function | Purpose | Backend |
|----------|---------|---------|
| useRequestRedemption() | Create redemption request | Calls `redeem_reward()` RPC |
| useApproveRedemption() | Approve/deny redemption | Direct table UPDATE |
| useGiveRecognition() | Create recognition | Direct table INSERT (webhook triggers notification) |
| useInviteTeammate() | Invite user to org | Calls Edge Function |
| useNominateBadge() | Submit badge nomination | Direct table INSERT |
| useAddReaction() | React to recognition | Direct table INSERT/DELETE |
| useUpdateValues() | Modify org values | Direct table UPDATE |
| useMarkNotificationsRead() | Mark notifications as read | Direct table UPDATE |
| useUpdateNotificationPrefs() | Update user notification settings | Direct table UPDATE (notification_prefs) |

### Edge Functions (Callable via HTTP or scheduled)

| Function | Trigger | Purpose |
|----------|---------|---------|
| invite-teammate | HTTP POST | Send invitation email via Supabase Auth Admin |
| on-recognition-insert | Database webhook | Create notifications on recognition creation |
| weekly-digest | pg_cron (Mondays 13:00 UTC) | Send email digests to opted-in users |

---

## 8. Key Observations

### Strengths:
1. **RLS-First Design**: All queries use RLS policies for security
2. **Atomic Transactions**: Redemption uses a PL/pgSQL function for point deduction
3. **Email Integration**: Resend for transactional + digest emails
4. **Scheduled Jobs**: pg_cron for weekly digests
5. **Webhook Support**: Database webhooks for recognition notifications
6. **Real-time Ready**: Supabase RealtimeSubscriptions can be added

### Current Gaps (Placeholder Components):
1. **BillingPanel**: Hardcoded data, no real Stripe integration
2. **IntegrationsPanel**: UI complete, backend not implemented for most integrations
3. **ApprovalQueuePanel**: Uses local state, needs real data from `redemptions` table

### Naming:
- **Industry pack metadata**: `BRYTE_DATA` (constant in `/src/lib/data.ts`)
- **App context/state**: `AppContext` in `/src/context/AppContext.tsx`
- **Sample data vs live data**: Sample data has prefixes like `SAMPLE_`, hardcoded IDs
