# Frontend Implementation

Super Admin collection pages use Django-backed pagination, filters, sample visibility, CSV exports, and validated response contracts. Runtime business-data fixtures and generated plan/domain/payment fallbacks are not used.

## UI Source
Designs are based on files in:
`UI:Ux design/`

The implemented UI lives in `frontend/` and uses the local `academic_precision` and `academic_vitality` design notes: Inter typography, professional education SaaS spacing, blue primary actions, white cards, light page backgrounds, 8px/12px radius, subtle borders, and soft elevation.

## Implemented Screens
| Design File | Route | Component/Page | Status | Notes |
|---|---|---|---|---|
| `landing_page.png` | `/` | `src/app/(public)/page.tsx` | Implemented | Public hero, features, pricing preview, CTAs |
| `pricing_page.png` | `/pricing` | `src/app/(public)/pricing/page.tsx` | Implemented | Plan cards and organization CTA |
| `login_page.png` | `/login` | `AuthForm` | Implemented | API-connected login |
| `register_page.png` | `/register` | `AuthForm` | Implemented | API-connected host registration |
| `join_quiz.png` | `/join` | `JoinForm` | Implemented | API-connected room join |
| `active_question.png` | `/play/[roomCode]` | `PlayRoom` | Implemented | Polls room state and submits answers |
| `leaderboard.png` | `/leaderboard/[roomCode]` | `LeaderboardView` | Implemented | Polls leaderboard and links CSV export |
| `unified_host_dashboard.png`, `host_dashboard.png` | `/dashboard` | dashboard page | Implemented | Host shell, stats, actions, upgrade gate |
| `upgrade_required_modal.png`, `upgrade_required_modal_mobile.png` | `/dashboard/host-passes` | host pass page | Implemented | Host-facing pass usage and upgrade path |
| `create_quiz_page.png` | `/dashboard/quizzes/create` | `CreateQuizForm` | Implemented | API-connected quiz create |
| `quiz_editor.png` | `/dashboard/quizzes/[quizId]/edit` | `QuestionEditor` | Implemented | API-connected question add |
| `create_live_room_page.png` | `/dashboard/quizzes/[quizId]/host` | `CreateRoomForm` | Implemented | API-connected live room create |
| `explore_quizzes.png` | `/dashboard/explore` | explore page | Implemented | API-backed public/organization quiz library |
| `ai_question_generator.png` | `/dashboard/quizzes/[quizId]/ai-generate` | `AiGeneratorForm` | Implemented | BYOK Gemini in frontend |
| `ai_preview_page.png` | `/dashboard/quizzes/[quizId]/ai-preview/[generationId]` | `AiPreview` | Implemented | API-connected draft load/publish |
| `unified_live_room_control.png`, `host_live_room_control.png`, `host_live_room_mobile.png` | `/host/room/[roomCode]` | `HostRoomControl` | Implemented | API-connected controls plus responsive mobile actions |
| `upgrade_required_modal.png`, `upgrade_required_modal_mobile.png` | Reusable state | `UpgradeRequiredModal` | Implemented | Used in dashboard, host pass, and room setup |
| `unified_admin_overview.png`, `admin_overview.png` | `/admin` | organization overview page | Implemented | Organization Console shell, metrics, activity, route cards |
| `host_user_management.png`, `host_users_mobile.png` | `/admin/users` | organization people page | Implemented | Organization Console shell, API-backed user table and cards |
| `invite_user_flow.png` | `/admin/users/invite` | organization invite page | Implemented | Organization Console shell, invite form UI, role selection |
| `host_pass_management.png` | `/admin/host-passes` | organization host pass inventory page | Implemented | Organization Console shell, API-backed pass table |
| `organization_settings.png`, `organization_settings_mobile.png` | `/admin/organization-settings` | organization settings page | Implemented | Organization Console shell, branding, plan, seat utilization UI |
| `unified_enterprise_analytics.png`, `enterprise_analytics_dashboard.png` | `/admin/analytics` | organization analytics page | Implemented | Organization Console shell, KPI cards, mastery chart, insight panel |
| `detailed_analytics_reports.png`, `detailed_analytics_mobile.png` | `/admin/analytics/reports` | organization reports page | Implemented | Organization Console shell, report table and mobile KPI section |
| `individual_host_analytics.png` | `/admin/users/[userId]/analytics` | organization host analytics detail page | Implemented | Organization Console shell, host profile, quiz table, subject bars |
| `ai_usage_log.png` | `/admin/ai-usage` | organization AI usage audit page | Implemented | Organization Console shell, BYOK audit table |
| `department_collaborative_workspace.png` | `/admin/workspace` | organization department workspace page | Implemented | Organization Console shell, API-backed shared template table |
| `live_proctoring_intervention_dashboard.png` | `/admin/proctoring/[roomCode]` | organization proctoring page | Implemented | Organization Console shell, room-derived intervention UI |
| `automated_knowledge_gap_reports.png` | `/admin/knowledge-gaps` | organization knowledge gaps page | Implemented | Organization Console shell, answer-derived gap and recommendation UI |

