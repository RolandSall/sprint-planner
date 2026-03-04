# Sample Data — Platform Team PI 2026 Q1

## What's in the CSV

| Field | Value |
|---|---|
| Features | 6 (Auth, API Gateway, Dashboard, Notifications, Admin, Mobile) |
| Stories | 25 |
| Total estimation | 86 SP |
| Priorities | HIGH × 9 stories, MEDIUM × 11, LOW × 5 |
| Internal deps | 18 dependency edges (complex chain) |
| External deps | 8 stories locked behind sprints 1–4 (simulates infra/design/mobile teams) |

### Dependency highlights
- **Auth chain**: Schema → Registration + Login → JWT middleware → Password reset (5 stories, must go in order)
- **Dashboard UI**: blocked by auth JWT (sprint 3+) AND design team (sprint 1+)
- **Analytics & Activity feed**: blocked until sprint 4 by data team external dependency
- **Offline sync**: blocked until sprint 5 by platform infra external dependency
- **Mobile**: blocked until sprint 3, depends on Auth JWT completing first

---

## Setup: Create this PI in the app before importing

| Field | Value |
|---|---|
| Team name | Platform Team |
| PI name | PI 2026 Q1 |
| Start date | 2026-01-05 |
| End date | 2026-03-27 |
| Sprints | 6 sprints |
| Sprint names | S1, S2, S3, S4, S5, S6 |
| Sprint capacity | **20 SP each** (120 SP total) |

> With capacity = 20 per sprint you will see:
> - Sprints 1–3: lightly loaded (dependency bottleneck in S1)
> - Sprint 4–5: near capacity (heavy delivery phase)
> - NEAR_CAPACITY warning on at least one sprint after auto-schedule
> - Sprint 6: light tail (admin + mobile completion)

---

## How to import

1. Start the app (`./dev.sh` or `./docker-run.sh`)
2. Go to **http://localhost:4200**
3. Click **New PI** → fill in the values above → **Create PI**
4. On the board page click **Import CSV**
5. Drag & drop `platform-team-pi-2026-q1.csv` onto the drop zone
6. After import, click **Auto Schedule** — stories will be distributed across sprints
7. Drag stories between sprints manually to see validation and overcommit warnings

---

## Expected auto-schedule outcome

| Sprint | Key stories | Load |
|---|---|---|
| S1 | DB Schema | ~5 SP |
| S2 | Registration, Login, Gateway config, Dashboard shell | ~14 SP |
| S3 | JWT, Password reset, Rate limiting, Logging, Email service | ~14 SP |
| S4 | Circuit breaker, Auth integration, Activity feed, Push notifications, User mgmt | ~19 SP |
| S5 | Profile page, Analytics, Notification prefs, Digest, Role editor, Mobile auth | ~20 SP ⚠️ |
| S6 | Audit log, Mobile payload, Offline sync, Mobile push | ~14 SP |
