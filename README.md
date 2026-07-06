# Potentially.ai

AI-powered relationship intelligence and warm-introduction platform. Search your network in natural language, discover warm intro paths, visualize relationships, and generate personalized outreach.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In demo mode, sign in with any credentials to explore the full application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, TailwindCSS, shadcn/ui |
| State | React Query, Zustand |
| Backend | Supabase (Auth, PostgreSQL, RLS) |
| AI | OpenAI (Embeddings, RAG, Structured Outputs) |
| Vector Search | pgvector |
| Email | Resend |
| Billing | Stripe Checkout (optional) |

## Features

- **AI Search** — Natural language queries across all groups you belong to
- **Network Graph** — Interactive visualization across your combined network
- **Warm Introductions** — Request, track, and manage intro workflows
- **Outreach Engine** — AI-generated emails, LinkedIn messages, and intro requests
- **Groups** — Role-based teams (owner, admin, member, viewer) with invite links
- **Connectors** — Google Contacts, Outlook, CSV import (more in beta)
- **Analytics** — Aggregated usage across all your groups
- **Admin Panel** — Users, groups, feature flags
- **Playbooks** — ICP matching, assist-mode outreach, sequences, reply detection
- **Segments** — Saved contact lists for playbook targeting

## Playbooks (end-to-end test flow)

1. **Segments:** Contacts → Select for segment → save list, or create at `/segments`
2. **Playbook:** `/playbooks` → New playbook → ICP & settings tab (titles, dedupe, cooldown, Calendly URL)
3. **Sequence:** Sequence tab → add follow-up steps → Save
4. **Run:** Run & review → Match contacts → select → Finalize → Generate drafts
5. **Send:** Edit drafts inline → Approve & send (or Approve all). Start with **Dry run** checked.
6. **Prospect view:** Click a prospect name → Conversation / Calendly / simulate reply
7. **Audit:** Audit tab on playbook detail
8. **Admin:** Enable `platform_chat` for live prospect chat UI

Optional env for production email/replies:

```env
RESEND_WEBHOOK_SECRET=whsec_...   # POST /api/email/webhook
CRON_SECRET=...                   # POST /api/cron/playbook-sequences
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/you/15min
```

Simulate inbound reply in demo: prospect view → **Simulate inbound reply**, or `POST /api/playbooks/replies`.

**Automation levels:** `assist` (manual approve), `supervised` (draft queue + audit), `autonomous` (auto-send after generate drafts).

**External webhooks:**
- Resend → `POST /api/email/webhook`
- Calendly → `POST /api/calendly/webhook`
- Sequences cron → `POST /api/cron/playbook-sequences` with `Authorization: Bearer CRON_SECRET`


| Route | Description |
|-------|-------------|
| `/dashboard` | Overview widgets and live activity feed |
| `/search` | AI-powered search across all groups |
| `/network` | Relationship graph (all groups) |
| `/contacts` | Contact directory (all groups) |
| `/segments` | Saved contact lists |
| `/playbooks` | Outreach playbooks & runs |
| `/groups` | Manage groups, members, connectors |
| `/invite?token=…` | Join a group (sign in or sign up) |
| `/pricing` | Plans with Stripe checkout when configured |
| `/admin` | Admin panel (admin users only) |

`/workspace` redirects to `/groups` for backwards compatibility.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_...
EMAIL_FROM=Potentially <onboarding@yourdomain.com>

# Optional Stripe billing
STRIPE_SECRET_KEY=sk_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe setup

1. Create a Product + recurring Price in the [Stripe Dashboard](https://dashboard.stripe.com)
2. Add the three Stripe variables above to `.env`
3. **Local webhooks:** `stripe listen --forward-to localhost:3000/api/billing/webhook`
4. **Production:** add webhook endpoint `https://your-domain.com/api/billing/webhook` for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

Checkout stores `workspace_id` and `plan` in metadata; the webhook sets that group's `plan` to `pro` (or `free` on cancellation).

## API Architecture

Search, sync, and outreach run in **Next.js API routes** (`src/app/api/`). Supabase Edge Functions in `supabase/functions/` are optional legacy references — the app does not require them for core features.

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | AI search (all groups, plan limits enforced) |
| POST | `/api/groups/join` | Join a group from invite token |
| POST | `/api/billing/checkout` | Start Stripe checkout or manual upgrade flow |
| POST | `/api/billing/webhook` | Stripe webhook (subscription → group plan) |
| GET | `/api/dashboard` | Stats + recent activity feed |
| POST | `/api/intros` | Request an introduction |

## Testing

```bash
npm run test          # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright, demo mode)
npm run typecheck     # TypeScript
npm run lint          # ESLint
```

CI runs lint, typecheck, unit tests, build, and E2E on push/PR to `main`.

## Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` (or omit Supabase credentials) to run with in-memory data.

## License

MIT
