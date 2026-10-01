# Bastion Move Studio: Architectural Specification & Production Verification

This document is the **authoritative single source of truth** for the architectural design, security controls, multi-tenant database partitioning, and verification test outputs across **Gate 1** ("Before any real client logs in") and **Gate 2** ("Before the first client site is public") for Bastion Move Studio.

---

## 1. Executive Summary & Verification State

- **Branch**: `main` on repository `MalcolmGov/Goldfields`
- **Initial Baseline Commit**: `35a30cf` (from `origin/cursor/bastion-tenant-auth-00a8`)
- **Gate 1 & Gate 2 Hardening Commit**: `872d979`
- **Full Capabilities & CI Commit**: `f0a4493`
- **Automated Verification Test Suite**: **17 Passed / 0 Failed (100% Pass Rate)**
- **Next.js Production Build**: Clean compile (All 76 routes static & dynamic, exit code 0)
- **CI Automation**: Active via [`.github/workflows/ci.yml`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/.github/workflows/ci.yml)

### Automated Test Suite Execution Output
```text
============================================================
🛡️  BASTION MOVE STUDIO: GATES 1 & 2 VERIFICATION SUITE
============================================================

✓ Move Studio multi-tenant seed complete (4 clients, 4 websites, commercial pipeline & proposal PRO-2026-BASTION).
📦 SUITE 1: Versioned Migrations & Database Architecture
  ✅ [PASS] Migrations -> schema_migrations table exists and records ordered versions
  ✅ [PASS] Migrations -> No arbitrary UPDATE client_id = client_goldfields executed on unassociated rows

📦 SUITE 2: Per-Site API Tokens & Scope Security
  ✅ [PASS] API Tokens -> Generate a scoped API token for client_vodacom_group
  ✅ [PASS] API Tokens -> Verify generated token validates with matching client_id and scopes
  ✅ [PASS] API Tokens -> Reject token when requesting unauthorized scope (admin:write)
  ✅ [PASS] API Tokens -> Revoked token immediately fails authentication

📦 SUITE 3: Auth Hardening & Account Lockout
  ✅ [PASS] Auth -> Create user with scrypt hash and verify timing-safe check
  ✅ [PASS] Auth -> Consecutive failed login attempts increment counter and trigger 15-min lockout at 5

📦 SUITE 4: Media Upload Safety & SVG Sanitization
  ✅ [PASS] Upload Safety -> Detect malicious XSS scripts and handlers in SVG uploads

📦 SUITE 5: Two-Person Workflow Guard & Approval Invalidation
  ✅ [PASS] Workflow -> Author cannot approve their own financial disclosure (Two-Person Rule)
  ✅ [PASS] Workflow -> Editing an approved record invalidates approval and resets status to draft

📦 SUITE 6: HTTP Security, Headless Content & Cron Worker
  ✅ [PASS] HTTP Security -> Headless Content API rejects unauthenticated requests (401)
  ✅ [PASS] HTTP Security -> Cron releases worker fails closed without CRON_SECRET (401)

📦 SUITE 7: Hosted Database Architecture & Survivability
  ✅ [PASS] Hosted DB -> getDatabaseInfo reports database connection state and mode

📦 SUITE 8: Real Transactional Email Delivery & Audit Logging
[Email Service - Simulated Dev] To: test_invite_1790859439213@bastionclient.com | Subject: "Welcome to the Bastion Corporate CMS Portal" | Link: http://localhost:3010/admin/invite?token=test_tok
  ✅ [PASS] Email Delivery -> sendTransactionalEmail dispatches email and writes to email_deliveries audit table

📦 SUITE 9: Page Version History & Rollback System
  ✅ [PASS] Version History -> Saving page creates incremental immutable snapshots in page_versions and supports rollback

📦 SUITE 10: RBAC Permission Enforcement on Editor Actions
  ✅ [PASS] RBAC Permissions -> Verify granular role permission checks for content and editor actions

============================================================
TOTAL: 17 | PASSED: 17 | FAILED: 0
============================================================
```

---

## 2. Baseline Tenant Authentication & Route Security

