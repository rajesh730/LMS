# Research Report: Multi-School Talent, Extracurricular, and Competition Platform

Date: April 21, 2026

## 1. Executive Summary

### Bottom-line recommendation

Do not continue this product as a broad school ERP/LMS.

The stronger direction is to reposition it as a:

**multi-school talent, extracurricular, competition, and public showcase platform**

This direction is better than a general school ERP for three reasons:

1. The ERP/SIS market is already crowded and mature.
2. Your current codebase already has an events/community foundation that can be repurposed.
3. Schools, students, and parents all benefit from visible extracurricular activity, recognition, and school promotion.

### Final strategic position

The best product position is not:

- school ERP
- LMS
- attendance/marks/exams software
- only a one-off talent show tool

The best product position is:

**software for schools to run and promote talent, clubs, extracurricular activities, showcases, and inter-school competitions**

### What this means in practice

Keep:

- school onboarding and approval
- auth and roles
- event system foundation
- groups/networks of schools
- notices
- parent communication
- support
- school/student profile basics

Freeze or remove as strategic priorities:

- attendance
- exams
- marks
- grading scales
- report cards/results
- curriculum-heavy LMS flows

Build next:

- talent profiles
- extracurricular categories and clubs
- event submissions
- judging and scorecards
- achievements/certificates
- public school activity pages
- public event landing pages
- flagship platform-run events

## 2. Question This Report Answers

This report answers:

1. Should the product remain a broad school platform or focus on talent/extracurriculars?
2. Is public promotion of school activity a valid product feature or just a nice-to-have?
3. What role should the platform owner (`SUPER_ADMIN`) play?
4. What product scope has the highest chance of becoming sellable?
5. What should be changed in the current codebase before building further?

## 3. Research Method

This report uses a mix of:

- official/public-sector research
- primary vendor pages for competitor positioning
- nonprofit research on edtech procurement
- direct analysis of the current codebase

Important note:

- Claims like "trusted by X schools" on vendor websites are self-reported marketing claims, not independent audits.
- They are still useful for competitive landscape analysis because they show how crowded a category is and how vendors position themselves.

## 4. Current Codebase Assessment

The existing project is a large multi-role Next.js platform with:

- `SUPER_ADMIN`
- `SCHOOL_ADMIN`
- `TEACHER`
- `STUDENT`

Current feature coverage includes:

- school registration/approval
- teacher/student management
- attendance
- exams
- marks and grading
- subjects/curriculum
- notices
- support tickets
- parent communication
- events
- student MCQ/gamification

### Codebase conclusion

The codebase is not a clean ERP product ready to compete as a polished school operating system.

It is a transitional product with:

- duplicated academic models
- inconsistent session assumptions
- some route/UI mismatches
- event flows that are ambitious but not yet fully normalized
- weak security choices in some credential paths
- no automated test suite

That matters strategically:

If you continue toward ERP, you are choosing a crowded category while carrying technical debt in high-stakes modules.

If you pivot toward talent/extracurriculars, you can keep the strongest reusable foundations and stop investing in low-differentiation modules.

## 5. Market Reality: Why Not Continue As A General School ERP

The broad school ERP/SIS market is already well served.

Examples:

- Blackbaud markets software for admissions, enrollment, academics, tuition, and broader school operations for K-12 private schools.
- Veracross positions itself as a single-record private K-12 school management platform and says it serves `3300+` schools in `70+` countries.
- FACTS positions itself as a K-12 data platform spanning admissions, finance, and academics.
- In Nepal, Veda markets itself as trusted by `900+` schools and colleges and emphasizes school ERP plus e-learning.
- EduCloud ERP and other regional products market attendance, exams, billing, parent communication, and administrative automation as standard features.

### Strategic meaning

If you compete here, your product must be:

- more reliable than ERP incumbents
- stronger on integrations
- stronger on academic workflows
- stronger on compliance/data handling
- stronger on daily operational accuracy

Your current codebase is not in that position.

### Competitive disadvantage if you stay in ERP

You would be competing in a category where buyers already expect:

- attendance reliability
- report-card accuracy
- gradebook correctness
- parent trust
- mature admin workflows
- good support and training

That is a hard market to enter with a transitional codebase.

## 6. Research: Why Extracurricular/Talent Direction Is More Defensible

