# VAAP application analysis

## Scope

This is a codebase analysis of the current application state. It describes the
implemented architecture and delivery risks; it does not assess production
configuration, database contents, infrastructure, or third-party accounts.

## Architecture at a glance

The application is a single Next.js 16 App Router project using React 19 and
TypeScript. It serves four main experiences from one deployment:

1. Public marketing, governance, news, event, support, and membership pages.
2. A signed-in member dashboard for profile, membership, events, referrals,
   documents, notifications, and support activities.
3. A staff/administrator area for content, applications, members, settings,
   and operational workflows.
4. A small API surface for Better Auth and membership certificate generation.

The backend is intentionally co-located with the UI. Server Actions in
`app/actions/` perform reads and mutations, and route handlers under `app/api/`
cover the two HTTP-oriented integrations. PostgreSQL is accessed through
node-postgres and Drizzle; the table definitions are centralized in
`lib/db/schema.ts`.

## Request and data flow

```text
Browser request
  -> Next proxy adds pathname header
  -> Root layout applies the coming-soon gate
  -> Route server component loads session + page data
  -> Client component submits a Server Action when a mutation is needed
  -> Server Action checks session/role, writes with Drizzle, revalidates routes
  -> PostgreSQL persists application, CMS, member, referral, and audit data
```

The root layout's launch gate allows public access to `/`, membership
application/verification routes, authentication, API routes, and the internal
areas. Elevated roles bypass the gate. Dashboard and admin layouts perform
their own authentication checks before rendering their shells.

## Authentication and authorization

Better Auth provides email/password authentication and seven-day sessions.
The user schema has six application roles: `member`, `staff`,
`committee_head`, `committee_member`, `kol`, and `admin`.

`lib/permissions.ts` is the central capability catalogue. It is used for
member-dashboard abilities such as article publication and referral management.
The staff/admin action modules also use local guards for operational actions;
for example, CMS and core admin actions require staff or admin, while referral
reward administration requires admin.

Authentication events create welcome, verification, and sign-in notifications.
Email delivery is configured through Gmail SMTP when credentials are present;
otherwise reset links are logged by the application.

## Domain model and primary workflows

The schema covers these domains:

| Domain | Main records | Workflow |
| --- | --- | --- |
| Content | pages, news, events, publications, documents, leadership, committees | Staff manage content through server actions; public routes render published records. |
| Membership | applications, plans, FAQs, members | Visitors apply and pay; staff review applications; approved members receive a membership record and certificate-related data. |
| Support | contact messages, complaints | Visitors submit requests or cases; the public case reference supports tracking. |
| Community | event RSVPs, member-submitted events, articles | Members register, submit events, and create/review articles according to role. |
| Referrals | campaigns, partners, codes, clicks, attributions, rules, rewards, batches, payments | Attribution starts at referral capture and continues through membership approval to reward and payout workflows. |
| Operations | settings, audit logs, notifications, staff profiles | Staff configure site content and review operational data; significant CMS writes attempt audit logging. |

Membership pricing and payment presentation are server-side. Card payment is
integrated through Stripe, while crypto payment configuration is read from
environment variables. Crypto rates use CoinGecko with a short cache and a
documented fallback rate when the provider is unavailable.

## Configuration dependencies

The application requires `DATABASE_URL` for PostgreSQL. Other runtime
configuration includes the Better Auth base URL, Stripe credentials, Gmail
SMTP credentials, public site URL, and cryptocurrency wallet addresses.
Migration SQL is stored as ordered scripts in `scripts/`; the repository does
not currently show an automated migration runner in package scripts.

## Delivery observations and priorities

1. **Add an automated quality gate.** `package.json` exposes only `dev`,
   `build`, and `start`. Add type-checking, linting, and focused test scripts,
   then enforce them in CI. `next.config.mjs` currently sets
   `typescript.ignoreBuildErrors: true`, so a production build alone will not
   reliably surface TypeScript errors.
2. **Make schema migration execution explicit.** The SQL files are
   incremental and idempotent, but the default developer workflow does not
   declare how they are applied or tracked. Adopt a migration command and
   document deployment ordering.
3. **Consolidate authorization guards.** Permission definitions are centralized
   while several action modules still define their own staff/admin checks.
   Reusable guard helpers would reduce policy drift as more roles and actions
   are added.
4. **Define operational ownership for fallbacks.** Email reset links can fall
   back to application logs and crypto prices can fall back to indicative
   values. Monitoring and runbooks should make these fallback states visible
   to staff.
5. **Specify observability and recovery.** Add structured error reporting,
   health checks, database backup/restore expectations, and audit-log retention
   requirements before treating the operational tools as production-critical.

## Suggested next milestone

Start with delivery safety: add `typecheck`, lint, and representative unit or
integration tests for permission checks, membership approval, referral reward
creation, and the public coming-soon gate. This gives the existing broad
feature set a reliable regression signal before further feature expansion.
