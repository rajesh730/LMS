# Pratyo School Platform

Pratyo is a Next.js + MongoDB platform for school activities, events, notices, student writing, certificates, and platform-led student challenges.

## Product Scope

Core workflows:

- Platform admins approve schools, manage platform events, publish notices, and run student challenges.
- Schools manage students and teachers, create school events, register participants, send student notices, review writing, and publish their internal magazine.
- Students view school events, notices, challenges, approved magazine articles, and their own writing workspace.
- Public visitors can view approved platform pages, public events, schools, notices, and selected challenge showcase content.

Not included in this phase:

- ERP/LMS modules such as attendance, exams, marks, report cards, or fee management.
- Parent mode, student self-registration for events, image-heavy magazines, and complex judging rubrics.

## Tech Stack

- Next.js App Router
- React
- MongoDB + Mongoose
- NextAuth
- Tailwind CSS

## Core Roles

- `SUPER_ADMIN`: platform owner, school approvals, platform events, notices, challenges, and moderation.
- `SCHOOL_ADMIN`: school setup, student and teacher management, school events, notices, magazine review, and certificates.
- `TEACHER`: school operations support where enabled.
- `STUDENT`: events, notices, writing, school magazine, and platform challenges.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```env
MONGODB_URI=mongodb://localhost:27017/schoolproject
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPER_ADMIN_BOOTSTRAP_TOKEN=change-this-token
ENABLE_DEMO_SEED=false
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

3. Run development server:

```bash
npm run dev
```

4. Build check:

```bash
npm run build
```

## Repository Areas

- `app/`: routes and API handlers
- `components/`: dashboards, events, notices, magazine, challenge, and workflow components
- `models/`: Mongoose schemas
- `lib/`: shared utilities and services
- `docs/`: internal architecture and operating notes

## Internal Docs

- [Realtime and Notices](docs/REALTIME_AND_NOTICES.md)
- [Work Indicators](docs/WORK_INDICATORS.md)

## Quality Gate

Before pilot or release:

- run `npm run lint`
- run `npm run build`
- manually test login and dashboard flows for `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, and `STUDENT`
- manually test notices, school events, platform events, magazine publishing, platform challenges, and certificates
- verify role isolation, school data isolation, and public/private visibility rules

## Deployment

- Use Vercel or any Node.js hosting that supports Next.js App Router.
- Set production environment variables from `.env.example`.
- Use a strong random `NEXTAUTH_SECRET`.
- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the production domain.
- For multi-instance realtime delivery, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Keep `ENABLE_DEMO_SEED=false` in production.
- Run build check before each deployment.

## License

This project is proprietary. All rights reserved.

## Authors

- **Rajesh Pandey** - Initial Development
- **Rajesh Pandey** - Product owner