### 6.1 Extracurricular participation is educationally meaningful

NCES reported that extracurricular activities provide opportunities for teamwork, responsibility, culture, and community, and that participation is positively associated with indicators such as attendance, academic outcomes, and educational aspiration.

This does not prove causation, but it does show extracurricular activity is not a trivial add-on. It is part of the school's value story.

### 6.2 School connectedness matters

CDC says school connectedness is when students feel cared for, valued, supported, and that they belong at school.

CDC also reports that students who feel connected to school are more likely to have better school outcomes and lower risk behaviors.

This matters because extracurriculars, clubs, performances, exhibitions, competitions, and service activities are some of the clearest ways schools create visible belonging beyond academics.

### 6.3 Families need usable school information

IES/NCEE found that parents preferred richer school information displays and liked pages with graphs plus numbers.

That is directly relevant to your idea of public school activity pages:

parents and students do not just need schools to say "we support talent."
They need visible evidence:

- events held
- categories offered
- participation rates
- awards earned
- recent activity
- public showcases

### 6.4 Parent communication is part of trust

NCES tables on parent satisfaction with school communication show there is still large room for improvement in how schools communicate with families.

That supports keeping parent communication inside the new product, especially around:

- event participation
- student showcases
- approvals/consent
- results
- achievements

## 7. Why "Only Talent Show Software" Is Too Narrow

A pure "talent show" tool is too event-specific and likely too seasonal.

If schools only need the platform for one annual day or one yearly showcase, retention will be weak and many will use:

- forms
- spreadsheets
- WhatsApp
- email
- generic event tools

### Better scope

The stronger scope is:

**talent + extracurriculars + clubs + competitions + public recognition**

That creates year-round use cases:

- club signups
- student talent profiles
- school showcases
- internal competitions
- inter-school competitions
- submissions and judging
- awards and certificates
- school publicity and activity history

This is the right middle ground:

- broader than a one-day talent show
- much more focused than ERP

## 8. Competitive Landscape In The Chosen Niche

The market around your likely niche is fragmented, not fully consolidated.

### 8.1 School ERP vendors

These products are broad and operations-heavy:

- Blackbaud
- Veracross
- FACTS
- Veda
- regional ERP vendors

Their strength:

- core school administration
- SIS and finance
- attendance and academics

Their weakness for your opportunity:

- they are not primarily positioned around talent identity, school showcase culture, and inter-school recognition

### 8.2 Extracurricular/event operations tools

Examples:

- Tes Clubs and Events
- SchoolCal
- RSVPify for schools
- Eventlink (athletics-heavy)

Their strength:

- managing events/logistics/bookings

Their weakness:

- they are usually not talent identity systems
- they do not necessarily create school reputation pages, achievement history, public school activity profiles, or platform-run competitions

### 8.3 Clubs/engagement platforms

Examples:

- FeatsClub
- other club/activity engagement tools

Their strength:

- club management, student participation, recognition

Their weakness:

- they are not necessarily optimized for multi-school competition networks and public school promotion

### 8.4 Judging/competition tools

Examples:

- Judgify
- Evalato
- Score Judge
- LiveJudge

Their strength:

- submission collection
- judging workflows
- scoring
- leaderboards

Their weakness:

- they are generally generic competition tools, not school relationship platforms
- they usually do not solve school onboarding, parent communication, school profiles, or long-term school activity identity

### Competitive insight

This is the key market insight:

The broad solution does not appear to be "one perfect product already owns this exact category."

Instead, the workflow is split across:

- ERP tools
- club/event tools
- judging tools
- public promotion/marketing tools

That fragmentation is the best argument for your product direction.

## 9. The Strongest Differentiator: Public School Activity Visibility

This idea is not a side feature. It is likely one of the main reasons schools would use the platform.

### Why it matters

Without public visibility, the platform is mostly an internal workflow tool.

With public visibility, the platform becomes:

- operational software
- school marketing layer
- parent trust layer
- student pride/recognition layer
- inter-school discovery layer

### Recommended public-facing model

#### A. Public landing page

Show before login/signup:

- featured upcoming public events
- highlighted participating schools
- recent winners/highlights
- active categories this season
- platform-run flagship events
- "most active schools" or "featured schools" in a careful, fair format

#### B. Public school profile pages

Each school should have a public page showing:

