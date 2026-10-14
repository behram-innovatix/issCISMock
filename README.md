# ISS CIS: Central Intelligence System

An executive dashboard that brings performance data from every Issphere platform into one place. It is built for the CEO first and can be opened to other leaders later. Today it covers **Issphere EDU** (students) and **HR** (staff). New platforms plug in through a registry.

Everything currently runs on **seeded mock data**, so the app works with no backend. The EDU numbers match the approved HTML mockup (`School-Performance-Insights.html`) exactly, because it uses the same seed and the same formulas.

## Run it

```bash
npm install
npm run dev        # http://localhost:3010
```

| Script              | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server on port 3010              |
| `npm run build`     | Production build                     |
| `npm run typecheck` | `tsc --noEmit`                       |
| `npm run lint`      | ESLint (flat config, `next/core-web-vitals`) |
| `npm run format`    | Prettier with the Tailwind plugin    |

The stack matches ISSPHERE-UI: Next.js 16 (App Router), React 19, Tailwind v4, recharts 3, TanStack Query, zustand and lucide. Code style is 4-space indentation with no semicolons.

## What's inside

| Area | Route | Highlights |
| --- | --- | --- |
| **Executive Overview** | `/` | Headline KPIs from every live platform; student vs staff attendance; at-risk alerts; school-by-school comparison |
| EDU Overview | `/edu` | Students, capacity, attendance, lateness, persistent absence, net behaviour |
| EDU Enrollment | `/edu/enrollment` | Year-group bars (click to drill down), gender, section capacity grid, nationality |
| EDU Attendance | `/edu/attendance` | Session mix, year groups, attendance bands, day-of-week heatmap, AM vs PM, mark codes |
| EDU Behaviour | `/edu/behaviour` | Attendance × behaviour matrix (click a box to list the students), leaderboards, behaviour types |
| EDU Students | `/edu/students`, `/edu/students/[id]` | Sortable register; profile with an AM/PM calendar, comparison with the class, and a behaviour log linked to staff |
| HR Overview | `/hr` | Staff attendance, absence, leave, average appraisal, cycle progress, by location and department |
| HR Attendance & Leave | `/hr/attendance` | Lateness heatmap, leave by type and month, balances, top absentees, pending requests |
| HR Performance | `/hr/performance` | Score distribution, rating mix, competency radar, performance × attendance 9-box, KPI attainment |
| HR Teacher Impact | `/hr/teacher-impact` | Each teacher's classes (EDU) next to their appraisal, plus a correlation scatter |
| HR Staff | `/hr/staff`, `/hr/staff/[id]` | Register; profile with a calendar, leave, appraisal history, competencies, KPIs and classes taught |

Filters (school, stage, year group, section, gender, period on EDU; location, department, role, period on HR) apply to every screen in that platform.

## Architecture

```
app/(pages)/…                  thin route files → render a screen
src/platforms/registry.ts      every connected platform (drives sidebar, breadcrumbs, executive view)
src/platforms/<code>/
  data/source.ts               DataSource interface + mock/api switch  ← the integration contract
  data/mock.ts | api.ts        seeded mock (today) | ISSPHERE endpoint client (to build)
  data/generate.ts             mock generator
  analytics.ts                 pure roll-ups the screens render (unit-testable, server-portable)
  state.ts, hooks.ts           zustand filters, TanStack Query hooks
  components/, features/*/screen.tsx
src/mock/world.ts              builds EDU first, then HR around its sections (teacher ↔ class links)
src/components/{shell,ui,charts,insights}   shared layout, primitives, chart presets, KPI/matrix/calendar/table
```

### Switching to real data

Set `NEXT_PUBLIC_DATA_SOURCE=api` and implement `src/platforms/<code>/data/api.ts`, using `@workspace/core-client` once this app moves into the monorepo. The screens don't change.

The quickest path is for `api.ts` to return the same `EduDataset` / `HrDataset` shapes. For production volumes, move the functions in `analytics.ts` behind `/api/v1/edu/insights/*` and `/api/v1/hrm/insights/*` endpoints instead. They are pure functions, so they port directly.

### Adding a platform (for example Finance)

1. Create `src/platforms/fin/` with `data/` (source, mock, api), `analytics.ts`, `state.ts`, `hooks.ts` and its screens.
2. Add routes under `app/(pages)/fin/…`.
3. In `src/platforms/registry.ts`, set `status: "live"` and fill in `nav`.
4. Add its headline metrics to `HEADLINES` in `src/features/executive/screen.tsx`.

### Moving into ISSPHERE-UI

This app follows the monorepo conventions, so it can become `apps/cis`:

- thin `page.tsx` files over `features/*/screen.tsx`
- data hooks
- Tailwind v4 tokens

The steps are:

1. Copy `src/`.
2. Swap `src/components/shell` for `@workspace/ui` `AppLayout`.
3. Set `basePath: "/cis"` and `assetPrefix: "/cis-static"`.
4. Add the core rewrite and the Caddy `handle` block.

## Business rules

- **Attendance:** (present + late) ÷ sessions. The target is 95%. At or above 95% is on target, 90–95% is on watch, and below 90% is below target.
- **Student status:** *At risk* if attendance is below 90% or net behaviour is −10 or lower. *Watch* if attendance is below 95% or net behaviour is negative. Otherwise *On track*.
- **Staff attendance:** approved annual leave is excluded from the denominator.
- **Staff status:** *At risk* if attendance is below 90% or the latest appraisal is below 2.75. *Watch* if attendance is below 95% or the appraisal is below 3.4.
- **Appraisal ratings:** Exceeds ≥ 4.25, Meets ≥ 3.5, Developing ≥ 2.75, Unsatisfactory below that.
