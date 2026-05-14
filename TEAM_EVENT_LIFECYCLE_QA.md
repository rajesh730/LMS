# Team Event Lifecycle QA

Use this checklist to verify the full `TEAM` event experience from creation to certificates.

## Test Setup

Create one event with these values:

- Event type: `Football` or another team competition
- Participation format: `TEAM`
- Registration mode: `Through school`
- Total team capacity: `2`
- Max teams per school: `1`
- Min members per team: `5`
- Max members per team: `8`
- Visibility: `PUBLIC` for public-result testing

Use these test roles:

- `SUPER_ADMIN`
- one approved `SCHOOL_ADMIN`
- at least `8` eligible students inside that school

## 1. Event Creation

### Super Admin

1. Open `Create Platform Event`.
2. Choose a team competition.
3. Confirm the registration step shows:
   - `Total Team Capacity`
   - `Max Teams Per School`
   - `Minimum Members Per Team`
   - `Maximum Members Per Team`
4. Save the event.

Expected:

- event saves successfully
- event returns as `TEAM`
- school-facing screens do not fall back to student-slot wording

Watch for:

- `Total Student Capacity` appearing for team events
- event reopening in `INDIVIDUAL` mode after save

## 2. School Registration Readiness

### School Admin

1. Open the team event from school dashboard.
2. Confirm the registration UI shows:
   - team name
   - captain
   - team size rule
   - summary cards
   - registration state badge
3. Check the summary area.

Expected:

- `Allowed Teams` is correct
- `Team Size Rule` is correct
- `Not started` or `Draft` appears before submit
- no student-slot error language is shown

Watch for:

- `You are trying to register X new students...`
- student-per-school limit messaging for a team event

## 3. Team Draft Validation

### School Admin

1. Create a team with fewer than the minimum members.
2. Leave captain empty.
3. Try to submit.

Expected:

- summary shows `Needs fixes`
- invalid team is clearly marked
- submit action is blocked

Then:

4. Add valid number of members.
5. Choose captain.
6. Submit again.

Expected:

- state changes to `Submitted`
- saved registration count updates
- team remains visible after refresh

Watch for:

- invalid team still submitting
- cleared captain after refresh
- duplicate students allowed in same event across teams

## 4. Team Registration Persistence

### School Admin

1. Submit one valid team.
2. Refresh page.
3. Reopen same event.

Expected:

- saved team still appears
- team name persists
- captain persists
- member count persists
- state shows saved/submitted

Watch for:

- draft resetting to blank
- auto-generated team name changing unexpectedly
- member chips not matching saved data

## 5. Team Capacity Rules

### School Admin

1. Try to add a second team when `Max Teams Per School = 1`.
2. Try to add more than `Max Members Per Team`.
3. Try to submit fewer than `Min Members Per Team`.

Expected:

- each rule blocks correctly
- message speaks in `teams` and `members`, not `students per school`

Watch for:

- ambiguous messages
- student-capacity logic reused for teams

## 6. Super Admin Participants View

### Super Admin

1. Open the event participants/manage screen.
2. Confirm participant rows are grouped by team.

Expected columns:

- school
- team name
- captain
- contact
- member count
- member list
- status

Expected:

- one row per team
- no loose student-only rows for team events

Watch for:

- duplicated rows for each member
- missing captain
- team name absent even though school submitted one

## 7. Round 1 Team View

### Super Admin

1. Open `Rounds`.
2. Confirm Round 1 includes the team entry.
3. Confirm summary cards show:
   - teams in round
   - selected
   - awaiting decision
   - advancement mode

Expected:

- team row shows team name, captain, members
- round actions speak in `teams`

Watch for:

- student language inside team round
- team members shown without team identity

## 8. Team Status Updates

### Super Admin

1. Mark the team `Selected`.
2. Refresh round.
3. Confirm selected count updates.

Expected:

- team status pill changes
- selected count matches
- no member-level partial update confusion

Then test final round states:

4. In final round, mark team as:
   - `Winner`
   - or `Runner Up`

Expected:

- team result updates correctly
- team remains one result unit

Watch for:

- only some members moving/status-changing
- winner set on a member instead of team record

## 9. Advance Teams Between Rounds

### Super Admin

1. Select one or more teams.
2. Click `Send to Next Round`.
3. Repeat with `Send to Final Round`.

Expected:

- correct number of teams move
- history shows origin round
- no duplicate movement on refresh

Watch for:

- same team appearing twice in target round
- advancement creating member duplicates instead of team entry

## 10. Results Screen

### Super Admin

1. Open `Results`.
2. Confirm top summary shows:
   - winners
   - runner up
   - finalists
   - other participants
3. Confirm final status table shows:
   - team name
   - captain
   - member count
   - school

Expected:

- results feel team-first
- highest round reached is correct
- certificate name is visible

Watch for:

- student rows appearing as final results
- team names missing in final status list

## 11. Publish Results

### Super Admin

1. Save snapshot.
2. Publish results publicly if needed.

Expected:

- event moves toward completed state
- results are available to school
- public result page appears only if enabled

Watch for:

- results save but school cannot see them
- public link shown when results are not actually public

## 12. School Result View

### School Admin

1. Open completed event.
2. Confirm the result panel shows:
   - recognized teams
   - winners/runner-up/finalists summary
   - team table
   - captain
   - placement

Expected:

- school sees team result first
- certificate section is secondary

Watch for:

- certificate-first experience hiding team result
- student-only labels in team event result panel

## 13. Certificates Panel

### School Admin

1. Open certificates for the team event.
2. Confirm summary cards show:
   - recognized teams
   - certificates ready
   - winners
   - final placements
3. Open a certificate.

Expected:

- certificate card clearly maps to team outcome
- captain shown when available
- certificate page reads as team-result certificate

Watch for:

- certificate page still sounding like solo-student award
- missing team name on certificate page

## 14. Public Result Page

### Public / Any User

1. Open public event result page.
2. Confirm team naming is visible for team event.

Expected:

- public result page does not describe the event as student-only
- team placements are understandable

Watch for:

- individual-only copy
- public page hiding team identity

## 15. Locking Behavior

### School Admin + Super Admin

1. After results publish / competition close:
   - school tries to edit team
   - super admin tries to edit round statuses

Expected:

- locked state is enforced
- copy explains that competition is closed

Watch for:

- school can still edit team after close
- round status still editable after close

## Bug Log Template

Record failures with:

1. `Severity`
2. `Role`
3. `Step Number`
4. `Expected`
5. `Actual`
6. `Screen / API`
7. `Screenshot`

## Priority Rules

Treat these as `Critical`:

- team event opens in student registration mode
- team capacity interpreted as student capacity
- team registration does not persist
- rounds advance members incorrectly
- results publish but school cannot see team outcome
- certificate page loses team identity

Treat these as `Major`:

- wrong labels
- confusing copy
- member list missing while team exists
- public result page still feels individual-only

Treat these as `Minor`:

- spacing issues
- badge color/copy polish
- summary-card wording tweaks
