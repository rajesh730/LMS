# Pravyo project skills

Created 2026-09-08 after inspecting the local project. These are reusable working instructions, not autonomous employees or proof that the app has been repaired.

## Installation and use

15 skills are installed in `C:/Users/rajes/.codex/skills/pravyo-*`, the skill-creator's default personal skill location in this environment. Each contains SKILL.md and agents/openai.yaml. Automatic selection remains enabled. They are personal installations on this machine, not checked-in repository skills; another developer will need the skill folders. Keep their Pravyo scope when reusing them.

Use a skill by name, for example:

- `$pravyo-ui-ux Audit the school dashboard and propose the three highest-impact improvements.`
- `$pravyo-mobile-accessibility Fix the parent notices flow on narrow phones; verify the last action remains reachable.`
- `$pravyo-design-system Consolidate button colors and focus states without changing the brand identity.`
- `$pravyo-backend-architecture Review school event authorization and implement the smallest safe correction.`
- `$pravyo-product-strategy Choose the next MVP milestone for a school pilot.`
- `$pravyo-project-management Turn the verified findings into a realistic one-week plan.`

Skill discovery can depend on the client/session. If a skill does not appear, restart Codex; you can also explicitly ask it to read the linked SKILL.md. The official guide describes explicit/automatic selection and repository discovery in `.agents/skills`: [Build skills](https://learn.chatgpt.com/docs/build-skills). No plugin or account connection is required for these instruction-only skills.

## Skill catalog

| Skill | Responsibility |
| --- | --- |
| [Pravyo Project Expert](C:/Users/rajes/.codex/skills/pravyo-project-expert/SKILL.md) | Map Pravyo workflows and resolve project context |
| [Pravyo Product & MVP](C:/Users/rajes/.codex/skills/pravyo-product-strategy/SKILL.md) | Choose practical features and business priorities |
| [Pravyo Brand & Graphics](C:/Users/rajes/.codex/skills/pravyo-brand-design/SKILL.md) | Create a coherent identity and school campaign assets |
| [Pravyo Design System](C:/Users/rajes/.codex/skills/pravyo-design-system/SKILL.md) | Unify colors, typography and shared UI components |
| [Pravyo UI/UX Designer](C:/Users/rajes/.codex/skills/pravyo-ui-ux/SKILL.md) | Improve school screens, navigation and task flows |
| [Pravyo Mobile & Accessibility](C:/Users/rajes/.codex/skills/pravyo-mobile-accessibility/SKILL.md) | Fix responsive layouts and accessible interactions |
| [Pravyo Frontend Engineer](C:/Users/rajes/.codex/skills/pravyo-frontend-engineering/SKILL.md) | Build maintainable React and Next.js interfaces |
| [Pravyo Backend & Architecture](C:/Users/rajes/.codex/skills/pravyo-backend-architecture/SKILL.md) | Implement secure APIs and practical system design |
| [Pravyo Data & Migrations](C:/Users/rajes/.codex/skills/pravyo-data-migrations/SKILL.md) | Protect school records during schema and data changes |
| [Pravyo Quality Engineer](C:/Users/rajes/.codex/skills/pravyo-quality-testing/SKILL.md) | Verify workflows and prevent meaningful regressions |
| [Pravyo Security & Privacy](C:/Users/rajes/.codex/skills/pravyo-security-privacy/SKILL.md) | Protect student data, guardian access and tenant isolation |
| [Pravyo Platform Operations](C:/Users/rajes/.codex/skills/pravyo-platform-operations/SKILL.md) | Plan deployments, recovery and reliable operations |
| [Pravyo User Emotion & Content](C:/Users/rajes/.codex/skills/pravyo-user-emotion-content/SKILL.md) | Design reassuring copy and inclusive school journeys |
| [Pravyo Project Manager](C:/Users/rajes/.codex/skills/pravyo-project-management/SKILL.md) | Turn improvements into achievable weekly execution |
| [Pravyo School Growth & Onboarding](C:/Users/rajes/.codex/skills/pravyo-school-growth/SKILL.md) | Plan school sales, pilots and successful onboarding |

Use the project expert for cross-feature orientation; use the narrow specialist when the task is already clear. UI/UX owns journeys, design system owns shared app styling, brand owns identity/assets, mobile accessibility owns device and accessible interaction behavior, and frontend implements component/state behavior. Product chooses outcomes; project management schedules delivery. QA verifies behavior; security examines abuse and privacy boundaries. This separation keeps routine tasks proportionate.

## Evidence from this inspection

This was a source and documentation analysis, not a live visual audit, penetration test or production readiness certification. No authenticated browser flow or real device was tested. Counts below are a local snapshot and must be remeasured later.

| Finding | Evidence | Practical implication |
| --- | --- | --- |
| Shared styling has substantial override debt | app/globals.css: 3,898 lines and 810 lines containing !important; substring selectors include a blanket text-white override | Inspect computed styles and migrate representative components before removing overrides. The count alone does not prove each declaration is wrong. |
| Tokens and component literals coexist | app/globals.css defines brand tokens; components/ui/Button.js also hardcodes palette values | Consolidate semantic color roles to prevent partial theme changes. |
| Product documentation conflicts with implementation | README.md excludes parent mode; app/parent, models/Parent.js and lib/parentAccess.js implement it | Trace code before scope decisions; don't delete working parent features to match stale docs. |
| Guardian access is a critical boundary | MEMORY.md, lib/parentCredentials.js and lib/parentAccess.js describe Parent ID credentials and child-specific authorization | Protect printed cards, logs, analytics and cross-school child switching. This inspection does not certify the implementation. |
| Backend and tests are substantial | 160 API route.js files, 36 model files and 68 test files | Upgrade incrementally; reuse actual policy helpers and regression cases. |
| Node tests cannot validate mobile layout | jest.config.js uses testEnvironment node; package.json has Jest and k6 scripts | Add browser verification to UI work; passing Jest is not visual evidence. |
| No checked-in GitHub workflow directory in this snapshot | .github/workflows absent | Confirm how releases are actually validated before claiming automated gates. Other external CI may exist. |
| Distributed dependencies have local fallback modes | lib/rateLimit.js and lib/realtimeBus.js | Report degraded multi-instance behavior; don't assume Redis failures preserve global guarantees. |
| Architecture already defines useful boundaries | docs/ARCHITECTURE.md and eslint.config.mjs | Keep app -> lib -> models boundaries rather than inventing a replacement stack. |

Existing docs/UX_AUDIT.md and docs/REDESIGN.md provide useful investigation leads, but some named components and counts have changed. design/ contains design images, not verified screenshots of today's running UI. The current primary color #1f4e79 is an implementation fact, not a newly approved palette.

## Recommended improvement order

1. Reproduce the most important school and guardian tasks on mobile and desktop. Record route, role, state, screenshot and whether the task succeeds. Prioritize any confirmed access or data exposure defect immediately.
2. Repair a small shared foundation: semantic colors, readable typography, buttons, fields, focus states and safe layout/scroll behavior. Check public, school and parent consumers before expanding.
3. Complete one high-value journey end to end, such as school notice publication through authorized guardian reading, including retry/error and child-switch behavior.
4. Verify role/school isolation and the changed journey, then repeat the design patterns across related screens. Update stale documentation as behavior is confirmed.
5. Prepare a school pilot with measurable activation, staff workload and support expectations. Grow the feature set from observed demand rather than copying an ERP checklist.

This is a sequence, not a promised calendar. Capacity, pilot priorities and actual browser findings should determine weekly scope.

## Maintenance and validation

All 15 SKILL.md files passed the bundled skill-creator quick_validate.py check. UI metadata was generated with generate_openai_yaml.py. Descriptions were reviewed for distinct task boundaries, with normal automatic invocation preserved. Structural validation does not prove future agent behavior; refine narrowly after actual use.

For maintenance, recheck referenced paths and facts, keep each skill focused, and rerun the validator after edits. These skills intentionally avoid bundled scripts, hardcoded production credentials, mandatory external services and automatic production mutations. User authorization remains the authority for actual actions.

