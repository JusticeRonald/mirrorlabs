# Technical Debt - Mirror Labs WebApp

Known issues documented but not yet fixed. Review and address as time permits.

---

## Documented Issues

### From January 31, 2026 (SOG Compression Pipeline)

| # | Category | Issue | Risk | Location |
|---|----------|-------|------|----------|
| 11 | Architecture | Edge Function manually mimics BullMQ internal job structure | Med | `supabase/functions/enqueue-compression/` |
| 12 | Code Quality | Worker temp directory not fully cleaned up | Low | `worker/src/compress.ts` |
| 13 | Observability | No dead letter queue alerting for failed compression jobs | Med | Worker infrastructure |
| 14 | Security | Service role key in multiple places (Edge Function + Worker) | Low | Environment configuration |

**Mitigation for #11**: BullMQ job structure is stable in v5.x. Pin version in worker/package.json (done). Add integration test to catch format changes if BullMQ is upgraded.

---

### From January 27, 2026 code review:

| # | Category | Issue | Risk | Location |
|---|----------|-------|------|----------|
| 1 | Architecture | ViewerPage.tsx 1,371 lines | Med | `src/pages/ViewerPage.tsx` |
| 2 | Performance | N+1 query in getWorkspaces() | Med | `src/lib/supabase/services/workspaces.ts` |
| 3 | Performance | annotation_replies subscription unfiltered | Low | Real-time subscriptions |
| 4 | Architecture | No centralized keyboard shortcut system | Low | Various components |
| 5 | Testing | No test framework or tests | Med | Project-wide |
| 6 | Code Quality | Viewer3D ref callback pattern | Low | `src/components/viewer/Viewer3D.tsx` |
| 7 | Code Quality | Console logging in AuthContext (~10 stmts) | Low | `src/contexts/AuthContext.tsx` |
| 8 | Code Quality | Duplicate UUID validation across services | Low | `src/lib/supabase/services/` |
| 9 | Code Quality | Dead deprecated methods in SceneManager | Low | `src/lib/viewer/SceneManager.ts` |
| 10 | TypeScript | Strict mode disabled project-wide | Low | `tsconfig.json` |

---

## From January 25, 2026 review (P3 - Future Sprint)

- Verbose auth context logging (AuthContext.tsx lines 288-300)
- Missing JSDoc documentation across services
- Hardcoded values in Profile page

---

## Priority Guide

| Risk | Action |
|------|--------|
| **High** | Address before next release |
| **Med** | Schedule for next sprint |
| **Low** | Address when touching related code |

---

## Verified - No Fix Needed

These items were investigated and determined not to need changes:

- **MeasurementRenderer.ts** — `dispose()` already exists with `removeEventListener('resize', ...)`
- **annotation_replies RLS** — Policies exist in `schema.sql` (lines 500-516)
- **Viewer3D.tsx ref pattern** — Intentional design to prevent stale closures
