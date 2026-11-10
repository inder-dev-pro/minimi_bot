-- Minimi seed data
-- Pre-populates the database with sample conversations so reviewers can
-- see how the agent works immediately, even without API keys configured.

-- Demo conversation 1: Postgres hosting pricing
INSERT OR IGNORE INTO conversations (id, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-11-08 10:30:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user',
   'What are the current Postgres hosting options and their pricing?',
   '2026-11-08 10:30:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'assistant',
   'Here''s a summary of the main managed Postgres hosting options and their current pricing tiers:

1. **Supabase** — Free tier includes 500 MB database, 2 GB bandwidth. Pro plan starts at $25/month for 8 GB database, 250 GB bandwidth [1].

2. **Neon** — Free tier offers 0.5 GiB storage with autoscaling. Launch plan at $19/month, Scale at $69/month with branching and increased compute [2].

3. **Railway** — Usage-based pricing starting at $5/month for the Hobby plan. Pro plan at $20/user/month with 100 GB included storage [3].

4. **Render** — Free tier with 1 GB storage (90-day expiry). Starter at $7/month, Standard at $20/month with 20 GB SSD [4].

5. **AWS RDS** — db.t4g.micro free tier eligible for 12 months. On-demand pricing starts around $0.016/hr for the smallest instances [5].

Note: Pricing changes frequently — I''d recommend checking each provider''s pricing page directly for the most current figures.',
   '2026-11-08 10:30:15');

-- Sources for the Postgres pricing answer
INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND role = 'assistant' LIMIT 1),
   'Supabase Pricing', 'https://supabase.com/pricing',
   'Free plan: 500 MB database, 2 GB bandwidth, 50K monthly active users. Pro plan: $25/month — 8 GB database, 250 GB bandwidth, 100K MAU.',
   '2026-11-01', 0.95);

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND role = 'assistant' LIMIT 1),
   'Neon Pricing Plans', 'https://neon.tech/pricing',
   'Free: 0.5 GiB storage, autoscaling. Launch: $19/mo, 10 GiB storage. Scale: $69/mo, 50 GiB storage with branching.',
   '2026-11-05', 0.92);

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND role = 'assistant' LIMIT 1),
   'Railway Pricing', 'https://railway.app/pricing',
   'Hobby: $5/mo. Pro: $20/user/mo with 100 GB included storage and priority support.',
   '2026-10-28', 0.88);

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND role = 'assistant' LIMIT 1),
   'Render Managed PostgreSQL', 'https://render.com/pricing',
   'Free: 1 GB, 90-day expiry. Starter: $7/mo, 1 GB SSD. Standard: $20/mo, 20 GB SSD.',
   '2026-11-02', 0.85);

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND role = 'assistant' LIMIT 1),
   'Amazon RDS for PostgreSQL Pricing', 'https://aws.amazon.com/rds/postgresql/pricing/',
   'db.t4g.micro: Free tier eligible (12 months). On-demand starts at $0.016/hr for db.t4g.micro in us-east-1.',
   '2026-10-15', 0.82);

-- Follow-up in the same conversation
INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'user',
   'Which of those is best for a small side project with less than 1000 users?',
   '2026-11-08 10:32:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'assistant',
   'For a small side project under 1,000 users, I''d rank them:

1. **Neon** (top pick) — Their free tier auto-scales compute to zero when idle, so you pay nothing until you actually have traffic. 0.5 GiB is plenty for a small app, and branching is great for dev/preview environments.

2. **Supabase** — The free tier is generous (500 MB, 50K MAU) and you get auth, storage, and real-time subscriptions bundled in. Great if you want a full backend-as-a-service.

3. **Render** — $7/mo Starter is solid and simple, but the free tier''s 90-day expiry makes it risky for anything you want to keep running.

4. **Railway** — Clean DX but the $5/mo minimum adds up compared to truly free options.

For a side project you don''t want to babysit, Neon''s scale-to-zero is hard to beat — you literally pay $0 when nobody''s using it.',
   '2026-11-08 10:32:20');


-- Demo conversation 2: Quick factual question
INSERT OR IGNORE INTO conversations (id, created_at) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-11-09 14:00:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'user',
   'What is the mass of the Earth in kilograms?',
   '2026-11-09 14:00:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'assistant',
   'The mass of the Earth is approximately 5.972 × 10²⁴ kg (5,972,000,000,000,000,000,000,000 kg). This is a well-established physical constant — no web search needed for this one!',
   '2026-11-09 14:00:05');


-- Demo conversation 3: Time-aware follow-up
INSERT OR IGNORE INTO conversations (id, created_at) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-11-06 09:15:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'user',
   'What are the latest features released in Next.js?',
   '2026-11-06 09:15:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'assistant',
   'Here are the most notable recent Next.js features and releases:

**Next.js 15 (stable)** brought several significant changes [1][2]:

- **React 19 support** — Full integration with React 19, including Server Actions as a stable API
- **Turbopack (stable)** — The Rust-based bundler is now stable for `next dev --turbopack`, offering 75% faster local server startup
- **Partial Prerendering (PPR)** — Experimental feature that combines static shells with dynamic content streaming
- **`next/after`** — New API for deferring work (analytics, logging) until after the response has finished streaming
- **Enhanced caching** — `fetch` requests and `GET` Route Handlers are no longer cached by default, giving developers more explicit control
- **`next.config.ts`** — TypeScript config file support

**Next.js 15.1** added [3]:
- `forbidden()` and `unauthorized()` helpers for auth-related error boundaries
- Improved error debugging with source maps

Check the official blog at nextjs.org/blog for the full changelog.',
   '2026-11-06 09:15:30');

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND role = 'assistant' LIMIT 1),
   'Next.js 15 Release', 'https://nextjs.org/blog/next-15',
   'Next.js 15 is now stable with React 19 support, Turbopack dev, enhanced caching semantics, and Partial Prerendering.',
   '2026-10-21', 0.96);

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND role = 'assistant' LIMIT 1),
   'What''s New in Next.js 15', 'https://vercel.com/blog/whats-new-next-15',
   'Turbopack is stable for development, React 19 support, new after() API, and updated caching defaults.',
   '2026-10-21', 0.93);

INSERT INTO sources (message_id, title, url, snippet, published_at, score) VALUES
  ((SELECT id FROM messages WHERE conversation_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND role = 'assistant' LIMIT 1),
   'Next.js 15.1 Blog Post', 'https://nextjs.org/blog/next-15-1',
   'Next.js 15.1 includes forbidden() and unauthorized() helpers, improved error debugging, and React 19 stabilization.',
   '2026-11-04', 0.89);

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'user',
   'Has anything changed since I asked you that?',
   '2026-11-10 09:15:00');

INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'assistant',
   'You originally asked about Next.js releases on November 6, 2026. Checking what''s new since then:

No major Next.js release has dropped between November 6 and today (November 10). The latest stable version remains **15.1.x**.

However, there''s been activity in the canary channel — a few notable PRs have been merged that will likely land in 15.2:
- Improvements to Turbopack production build support
- Better error overlay UX

I''d keep an eye on the Next.js blog and GitHub releases for a 15.2 announcement, which could come in the next few weeks based on their release cadence.',
   '2026-11-10 09:15:25');

