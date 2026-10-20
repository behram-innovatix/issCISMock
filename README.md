# ISS CIS: Central Intelligence System

An executive dashboard that brings performance data from every Issphere platform into one place. It is built for the CEO first and can be opened to other leaders later. It covers **EDU** (students) and **ERP**: **HR** (staff) and **Finance** (fees, budget, payroll and cash flow, in QAR). New platforms plug in through a registry.

In **API mode** all data comes from the **CIS API** ([`Herd/issCisApi`](../../../Herd/issCisApi), Laravel + MySQL). It pulls each connected source (issEduApi's database, ISS export APIs, REST APIs, spreadsheets, pushed records) into its own store on a schedule and serves the dashboards from there. Administrators manage those sources under **Administration → Connections**. A platform without synced data shows a "not connected" state instead of its dashboards.

In **mock mode** (the default, and what the Vercel preview of `main` runs) there is no backend: every dashboard, Aspect Analysis and the Connections screens run on data generated in the browser, in the same shape the CIS API returns. Changes made under Connections are kept in that browser only.

## Run it

```bash
npm install
npm run dev                  # http://localhost:3010, mock mode
```

To run against the CIS API instead:

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_DATA_SOURCE=api and CIS_API_TOKEN (php artisan cis:token in issCisApi)
npm run dev
```

The CIS API must then be running (Herd serves it at http://isscisapi.test) with a queue worker for syncs: `php artisan queue:work` and `php artisan schedule:work` in issCisApi.

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
| **Executive Overview** | `/` | Headline KPIs from every connected platform; student vs staff attendance; student, staff and fee-account alerts; school-by-school comparison incl. fee collection and budget variance |
| EDU Overview | `/edu` | Students, capacity, attendance, lateness, persistent absence, net behaviour |
| EDU Enrollment | `/edu/enrollment` | Year-group bars (click to drill down), gender, section capacity grid, nationality |
| EDU Attendance | `/edu/attendance` | Session mix, year groups, attendance bands, day-of-week heatmap, AM vs PM, mark codes |
| EDU Aspect Analysis | `/edu/aspects` | Assessment results by grade band per saved analysis, drilling from the group to students (mock mode; in API mode it waits for an assessment stream) |
| EDU Behaviour | `/edu/behaviour` | Attendance × behaviour matrix (click a box to list the students), leaderboards, behaviour types |
| EDU Students | `/edu/students`, `/edu/students/[id]` | Sortable register; profile with an AM/PM calendar, comparison with the class, and a behaviour log linked to staff |
| HR Overview | `/hr` | Staff attendance, absence, leave, average appraisal, cycle progress, by location and department |
| HR Attendance & Leave | `/hr/attendance` | Lateness heatmap, leave by type and month, balances, top absentees, pending requests |
| HR Performance | `/hr/performance` | Score distribution, rating mix, competency radar, performance × attendance 9-box, KPI attainment |
| HR Teacher Impact | `/hr/teacher-impact` | Each teacher's classes (EDU) next to their appraisal, plus a correlation scatter |
| HR Staff | `/hr/staff`, `/hr/staff/[id]` | Register; profile with a calendar, leave, appraisal history, competencies, KPIs and classes taught |
| Finance Overview | `/fin` | Income vs expenditure, revenue mix, budget vs actual, collection by school, largest overdue balances, year-end outlook |
| Finance Fees & Collections | `/fin/fees` | Current-term collection curve vs target, ageing, school × stage collection grid, year groups, discounts, payment methods |
| Finance Budget vs Actual | `/fin/budget` | Cumulative spend vs budget, overspends, category table, location × category variance grid, year-end forecast |
| Finance Payroll | `/fin/payroll` | Monthly payroll by component, new joiners (linked to HR), cost by department, grade and location, cost per student |
| Finance Cash Flow | `/fin/cash-flow` | Inflow vs outflow, cash position, income by stream, expenditure by category, days of cash on hand |
| Finance Fee Accounts | `/fin/accounts`, `/fin/accounts/[id]` | Register by status; statement with invoices, instalments, payments and a link to the EDU student |
| Connections | `/admin/connections` | Administrators: the data sources behind every dashboard — add (catalog of connector types), test, sync, history, files, push endpoint |

Filters (school, stage, year group, section, gender, period on EDU; location, department, role, period on HR; location, stage, period on Finance) apply to every screen in that platform.

## Architecture

```
app/(pages)/…                  thin route files → render a screen
app/api/insights/[platform]    server proxy: dashboard datasets from the CIS API (the API token stays on the server)
app/api/admin/connections/…    server proxy: connection management for administrators
src/platforms/registry.ts      every platform and how the sidebar groups them (EDU, ERP)
src/platforms/<code>/
  data/source.ts               loads the platform's dataset (CIS API, or mock)  ← the integration contract
  data/constants.ts            CIS vocabularies; reference data (schools, mark codes…) arrives with the dataset
  analytics.ts                 pure roll-ups the screens render (unit-testable, server-portable)
  state.ts, hooks.ts           zustand filters, TanStack Query hooks
  components/, features/*/screen.tsx
src/lib/calendar.ts            the reporting calendar, applied from the dataset (live bindings)
src/features/connections/      the Connections admin screens (forms generated from each connector's fields)
src/lib/data-source.ts         NEXT_PUBLIC_DATA_SOURCE: "mock" (default) or "api"
src/mock/                      mock mode: generators (edu, hr, fin), the world, insights payloads, Connections backend
src/components/{shell,ui,charts,insights}   shared layout, primitives, chart presets, KPI/matrix/calendar/table
```

### Where the data comes from

Each `data/source.ts` fetches `/api/insights/<platform>` (in mock mode, `src/mock/insights.ts` returns the same payload from generated data), which the CIS API builds from the synced marts of that platform's data sources. The EDU dataset brings its own reporting calendar (the school weeks up to the latest attendance mark) and reference data (schools, register mark codes and how they count, behaviour types, staff). HR and Finance report "not connected" until their sources (the seeded HRM and Finance API connections) are set up and their dataset builders exist in the CIS API.

### Adding a platform

Finance was added this way; use `src/platforms/fin/` as the template.

1. In the CIS API, add the platform's streams to `config/cis_streams.php` and a dataset builder for `/api/v1/insights/<code>`.
2. Create `src/platforms/<code>/` with `data/` (source, types, constants), `analytics.ts`, `state.ts`, `hooks.ts` and its screens.
3. Add routes under `app/(pages)/<code>/…`.
4. In `src/platforms/registry.ts`, set `status: "live"`, fill in `nav`, and add it to a suite in `SUITES`.
5. Add its headline metrics to `HEADLINES` in `src/features/executive/screen.tsx`.

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
- **Finance (cash basis, FY = calendar 2026):** actuals run to 8 Oct; October is month to date and its budget is pro-rated. Fees are billed per term (2025–26 Terms 2–3, 2026–27 Term 1).
- **Fee collection:** collected ÷ billed for invoices in the period. On target at 95% or above, watch at 88–95%, below target under 88%.
- **Fee account status:** *Paid* (no balance), *Current* (balance not yet due), *Overdue* (an instalment is past due), *In arrears* (more than 60 days overdue or a previous term unpaid).
- **Budget variance:** actual vs phased budget. Within +2% is on budget, up to +5% is on watch, beyond +5% is over budget. Salaries actuals are the HR payroll plus end-of-service accrual.