- school introduction
- talent/extracurricular categories active
- clubs and societies
- upcoming public events
- recent events and showcases
- inter-school participation history
- awards/placements
- gallery/highlights
- activity metrics

#### C. Public event pages

Each public event should show:

- organizer
- participating schools
- categories
- schedule
- submissions/highlights if allowed
- results/winners
- media gallery

### Important caution

Do not make this a shallow popularity wall.

Avoid:

- raw event count only
- pure vanity leaderboards
- exposing private student data
- publishing minors without consent
- allowing schools to manipulate metrics easily

### Better activity metrics

Use balanced indicators such as:

- events hosted
- events participated in
- number of active categories
- student participation rate
- consistency across the year
- public showcases published
- awards/finalist placements

This is much more credible than "School A has 56 events."

## 10. Product Role Design

### 10.1 `SUPER_ADMIN`

In the new model, `SUPER_ADMIN` should be the platform owner, not a school operator.

Core responsibilities:

- approve schools
- manage school subscription/status
- manage global categories and rubrics
- manage school groups/networks
- run platform-owned competitions
- assign moderators/judges for platform events
- resolve disputes and moderation issues
- manage public featured content
- oversee analytics and trust/safety

### 10.2 `SCHOOL_ADMIN`

Core responsibilities:

- manage school profile
- manage internal clubs/categories
- create school-owned events
- nominate or register students
- manage school submissions
- coordinate with parents and staff
- publish school-approved public highlights

### 10.3 Additional recommended roles

Add or formalize:

- `JUDGE`
- `MENTOR` or `COACH`
- `PARENT`

Do not force all evaluation work into teacher/admin roles.

## 11. Event Ownership Model

You want to run one or two platform events each year. That should be a first-class product feature.

### Event types to support

#### `SCHOOL_EVENT`

- created by a school
- internal showcase, club event, house event, school competition

#### `PLATFORM_EVENT`

- created by `SUPER_ADMIN`
- inter-school competition
- annual showcase
- flagship branded event

### Why this matters

This lets the platform do both:

- sell software to schools
- operate premium or flagship cross-school events

That is strategically strong.

### Recommended event fields

- `eventScope: SCHOOL | PLATFORM`
- `ownerType: SCHOOL | PLATFORM`
- `ownerId`
- `visibility: PRIVATE | INVITED | PUBLIC`
- `registrationMode: DIRECT | THROUGH_SCHOOL`
- `isInterSchool`
- `eligibleSchools`
- `eligibleCategories`

## 12. Recommended Product Scope

### 12.1 What the product should become

The product should answer:

**How active, creative, competitive, and vibrant is this school beyond academics?**

If a feature helps answer that question, it belongs.
If it does not, it should probably be removed.

### 12.2 Good scope

Support these activity domains:

- singing
- dance
- music
- drama
- art
- photography
- debate
- quiz
- speech/public speaking
- coding/robotics
- science fair/innovation
- clubs and societies
- community/service projects

This keeps the product broad enough for schools, but still inside one coherent category.

### 12.3 Bad scope

Do not keep building toward:

- attendance ERP
- exams
- gradebooks
- report cards
- fee management
- transport
- hostel
- full LMS

These features increase scope and competition while reducing product clarity.

## 13. Ideal First Customers

The best first customers are likely:

- private schools
- independent schools
- school groups/networks
- schools with strong annual-day, arts, debate, or competition culture

### Why not large public districts first

Digital Promise and related district procurement work shows that school procurement is often slow, complex, and capacity-constrained.

That means district sales tend to require:

- longer timelines
- more procurement friction
- more evidence requirements
- more compliance and security review

For an early product, that is a poor first wedge.

### Why private schools are better first

They are more likely to care about:

- school differentiation
- parent perception
- student experience branding
- admissions marketing
- annual events/showcase culture
- faster buying decisions

## 14. Go-To-Market Recommendation

### Positioning

Use positioning like:

- talent and extracurricular platform for schools
- school competition and showcase platform
- extracurricular operations and school promotion platform

Avoid:

- school ERP
- school management system
- LMS

### Core pitch

The pitch should be:

1. run your school talent and extracurricular activity in one place
2. showcase your students and school publicly
3. participate in inter-school competitions
4. build a visible reputation for being an active school

### The retention loop