## User Flow
1. Public users land on `/`, choose `/pricing`, `/register`, `/login`, or `/join`.
2. Hosts register/login, open `/dashboard`, create a quiz, add questions manually or use AI generation, then create a live room.
3. Participants join by room code, answer active questions, and view the leaderboard.
4. Hosts control sessions from `/host/room/[roomCode]`.
5. Organization admins open the Organization Console at `/admin` to manage people, host passes, analytics, AI usage, settings, and advanced organization dashboards.

## Flow Separation

Assumption: the resource documents use Enterprise workflow, Admin, and Organization for the same tenant-management area. The frontend keeps the documented `/admin/*` route paths, but the implemented layout and navigation call this surface the Organization Console.

Host flow:
- Routes: `/dashboard`, `/dashboard/*`, `/host/room/[roomCode]`.
- UI shell: `WorkspaceShell` in host mode.
- Primary actions: create quiz, explore quizzes, generate BYOK AI questions, create room, control room, review host-level analytics and host pass usage.
- Permissions/data: host APIs require `requireHost`; admins can also use host APIs where the backend explicitly allows admin ownership override.

Organization flow:
- Routes: `/admin`, `/admin/*`.
- UI shell: `OrganizationShell`.
- Primary actions: manage organization users, invites, host pass inventory, tenant analytics, AI audit, organization settings, shared workspace, proctoring, and knowledge gap reporting.
- Permissions/data: organization APIs use documented `/api/admin/*` endpoints guarded by `requireAdmin`; advanced organization screens now use backend-derived data.

Organization UI flow:
- Uses a separate dark Organization Console sidebar, organization navigation labels, organization search copy, and a secondary "Host workspace" context switch.
- Does not reuse Host primary CTA behavior such as "Host a Quiz" as an organization workflow action.
- Reuses only shared low-level UI primitives (`Button`, `Card`, `DataTable`, `StatTile`, `ProgressBars`) for consistency.

## Design System
- Colors: primary blue `#1d4ed8/#2563eb`, ink `#14213d`, paper `#f7f9fc`, white cards, slate borders, semantic green/orange/red.
- Typography: Inter, bold dashboard headings, readable 14px-18px body text, large mobile participant question text.
- Spacing: 8px grid, 16px mobile margins, 24px/32px dashboard gaps.
- Radius/shadows: 8px buttons/inputs, 12px cards, 16px modals/hero blocks, `shadow-card` and `shadow-lifted`.
- Reusable components: `PublicShell`, `WorkspaceShell`, `OrganizationShell`, `MobileBottomNav`, `Button`, `Card`, `Badge`, `Field`, `Input`, `Tabs`, `DataTable`, `StatTile`, `ProgressBars`, `UpgradeRequiredModal`.

## Routes
Public/auth: `/`, `/pricing`, `/login`, `/register`, `/join`.

Host/participant: `/dashboard`, `/dashboard/explore`, `/dashboard/host-passes`, `/dashboard/analytics`, `/dashboard/quizzes/create`, `/dashboard/quizzes/[quizId]/edit`, `/dashboard/quizzes/[quizId]/host`, `/dashboard/quizzes/[quizId]/ai-generate`, `/dashboard/quizzes/[quizId]/ai-preview/[generationId]`, `/host/room/[roomCode]`, `/play/[roomCode]`, `/leaderboard/[roomCode]`.

Organization/admin: `/admin`, `/admin/users`, `/admin/users/invite`, `/admin/users/[userId]/analytics`, `/admin/host-passes`, `/admin/analytics`, `/admin/analytics/reports`, `/admin/ai-usage`, `/admin/organization-settings`, `/admin/workspace`, `/admin/proctoring/[roomCode]`, `/admin/knowledge-gaps`.