All capabilities build upon the non-negotiable security baseline merged from `origin/cursor/bastion-tenant-auth-00a8` (`35a30cf`):
1. **Cookie-Enforced Sessions**: Access to `/admin` and `/api/admin` requires an active `gf_studio_session` HTTP cookie. Unauthenticated browser traffic is redirected to `/admin/login?next=...`, and API traffic receives HTTP `401 Unauthorized`.
2. **Agency Route Protection**: Agency-only administrative surfaces (client creation, commercial billing, brand kit extraction, SRE probers, GitHub integrations, and package exports) strictly reject client tenant users with HTTP `403 Forbidden`.
3. **Tenant Boundary Scoping**: Content records, media assets, releases, and client lists are strictly scoped by the authenticated user's `client_id`. Client users cannot view or manipulate data belonging to other organizations.
4. **Fail-Closed Secrets**: Public Headless API (`/api/content/...`), GraphQL (`/api/graphql`), and MCP endpoints fail closed with HTTP `401 Unauthorized` without a valid token. Demo or hardcoded legacy secrets are explicitly banned.
5. **Per-User Scrypt Passwords**: Password verification uses per-user salt with scrypt (N=16384, r=8, p=1). Demo accounts are created only from environment variables and raw passwords are never returned in JSON.
6. **Git Untracking**: `studio.db` is untracked and excluded from git via `.gitignore`.

---

## 3. Gate 1 Specification: "Before Any Real Client Logs In"

### 3.1 Hosted Database Architecture (`@libsql/client`)
- **Primary Source**: [`src/lib/db/client.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/lib/db/client.ts)
- **Problem**: Ephemeral `/tmp/studio.db` files are wiped on serverless platforms (Vercel lambda instances) upon redeploys or function restarts.
- **Architecture**:
  - The client is engineered around a cloud-hosted LibSQL / Turso database (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`).
  - Production environments without a hosted database URL emit an architectural alert.
  - Local development and offline CI runs seamlessly fall back to local `file:studio.db`.
  - Added [`getDatabaseInfo()`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/lib/db/client.ts#L19-L30) diagnostic helper reporting connection mode (`hosted_turso` vs `local_file`), sanitized URL, and authentication token presence.

### 3.2 Ordered Versioned Migrations (`schema_migrations`)
- **Primary Source**: [`src/lib/db/migrations.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/lib/db/migrations.ts)
- **Problem**: Scattered `ALTER TABLE` statements caused fragile bootstrap sequences, and boot routines arbitrarily mutated unassociated rows to `client_goldfields`.
- **Architecture**:
  - Migration engine tracking ordered versions in table `schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`.
  - Migrations execute strictly in ascending numerical order inside transactions, halting immediately on error.
  - **Permanently Eliminated**: All boot-time mutations (`UPDATE users SET client_id = 'client_goldfields'`) were permanently removed from `src/lib/db/client.ts` and `src/lib/studio/seedMultiTenant.ts`.
  - **Migration Catalog**:
    1. `001_initial_schema`: Core tables (`users`, `sessions`, `content_records`, `revisions`, `approvals`, `audit_log`, `scheduled_jobs`, `media_assets`, `websites`, `clients`, `page_compositions`).
    2. `002_tenant_columns`: Guaranteed `client_id` foreign keys without destructive updates.
    3. `003_api_tokens`: Scoped API credential storage (`id`, `name`, `token_hash`, `client_id`, `site_id`, `scopes_json`, `created_at`, `revoked_at`).
    4. `004_auth_lockout_and_invites`: Account lockout and invite columns on `users`.
    5. `005_approvals_hash`: Added `content_hash_at_approval` column.
    6. `006_billing_compliance`: Added SARS compliance particulars to `billing_docs`.
    7. `007_content_releases`: Added `content_releases` and `content_release_items` tables.
    8. `008_sre_and_probes`: Added `incidents` and `sla_probes` tables for SRE telemetry.
    9. `009_email_deliveries_and_page_versions`: Added `email_deliveries` and `page_versions` tables.

### 3.3 Per-Site Scoped API Tokens (`api_tokens`)
- **Primary Source**: [`src/lib/auth/apiToken.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/lib/auth/apiToken.ts)
- **Management Endpoint**: [`/api/admin/settings/tokens`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/settings/tokens/route.ts)
- **Architecture**:
  - Tokens are formatted `bst_tok_<base64url>` and stored exclusively as SHA-256 hashes in `api_tokens`.
  - Issued with explicit permission scopes (`content:read`, `graphql:read`, `mcp:access`, `admin:write`) bound to a specific `client_id` and optional `site_id`.
  - Headless API ([`src/app/api/content/[collection]/route.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/content/[collection]/route.ts) and [`src/app/api/content/[collection]/[slug]/route.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/content/[collection]/[slug]/route.ts)), GraphQL API ([`src/app/api/graphql/route.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/graphql/route.ts)), and MCP ([`src/app/api/mcp/route.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/mcp/route.ts)) resolve the tenant directly from the token and scope all database operations.

### 3.4 Auth Hardening, Account Lockout & Tokenized Invites
- **Endpoints**:
  - Login: [`/api/admin/auth/login`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/auth/login/route.ts)
  - Invites: [`/api/admin/users/invite`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/users/invite/route.ts)
  - Accept Invite: [`/api/admin/auth/accept-invite`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/auth/accept-invite/route.ts)
- **Architecture**:
  - **Account Lockout**: Tracks `failed_login_attempts`. On 5 consecutive failures, locks the account for 15 minutes (`locked_until`), returning HTTP `423 Locked`. Successful login clears the counter.
  - **Tokenized Invites**: Replaced temporary plaintext passwords with a 48-hour expiring invite token (`invite_token`). Raw passwords are never returned in responses.
  - **Accept Invite**: Validates token, hashes user's chosen password with scrypt, and starts an active session.

### 3.5 Real Transactional Email Delivery
- **Primary Source**: [`src/lib/email/delivery.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/lib/email/delivery.ts)
- **Architecture**:
  - Dispatches transactional emails via the Resend REST API when `RESEND_API_KEY` is configured.
  - Generates executive corporate welcome email templates ([`src/lib/email/welcomeTemplate.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/lib/email/welcomeTemplate.ts)).
  - Local/test environments fall back to `simulated_dev` mode without failing.
  - Every delivery attempt is logged in `email_deliveries` (`id`, `recipient_email`, `subject`, `status`, `provider`, `provider_message_id`, `created_at`).