The strongest product loop is:

- schools run activities on the platform
- the platform turns those activities into public visibility
- public visibility improves school reputation
- that reputation helps admissions and parent trust
- schools keep using the product

## 15. Risks and Constraints

### 15.1 Child safety and privacy

If public pages involve minors, this is a major product concern.

You need:

- consent handling
- school-controlled publishing
- public/private visibility settings
- moderation tools
- careful media rules

### 15.2 Vanity metrics

If school rankings are shallow, the product may reward noise instead of quality.

You need balanced metrics, not a raw leaderboard.

### 15.3 Feature drift

The biggest strategic risk is adding "just one more school module" until the product becomes ERP again.

### 15.4 Operational complexity

Platform-run competitions are powerful, but they also create:

- judging complexity
- fairness/dispute needs
- scheduling overhead
- moderation burden

So platform events should be limited and intentional.

## 16. Recommendation For This Codebase

### Keep and adapt

- auth and role infrastructure
- school onboarding and approval
- school grouping
- event foundation
- parent communication
- notices
- support tickets
- school/student identity models

### Freeze and later retire

- attendance
- exams
- marks
- grading scales
- report cards/results
- curriculum-heavy subject flows
- teacher academic content systems unless repurposed for coaching

### Build next in this order

1. public event pages
2. public school profile pages
3. talent/extracurricular categories
4. talent profiles
5. submissions
6. judging/scorecards
7. achievements/certificates
8. platform-run flagship event flow

## 17. MVP Recommendation

### MVP should support

- school onboarding
- school profile
- talent categories
- school-owned events
- platform-owned events
- student participation
- school submission workflow
- judge scoring
- result publication
- public school activity page

### Do not include in MVP

- sports league management in full depth
- payments/billing complexity beyond what is necessary
- advanced LMS
- general ERP modules
- complex AI features
- heavy social network features

## 18. Final Decision

### What you should build

Build:

**a multi-school extracurricular, talent, competition, and public school showcase platform**

### What you should not build

Do not continue building:

**a broad school ERP/LMS**

### Why this is the strongest move

Because it gives you:

- clearer positioning
- better differentiation
- stronger public-facing value for schools
- better reason for schools to stay active
- a more realistic path from your current codebase
- space to run your own flagship events without breaking tenant boundaries

## 19. Sources

Official and primary sources consulted:

- IES/NCEE, *Presenting School Choice Information to Parents: An Evidence-Based Guide* (October 2018)  
  https://ies.ed.gov/use-work/resource-library/report/evaluation-report/presenting-school-choice-information-parents-evidence-based-guide

- NCES, *Families' Participation in School Choice and Importance of Factors in School Choice Decisions in 2019* (June 2024)  
  https://nces.ed.gov/use-work/resource-library/report/data-point/families-participation-school-choice-and-importance-factors-school-choice-decisions-2019

- CDC, *School Connectedness Helps Students Thrive* (November 18, 2024)  
  https://www.cdc.gov/youth-behavior/school-connectedness/index.html

- CDC, *Enhance Connectedness Among Students, Staff, and Families* (December 3, 2024)  
  https://www.cdc.gov/mental-health-action-guide/strategies/enhance-connectedness.html

- NCES, *Extracurricular Participation and Student Engagement*  
  https://nces.ed.gov/pubs95/web/95741.asp

- NCES, Parent satisfaction with school communication tables  
  https://nces.ed.gov/nhes/tables/pfi-parentsat.asp

- Digital Promise, *Evolving Ed-Tech Procurement in School Districts*  
  https://digitalpromise.org/reportsandresources/evolving-ed-tech-procurement-in-school-districts/

Competitive landscape sources:

- Blackbaud K-12 private school software  
  https://www.blackbaud.com/who-we-serve/k-12-schools

- Veracross  
  https://www.veracross.com/

- FACTS IQ  
  https://factsmgt.com/products/education-technology/learning-platform/k-12/

- Veda MIS & ERP  
  https://veda-app.com/

- Tes Clubs and Events  
  https://www.tes.com/for-schools/clubs-and-events

- FeatsClub for schools  
  https://www.featsclub.com/school.html

- SchoolCal  
  https://schoolcal.com/

- Judgify  
  https://www.judgify.me/l/

- Score Judge  
  https://scorejudge.com/