## Organization Route And Data Map
| Route | Screen | Permission | Backend API / Data Source | Notes |
|---|---|---|---|---|
| `/admin` | Organization overview | Admin only | `/api/admin/overview` | Tenant overview; route path remains `/admin` per docs |
| `/admin/users` | Host user management | Admin only | `/api/admin/users` | Backend read API |
| `/admin/users/invite` | Invite user flow | Admin only | `POST /api/admin/users/invite` plus `/api/admin/organization-settings` for seat usage | Creates backend invite records |
| `/admin/host-passes` | Host pass inventory | Admin only | `/api/admin/host-passes` | Backend supports list/create; richer actions pending |
| `/admin/organization-settings` | Organization settings | Admin only | `GET/PATCH /api/admin/organization-settings` | Read/update organization profile/settings |
| `/admin/analytics` | Organization analytics | Admin only | `/api/admin/analytics` | Backend-derived KPIs, topics, reports |
| `/admin/analytics/reports` | Detailed analytics reports | Admin only | `/api/admin/analytics/reports` | Backend-derived report rows |
| `/admin/users/[userId]/analytics` | Individual host analytics | Admin only | `/api/admin/users/[userId]/analytics` | Backend-derived host analytics |
| `/admin/ai-usage` | AI usage audit | Admin only | `/api/admin/ai-usage` | Confirms backend never stores Gemini keys |
| `/admin/workspace` | Department workspace | Admin only | `/api/admin/workspace` | Backend-derived shared quiz templates |
| `/admin/proctoring/[roomCode]` | Proctoring/intervention | Admin only | `/api/admin/proctoring/[roomCode]` | Room/participant-derived intervention data |
| `/admin/knowledge-gaps` | Knowledge gap reports | Admin only | `/api/admin/knowledge-gaps` | Answer-derived gap data |

## API Integration
Frontend calls use relative `/api/*` URLs. Set `USE_DJANGO_API="true"` and `DJANGO_API_URL` to the Django service URL; `frontend/next.config.mjs` proxies the requests without exposing the backend URL to browser components. Production frontend builds require `DJANGO_API_URL`.

| Endpoint | Method | Purpose | Request | Response |
|---|---|---|---|---|
| `/api/auth/login` | POST | Login host/admin | email, password | auth session |
| `/api/auth/register` | POST | Create host | name, email, password | user |
| `/api/rooms/[roomCode]/join` | POST | Join participant | displayName | participant session |
| `/api/rooms/[roomCode]` | GET | Poll room state | none | room/current question |
| `/api/rooms/[roomCode]/answer` | POST | Submit answer | questionId, selectedOption | answer result |
| `/api/leaderboard/[roomCode]` | GET | Poll rankings | none | leaderboard rows |
| `/api/rooms/[roomCode]/results.csv` | GET | Export room results | none | CSV |
| `/api/quizzes` | POST | Create quiz | quiz metadata | quiz id |
| `/api/quizzes/[quizId]/questions` | POST | Add question | MCQ fields | question |
| `/api/rooms` | POST | Create live room | room settings | room code |
| `/api/rooms/[roomCode]/start` | POST | Start room | none | room |
| `/api/rooms/[roomCode]/pause` | POST | Pause room | none | room |
| `/api/rooms/[roomCode]/next-question` | POST | Advance room | none | room |
| `/api/rooms/[roomCode]/end` | POST | End room | none | room |
| Browser Gemini API | POST | Generate and repair AI JSON directly from browser BYOK keys | prompt, model settings | temporary JSON only |
| `/api/quizzes/[quizId]/questions` | POST | Save final accepted AI/manual question | MCQ fields | question |
| `/api/admin/*` | GET | Existing admin summaries | none | admin data |
| `/api/host/dashboard` | GET | Host dashboard data | none | stats, drafts, active rooms |
| `/api/host/analytics` | GET | Host analytics data | none | stats, subjects, recent rooms |
| `/api/host/host-passes` | GET | Host pass availability | none | stats, passes |

## State Management
Client state is local React state. Live room, participant question, and leaderboard screens poll server endpoints. AI keys are stored only in browser state/localStorage when the user opts in. Quick AI Gen stores raw JSON, validation errors, and repair attempts only in browser session state, then posts final accepted questions to the existing question save API. Host and organization app screens read backend `/api/*` data; `src/lib/ui-data.ts` is limited to public landing/pricing content.

## Pending Items
- Add richer admin actions for assigning/extending/revoking host passes.
- Add screenshot-level visual regression tests for the PNG set.
- Improve active route highlighting in the sidebar.
