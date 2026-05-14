# Settings Architecture Audit

Date reviewed: May 10, 2026

## Current problems found in this repo

1. Super admin settings was broken at navigation level.
   The sidebar linked to `/admin/settings`, but `app/admin/settings/page.js` did not exist.

2. School settings had a data-contract mismatch.
   The UI tried to manage `schoolName`, `email`, `phone`, `address`, and similar fields, but `models/SchoolConfig.js` only defined `teacherRoles` and `grades`, so some edits could be dropped by persistence.

3. Settings scope was not clearly separated.
   The system did not define what belongs to:
   - platform-wide settings
   - school-level settings
   - future user-level preferences

4. The school settings page mixed editable configuration with read-only statistics without a clear model.

## Professional settings model for this product

This platform is multi-tenant:
- the `SUPER_ADMIN` manages the platform
- each `SCHOOL_ADMIN` manages one tenant-like school workspace

So settings should follow this hierarchy:

1. Platform scope
   Owned by `SUPER_ADMIN`
   Applies as defaults or policy across the whole system.

2. School scope
   Owned by `SCHOOL_ADMIN`
   Controls the school's identity and local operating defaults.

3. User scope
   Future
   Personal preferences only, not organizational policy.

## What belongs in Super Admin settings

Super admin settings should contain only platform-wide controls:

### General
- platform name
- support email
- support phone
- default timezone
- default country
- status page URL
- maintenance banner / notice

### Governance
- school onboarding mode
- whether school approval is required
- whether platform events require super admin review
- default public-results policy
- whether school showcases are allowed
- whether public partner portfolios are allowed

### Defaults
- default teacher role templates
- pending-school restriction behavior
- support-ticket availability

### Future but separate
- SSO / identity
- audit retention
- billing / subscriptions
- integration keys
- domain and email sender configuration

These should stay out of school settings.

## What belongs in School Admin settings

School settings should contain only school-owned configuration:

### School profile
- school name
- school code
- principal name
- official email

### Contact and location
- phone
- address
- city
- state
- pin code

### Local operating defaults
- teacher / mentor role options
- school showcase profile defaults
- optional notification contacts

### Read-only snapshot
- student count
- teacher count
- grade structure

These are useful for orientation, but they are not themselves "settings."

## What should not be in settings

Do not put these inside a generic settings page:

- results management
- event publishing workflows
- school approval queues
- analytics dashboards
- bulk imports
- dangerous account deletion

Those are operational workflows, not configuration.

## Recommended UI structure

### Super Admin

Use a dedicated page with sections:

1. General
2. Governance
3. Defaults
4. Scope Rules / Help

### School Admin

Use a dedicated page with sections:

1. School Profile
2. Contact & Location
3. Staff Defaults
4. Academic Snapshot
5. Scope Rules / Help

## Core principles this should follow

1. Least privilege
   High-impact platform settings must stay at super-admin scope only.

2. Global defaults with local overrides
   Platform sets defaults; schools override only what they own.

3. Separate policy from operations
   Settings pages define stable configuration, not day-to-day task execution.

4. Read-only IDs and counters should be visually separate
   They help with trust, but should not look editable unless they really are.

5. One route per role
   Avoid dead links and avoid mixing settings into unrelated dashboards.

## Research notes used for this architecture

The structure above aligns with common enterprise admin patterns from official docs:

- OpenAI Workspace settings separates `General`, `Members`, `Groups`, `Permissions & roles`, `Apps`, `Usage`, and `Identity & access`, showing that settings should be organized by stable admin domains, not mixed with workflow pages.
  https://help.openai.com/en/articles/8411955-what-workspace-settings-can-i-control-for-my-workspace

- OpenAI Global Admin Console introduces a higher tenant-level admin surface above individual workspaces, which supports the need for a platform scope above school scope in this product.
  https://help.openai.com/en/articles/12289294-global-admin-console

- Microsoft recommends least-privileged role usage for high-impact multitenant settings, which is important for `SUPER_ADMIN` governance controls.
  https://learn.microsoft.com/en-us/microsoft-365/enterprise/manage-multitenant-org-settings?view=o365-worldwide

- Ubiquiti's enterprise RBAC guidance emphasizes roles and least privilege instead of per-user ad hoc permission assignment.
  https://help.ui.com/hc/en-us/articles/19469899235223-Best-Practices-for-Admin-User-Permission-Management-in-UID-Enterprise

- Edgenuity's school settings model keeps school settings focused on school identity, IDs, features, and school administrators rather than mixing in broader platform workflows.
  https://help.imagineedgenuity.com/hc/en-us/articles/5581854857367-Managing-School-Settings-Overview

## Recommended next improvements

1. Add audit logging for settings changes.
2. Add a dedicated `Danger Zone` section only for explicit destructive actions.
3. Add override indicators when a school setting deviates from a platform default.
4. Add validation and field-level help text for URLs, email, and policy changes.
5. If subscriptions are added later, create a separate billing settings surface instead of mixing billing into core governance.
