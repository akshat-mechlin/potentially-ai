# Potentially.ai

AI-powered relationship intelligence and warm-introduction platform. Search your network in natural language, discover warm intro paths, visualize relationships, and generate personalized outreach.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server (demo mode works without Supabase)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In demo mode, sign in with any credentials to explore the full application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, TailwindCSS, shadcn/ui |
| State | React Query, Zustand |
| Forms | React Hook Form, Zod |
| Animation | Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, RLS, Edge Functions) |
| AI | OpenAI (Embeddings, RAG, Structured Outputs) |
| Vector Search | pgvector |
| Deployment | Vercel, Docker, GitHub Actions |

## Project Structure

```
potentially-ai/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── (app)/              # Authenticated routes
│   │   ├── (auth)/             # Login, signup, forgot password
│   │   └── api/                # REST API endpoints
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Sidebar, header, command menu
│   │   ├── search/             # AI search interface
│   │   ├── network/            # Graph visualization
│   │   └── ...
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   ├── ai/                 # OpenAI integration
│   │   └── demo-data.ts        # Demo mode seed data
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # SQL schema + RLS policies
│   └── functions/              # Edge Functions (sync, AI search)
├── scripts/seed.ts             # Database seed script
├── e2e/                        # Playwright E2E tests
└── .github/workflows/          # CI/CD pipeline
```

## Features

- **AI Search** — Natural language queries with vector search, ranking, and reasoning
- **Network Graph** — Interactive visualization with zoom, search, and path finding
- **Warm Introductions** — Request, track, and manage intro workflows
- **Outreach Engine** — AI-generated emails, LinkedIn messages, and intro requests
- **Contact Management** — Search, filter, profile views with AI summaries
- **Data Ingestion** — Google, Outlook, Gmail, Calendar, CSV import pipelines
- **Team Workspaces** — Role-based access (owner, admin, member, viewer)
- **Analytics** — Searches, engagement, growth trends
- **Admin Panel** — Users, workspaces, feature flags

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/features` | Feature overview |
| `/pricing` | Pricing plans |
| `/login` | Authentication |
| `/signup` | Registration |
| `/dashboard` | Overview widgets |
| `/search` | AI-powered search |
| `/network` | Relationship graph |
| `/contacts` | Contact directory |
| `/contacts/[id]` | Contact profile + outreach |
| `/intros` | Introduction tracking |
| `/workspace` | Connections & team |
| `/analytics` | Usage analytics |
| `/settings` | User preferences |
| `/admin` | Admin panel |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Google and Azure OAuth in Authentication → Providers
3. Run migrations (see `supabase/migrations/README.md` for sequence):

```bash
npm run db:validate   # verify local migration order
npx supabase link --project-ref your-project-ref
npx supabase db push
```

4. Seed the database:

```bash
npm run seed
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | AI-powered network search |
| POST | `/api/outreach` | Generate outreach messages |
| GET | `/api/contacts` | List contacts |
| POST | `/api/contacts` | Import contacts (CSV) |
| GET | `/api/graph` | Network graph data |
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/analytics` | Analytics data |
| POST | `/api/sync` | Start data sync job |
| POST | `/api/workspaces` | Create workspace |

## Deployment

### Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Docker

```bash
docker-compose up --build
```

### Edge Functions

```bash
npx supabase functions deploy sync-contacts
npx supabase functions deploy ai-search
```

## Testing

```bash
npm run test          # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run lint          # ESLint
npm run typecheck     # TypeScript
```

## Demo Mode

Without Supabase credentials, the app runs in demo mode with:
- Pre-populated contacts, companies, and relationships
- Working AI search (mock ranking without OpenAI key)
- Full UI navigation and interactions
- Login with any email/password

## License

MIT
