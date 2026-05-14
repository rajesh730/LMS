# Multi-School Talent and Public Showcase Platform

This project is a Next.js + MongoDB platform for schools to run and promote talent, extracurricular activities, showcases, and inter-school competitions.

## Product Direction

Strategic focus:

- talent and extracurricular profiles
- school-owned and platform-owned events
- submissions and judging workflows
- achievements and certificates
- public school profile pages and public event pages

Not a target direction:

- broad ERP/LMS modules (attendance, exams, marks, report cards)

For the execution plan, see:

- `SHOW_TALENT_MATURE_MVP_CODE_CLEANUP_AND_PUBLIC_SHOWCASE_BLUEPRINT.md`
- `RECONSTRUCTION_ROADMAP.md`
- `MANUAL_QA_CHECKLIST.md`

## Tech Stack

- Next.js App Router
- React
- MongoDB + Mongoose
- NextAuth
- Tailwind CSS

## Core Roles

- `SUPER_ADMIN`: platform owner, school approvals, platform events, moderation
- `SCHOOL_ADMIN`: school setup, school events, submissions and publishing controls
- `TEACHER`: mentoring, reviews, judging when assigned
- `STUDENT`: profile, participation, submissions

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/schoolproject
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
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
- `components/`: dashboards, event, showcase, and workflow components
- `models/`: Mongoose schemas
- `lib/`: shared utilities and services
- `scripts/`: cleanup and migration helpers

## Quality Gate

Before pilot or release:

- run `npm run lint`
- run `npm run build`
- execute manual flows in `MANUAL_QA_CHECKLIST.md`
- verify role isolation and public visibility safety

## Deployment

- Use Vercel or any Node.js hosting that supports Next.js App Router.
- Set production environment variables (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
- Run build check before each deployment.

## References

- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)

## Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add feature: description"`
4. Push: `git push origin feature/your-feature`
5. Create a Pull Request

## Support

For issues or questions:

1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. Contact the development team

## License

This project is proprietary. All rights reserved.

## Authors

- **Rajesh Pandey** - Initial Development
- **Partner Developer** - To be added

---

**Last Updated**: April 25, 2026