### 3.6 Media Upload Safety & SVG Sanitization
- **Endpoint**: [`/api/admin/media/upload`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/media/upload/route.ts)
- **Architecture**:
  - 10MB maximum file size limit.
  - Strict MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `application/pdf`.
  - Active SVG XSS Regex Scanner: rejects SVG files containing `<script>`, `onload=`, `onerror=`, `onclick=`, `javascript:`, or `<foreignObject>`.
  - Mandatory `clientId` scoping on all asset uploads.

---

## 4. Gate 2 Specification: "Before the First Client Site is Public"

### 4.1 Client Custom Domains & Host-Header Tenant Routing
- **Primary Source**: [`src/middleware.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/middleware.ts)
- **Architecture**:
  - Dynamically extracts and normalizes the incoming `host` header.
  - Distinguishes platform agency hosts from client custom domains (e.g. `goldfields-bay.vercel.app`, `vodacom.co.za`, `*.apexadvisory.co.za`).
  - Rewrites client custom domain root (`/`) to `/sites/[siteSlug]` and subpages (`/[pageSlug]`) to `/sites/[siteSlug]/[pageSlug]`.
  - Injects tenant context headers: `x-tenant-site` and `x-tenant-domain`.

### 4.2 Search Engine Indexing & Dynamic Robots Rules
- **Modules**:
  - Robots: [`src/app/robots.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/robots.ts)
  - Sitemap: [`src/app/sitemap.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/sitemap.ts)
  - Middleware Headers: [`src/middleware.ts`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/middleware.ts)
- **Architecture**:
  - **Internal Route Isolation**: All `/admin`, `/api`, `/preview`, `/quote`, and `/invoice` routes receive `X-Robots-Tag: noindex, nofollow`.
  - **Dynamic Robots.txt**: Emits `Disallow: /` for admin, preview, or staging hosts. Emits `Allow: /` and advertises `/sitemap.xml` for public client production domains.
  - **Dynamic Sitemap.xml**: Automatically indexes all published pages from `page_compositions`.

### 4.3 Page-Version History & Rollback System
- **Endpoints & UI**:
  - Save: [`POST /api/admin/editor`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/editor/route.ts)
  - Versions: [`GET /api/admin/editor/versions`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/editor/versions/route.ts)
  - Rollback: [`POST /api/admin/editor/rollback`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/editor/rollback/route.ts)
  - Visual History Modal: [`src/app/admin/editor/page.tsx`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/admin/editor/page.tsx)
- **Architecture**:
  - Saving in the Visual Canvas increments the version counter (`MAX(version) + 1`) and persists an immutable snapshot in `page_versions`.
  - Visual editor toolbar features a `v{number} History` button opening the **Version History Modal**.
  - One-click rollback restores previous block layouts, increments the version number, creates an audit log entry, and updates the canvas live.

### 4.4 Granular RBAC Permission Guards on Every Editor Action
- **Architecture**:
  - `GET /api/admin/editor`: verifies `requirePermission('content:read')` and `assertSiteAccess`.
  - `POST /api/admin/editor` (draft): verifies `requirePermission('content:edit')` and `assertSiteAccess`.
  - `POST /api/admin/editor` (publish): verifies `requirePermission('content:publish')` and `assertSiteAccess`.
  - `POST /api/admin/editor/ai-polish`: verifies `requirePermission('content:edit')` and `assertSiteAccess`.
  - `POST /api/admin/editor/rollback`: verifies `requirePermission('content:edit')` and `assertSiteAccess`.

### 4.5 Scheduled Releases Promotion Worker
- **Endpoint**: [`/api/cron/releases`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/cron/releases/route.ts)
- **Architecture**:
  - Secured via `CRON_SECRET` through `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>`.
  - Scans `content_releases` for scheduled releases where `scheduled_at <= now()`.
  - Promotes all release items atomically to `published` in `content_records` and `page_compositions`.

### 4.6 Two-Person Corporate Governance & Draft Invalidation
- **Endpoints**:
  - Workflow: [`/api/admin/content/[collection]/[id]/workflow`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/content/[collection]/[id]/workflow/route.ts)
  - Edit: [`/api/admin/content/[collection]/[id]`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/src/app/api/admin/content/[collection]/[id]/route.ts)
- **Architecture**:
  - Enforces that for financial results, regulatory releases, and investor disclosures, the author cannot approve their own record (SOC2 / King IV governance rule).
  - Any edit to an approved record immediately invalidates the approval and resets its status to `draft`.

---

## 5. Automated Continuous Integration (CI)

- **Workflow File**: [`.github/workflows/ci.yml`](file:///Users/malcolmgovender/Desktop/Zara-AI/goldfields/.github/workflows/ci.yml)
- **Triggers**: On every `push` to `main` and all `pull_request` targeting `main`.
- **Pipeline Stages**:
  1. `actions/checkout@v4` & `actions/setup-node@v4` (Node.js 20.x with npm cache).
  2. `npm ci` (clean dependency installation).
  3. `npx tsx scripts/verify-production-gates.ts` (17 automated security and regression tests).
  4. `npm run build` (Next.js production compilation and TypeScript verification).

---

## 6. Commercial Capabilities (Zero Regressions)

All commercial assets previously developed remain active:
1. **Bastion Institutional Proposal (`PRO-2026-BASTION`)**:
   - Total Value: **R 820,000.00 Excl. VAT / R 943,000.00 Incl. 15% VAT**.
   - Accessible in `/admin/billing` alongside live billings for Gold Fields Limited (`INV-2026-GF01` Paid R 166,750.00) and Vodacom Group (`QUO-2026-VOD01` Sent R 322,000.00).
2. **Public Proposal & Signing Portal**:
   - Live at `/quote/tok_bastion_platform_proposal_2026` with digital signature canvas and PDF export.
3. **Client Experience Sandbox Mode**:
   - Interactive simulation banner (`ClientSandboxBanner`) with live client switcher (Vodacom Group, Gold Fields, Solaris, Apex) and instant toggle back to Bastion Agency Studio.
4. **Financial Results PDF-to-HTML Converter**:
   - Live under `/admin/results`, converting corporate earnings PDFs into responsive client HTML.
