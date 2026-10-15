# 🧩 Components History & Registry — Carlton CRM

> Every global/shared component must be logged here.
> **Before creating a new component**: search this file first (Ctrl+F).
> **After creating a global component**: add it here immediately.
> **After updating a global component**: bump version + update change log.

---

## How to Use

- **Before building**: search by name or category
- **After building**: fill the template, add to the correct category
- **When updating**: bump version, update "Used In", update "API Routes", add change log note

---

## 📋 Component Entry Template

```
### ComponentName
- **File**: `/components/[shared|ui|leads|teams|...]/ComponentName.tsx`
- **Version**: 1.0.0
- **Created**: YYYY-MM-DD
- **Last Updated**: YYYY-MM-DD
- **Status**: active | deprecated | wip

**Purpose**: One-line description.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|

**Used In (Pages)**:
| Route | Why |
|-------|-----|

**Used In (Components)**:
- `components/path/OtherComponent.tsx` — why

**Dependencies**:
- shadcn: ...
- hooks: ...

**Notes**: any gotchas

**Change Log**:
- 1.0.0 — Initial creation
```

---

## 🗂 Categories

---

## 🏗 Layout & Shell

---

### Header
- **File**: `components/layout/Header.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Top navigation bar — logo, page title, notification bell, user avatar/menu.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/leads/reminders/count` | `useMyReminderCount()` | Bell badge count |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/layout.tsx` | Shell — renders on every dashboard page |

**Used In (Components)**:
- `components/notifications/NotificationBell.tsx` — renders inside header right side

**Dependencies**:
- shadcn: `<Avatar />`, `<DropdownMenu />`
- hooks: `useLogout()`, `useAuthStore`

**Change Log**:
- 1.0.0 — Initial creation

---

### Sidebar
- **File**: `components/layout/Sidebar.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Left nav with route links, active-state highlighting, role-based visibility.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/teams/mine` | `useMyTeam()` | Shows "My Team" link only if user is in a team |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/layout.tsx` | Shell — renders on every dashboard page |

**Dependencies**:
- hooks: `useAuthStore`, `useMyTeam()`

**Notes**:
- Links hidden/shown based on `user.role.permissions`
- Collapses to bottom nav on mobile

**Change Log**:
- 1.0.0 — Initial creation

---

## 🔔 Notifications

---

### NotificationBell
- **File**: `components/notifications/NotificationBell.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Bell icon with badge in header. Opens panel with upcoming/due reminders.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/leads/reminders/mine` | `useMyReminders()` | List of user's reminders |
| GET | `/leads/reminders/count` | `useMyReminderCount()` | Unread badge count |

**Socket Events**:
| Event | Direction | Purpose |
|---|---|---|
| `reminder:due` | Server → Client | Real-time alert when reminder fires |
| `reminder:warning` | Server → Client | 30-min advance warning |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/layout.tsx` | Via `Header.tsx` — present on all dashboard pages |

**Used In (Components)**:
- `components/layout/Header.tsx`

**Dependencies**:
- hooks: `useMyReminders()`, `useMyReminderCount()`, `useReminderNotifications()`
- shadcn: `<Popover />` or `<DropdownMenu />`

**Change Log**:
- 1.0.0 — Initial creation

---

## 🪟 Modals & Overlays

---

### ResponsiveModal (responsive-dialog)
- **File**: `components/ui/responsive-dialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Renders `<Dialog />` on desktop, `<Drawer />` bottom sheet on mobile (`< 768px`). Use for ALL modals in the app.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | ✅ | — | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | ✅ | — | Toggle handler |
| `title` | `string` | ✅ | — | Modal / drawer title |
| `description` | `string` | ❌ | — | Subtitle text |
| `children` | `ReactNode` | ✅ | — | Body |
| `footer` | `ReactNode` | ❌ | — | Footer actions |
| `size` | `"sm"\|"md"\|"lg"\|"xl"` | ❌ | `"md"` | Desktop width |

**API Routes Used**: none (presentation only)

**Used In (Components)**:
- `components/leads/LeadDialog.tsx`
- `components/leads/AssignLeadDialog.tsx`
- `components/leads/ReminderPanel.tsx`
- `components/teams/TeamDialog.tsx`
- `components/users/UserDialog.tsx`
- `components/roles/RoleDialog.tsx`
- `components/courses/CourseDialog.tsx`
- `components/reports/ExportPdfDialog.tsx`

**Dependencies**:
- shadcn: `<Dialog />`, `<Drawer />`

**Notes**: Always prefer this over bare `<Dialog />` or `<Sheet />`

**Change Log**:
- 1.0.0 — Initial creation

---

### DeleteLeadDialog
- **File**: `components/leads/DeleteLeadDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Confirm and delete a single lead.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| DELETE | `/leads/:id` | `useDeleteLead()` | Delete the lead |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/page.tsx` | Delete action in lead row |

**Dependencies**: shadcn: `<AlertDialog />`

**Change Log**:
- 1.0.0 — Initial creation

---

### DeleteUserDialog
- **File**: `components/users/DeleteUserDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Confirm and delete a single user.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| DELETE | `/users/:id` | `useDeleteUser()` | Delete the user |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/users/page.tsx` | Delete action in user row |

**Change Log**:
- 1.0.0 — Initial creation

---

### DeleteTeamDialog
- **File**: `components/teams/DeleteTeamDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Confirm and delete a team.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| DELETE | `/teams/:id` | `useDeleteTeam()` | Delete the team |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/teams/page.tsx` | Delete from list |
| `app/(dashboard)/teams/[teamId]/page.tsx` | Delete from detail page |

**Change Log**:
- 1.0.0 — Initial creation

---

### DeleteRoleDialog
- **File**: `components/roles/DeleteRoleDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Confirm and delete a role.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| DELETE | `/roles/:id` | `useDeleteRole()` | Delete the role |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/roles/page.tsx` | Delete action in role row |

**Change Log**:
- 1.0.0 — Initial creation

---

### DeleteCourseDialog
- **File**: `components/courses/DeleteCourseDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Confirm and delete a course.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| DELETE | `/courses/:id` | `useDeleteCourse()` | Delete the course |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/courses/page.tsx` | Delete action in course row |

**Change Log**:
- 1.0.0 — Initial creation

---

## 📊 Data Display (Planned Global — WIP)

---

### DataTable
- **File**: `components/shared/DataTable.tsx`
- **Version**: 1.0.0
- **Status**: wip

**Purpose**: Generic sortable, filterable, paginated table (TanStack Table). Use for ALL data tables.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `ColumnDef<T>[]` | ✅ | — | Column definitions |
| `data` | `T[]` | ✅ | — | Row data |
| `isLoading` | `boolean` | ❌ | `false` | Shows skeleton |
| `pagination` | `PaginationState` | ❌ | — | Controlled pagination |
| `onPaginationChange` | `OnChangeFn<PaginationState>` | ❌ | — | Pagination handler |
| `sorting` | `SortingState` | ❌ | — | Controlled sort |
| `onSortingChange` | `OnChangeFn<SortingState>` | ❌ | — | Sort handler |
| `emptyMessage` | `string` | ❌ | `"No results"` | Empty state text |

**API Routes Used**: none (presentation — receives data as props)

**Notes**: Always pass `getRowId`; wrap column defs in `useMemo`

**Change Log**:
- 1.0.0 — Initial setup (WIP)

---

### Pagination
- **File**: `components/shared/Pagination.tsx`
- **Version**: 1.0.0
- **Status**: wip

**Purpose**: Standalone pagination bar. Used inside DataTable or standalone.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `page` | `number` | ✅ | — | Current page (1-based) |
| `totalPages` | `number` | ✅ | — | Total pages |
| `onPageChange` | `(page: number) => void` | ✅ | — | Callback |
| `pageSize` | `number` | ❌ | `10` | Items per page |
| `onPageSizeChange` | `(size: number) => void` | ❌ | — | Page size callback |
| `totalItems` | `number` | ❌ | — | Shows "X of Y" label |

**API Routes Used**: none

**Change Log**:
- 1.0.0 — Initial setup (WIP)

---

## 🔄 Feedback & States

---

### ErrorPage
- **File**: `components/ui/error-page.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Full-page or section-level error display with message and optional retry.

**API Routes Used**: none

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/error.tsx` | Global Next.js error boundary |
| `app/global-error.tsx` | Root-level error |
| `app/(dashboard)/*/error.tsx` | Per-route error pages (all dashboard routes) |

**Change Log**:
- 1.0.0 — Initial creation

---

### LoadingSkeleton *(WIP)*
- **File**: `components/shared/LoadingSkeleton.tsx`
- **Version**: 1.0.0
- **Status**: wip

**Purpose**: Layout-matching skeleton. Pass `variant` matching the content loading.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `"table"\|"card"\|"form"\|"list"` | ✅ | — | Shape to mimic |
| `rows` | `number` | ❌ | `5` | Skeleton row count |

**Change Log**:
- 1.0.0 — Initial setup (WIP)

---

### EmptyState *(WIP)*
- **File**: `components/shared/EmptyState.tsx`
- **Version**: 1.0.0
- **Status**: wip

**Purpose**: Empty list state: icon + message + optional CTA.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `icon` | `ReactNode` | ❌ | default | Lucide icon |
| `title` | `string` | ✅ | — | Main message |
| `description` | `string` | ❌ | — | Supporting text |
| `action` | `{ label: string; onClick: () => void }` | ❌ | — | CTA button |

**Change Log**:
- 1.0.0 — Initial setup (WIP)

---

## 📝 Forms & Inputs (Planned Global — WIP)

---

### FormField
- **File**: `components/shared/FormField.tsx`
- **Version**: 1.0.0
- **Status**: wip

**Purpose**: RHF `Controller` + shadcn `Input` + label + error — eliminates boilerplate.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | ✅ | — | RHF field name |
| `control` | `Control<any>` | ✅ | — | RHF control |
| `label` | `string` | ❌ | — | Label text |
| `placeholder` | `string` | ❌ | — | Placeholder |
| `type` | `string` | ❌ | `"text"` | Input type |
| `disabled` | `boolean` | ❌ | `false` | Disable |

**Change Log**:
- 1.0.0 — Initial setup (WIP)

---

### SearchInput
- **File**: `components/shared/SearchInput.tsx`
- **Version**: 1.0.0
- **Status**: wip

**Purpose**: Debounced search input — calls `onSearch` after user stops typing.

**Props**:
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onSearch` | `(value: string) => void` | ✅ | — | Debounced callback |
| `debounceMs` | `number` | ❌ | `400` | Debounce delay |
| `placeholder` | `string` | ❌ | `"Search..."` | Placeholder |
| `defaultValue` | `string` | ❌ | `""` | Initial value |

**Change Log**:
- 1.0.0 — Initial setup (WIP)

---

## 🎛 Feature-Specific Components

---

### LeadDialog
- **File**: `components/leads/LeadDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Create or edit a lead. Full lead form with all fields.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| POST | `/leads` | `useCreateLead()` | Create new lead |
| PUT | `/leads/:id` | `useUpdateLead()` | Update existing lead |
| GET | `/courses/all` | `useAllCourses()` | Populate course dropdown |
| GET | `/teams` | `useTeams()` | Populate team dropdown |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/page.tsx` | "Add Lead" button + row edit action |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx` — wraps the form

**Dependencies**:
- hooks: `useCreateLead()`, `useUpdateLead()`, `useAllCourses()`, `useTeams()`
- react-hook-form + zod

**Change Log**:
- 1.0.0 — Initial creation

---

### AssignLeadDialog
- **File**: `components/leads/AssignLeadDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Assign a lead to a team (and optionally a user within the team).

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/teams` | `useTeams()` | Team dropdown |
| PATCH | `/leads/:id/team` | `useAssignLeadToTeam()` | Assign to team |
| PATCH | `/leads/:id/assign` | `useAssignLead()` | Assign to specific user |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/page.tsx` | Assign action in lead row |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx`

**Change Log**:
- 1.0.0 — Initial creation

---

### ReminderPanel
- **File**: `components/leads/ReminderPanel.tsx`
- **Version**: 1.2.0
- **Last Updated**: 2026-04-01
- **Status**: active

**Purpose**: CRUD panel for reminders on a lead. IST-aware time display, add/edit/delete/mark-done.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| POST | `/leads/:leadId/reminders` | `useAddReminder(leadId)` | Create reminder |
| PUT | `/leads/:leadId/reminders/:id` | `useUpdateReminder(leadId)` | Edit reminder |
| DELETE | `/leads/:leadId/reminders/:id` | `useDeleteReminder(leadId)` | Delete reminder |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/[leadId]/page.tsx` | Reminders tab in lead detail |

**Dependencies**:
- hooks: `useAddReminder()`, `useUpdateReminder()`, `useDeleteReminder()`
- `lib/animations.ts`
- shadcn: `<Input type="datetime-local" />`, `<Textarea />`, `<Button />`

**Notes / Gotchas**:
- `toDatetimeLocal(iso)` → uses `sv-SE` + `Asia/Kolkata` — never `getHours()` (see `mistakes.md` M-002)
- `handleSave()` → appends `:00+05:30` before sending (see `mistakes.md` M-003)
- Input has `min={nowIST()}` — blocks past-time selection
- All display times appended with " IST"

**Change Log**:
- 1.0.0 — Initial creation
- 1.1.0 — Added IST-aware time display
- 1.2.0 — Fixed `toDatetimeLocal` (sv-SE/Kolkata); fixed `:00+05:30` parsing; added `min={nowIST()}`; added `timeError` state (2026-04-01)

---

### AiChatPanel
- **File**: `components/leads/AiChatPanel.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: AI chat assistant for a lead. Powered by Anthropic Claude via backend.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/ai/memory/lead/:leadId` | `useAiMemory("lead", leadId)` | Load conversation history |
| POST | `/ai/chat/lead/:leadId` | `useAiChat("lead", leadId)` | Send message, get reply |
| DELETE | `/ai/memory/lead/:leadId` | `useClearAiMemory("lead", leadId)` | Clear conversation |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/[leadId]/page.tsx` | AI Chat tab |

**Dependencies**:
- hooks: `useAiMemory()`, `useAiChat()`, `useClearAiMemory()` from `hooks/useAiChat.ts`
- shadcn: `<ScrollArea />`, `<Textarea />`, `<Button />`

**Notes**: Conversations scoped to `leadId + userId` — each user has separate history per lead

**Change Log**:
- 1.0.0 — Initial creation

---

### PaymentPanel
- **File**: `components/leads/PaymentPanel.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Add, edit, delete payment records for a lead. Shows payment history.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| POST | `/leads/:leadId/payments` | `useAddPayment(leadId)` | Add payment |
| PUT | `/leads/:leadId/payments/:id` | `useUpdatePayment(leadId)` | Edit payment |
| DELETE | `/leads/:leadId/payments/:id` | `useDeletePayment(leadId)` | Remove payment |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/[leadId]/page.tsx` | Payments tab |

**Dependencies**: hooks: `useAddPayment()`, `useUpdatePayment()`, `useDeletePayment()` from `hooks/usePayments.ts`

**Change Log**:
- 1.0.0 — Initial creation

---

### LeadsDateFilter
- **File**: `components/leads/LeadsDateFilter.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Date range picker for filtering leads by creation date.

**API Routes Used**: none (emits filter values up via props callback)

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/leads/page.tsx` | Filter bar — `dateFrom`/`dateTo` params |

**Change Log**:
- 1.0.0 — Initial creation

---

### TeamDialog
- **File**: `components/teams/TeamDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Create or edit a team. Fields: name, description, leaders, members.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| POST | `/teams` | `useCreateTeam()` | Create team |
| PUT | `/teams/:id` | `useUpdateTeam()` | Update team |
| GET | `/users` | `useUsers()` | Populate leader/member dropdowns |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/teams/page.tsx` | "Add Team" button |
| `app/(dashboard)/teams/[teamId]/page.tsx` | Edit team |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx`

**Change Log**:
- 1.0.0 — Initial creation

---

### UserDialog
- **File**: `components/users/UserDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Create or edit a user. Fields: name, email, password, role, designation.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| POST | `/users` | `useCreateUser()` | Create user |
| PUT | `/users/:id` | `useUpdateUser()` | Update user |
| GET | `/roles/all` | `useRolesSimple()` | Role dropdown |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/users/page.tsx` | "Add User" button + row edit |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx`

**Change Log**:
- 1.0.0 — Initial creation

---

### RoleDialog
- **File**: `components/roles/RoleDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Create or edit a role with a full permission matrix.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/roles/:id` | `useRole(id)` | Load existing role for edit |
| POST | `/roles` | `useCreateRole()` | Create role |
| PUT | `/roles/:id` | `useUpdateRole()` | Update role + permissions |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/roles/page.tsx` | "Add Role" + edit actions |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx`
- `components/roles/PermissionMatrix.tsx`

**Change Log**:
- 1.0.0 — Initial creation

---

### PermissionMatrix
- **File**: `components/roles/PermissionMatrix.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Visual module × action grid with checkboxes. Used only inside `RoleDialog`.

**API Routes Used**: none (receives/emits permissions via props)

**Used In (Components)**:
- `components/roles/RoleDialog.tsx`

**Notes**:
- Modules: `dashboard | leads | teams | users | roles | reports`
- Actions: `view | create | edit | delete`

**Change Log**:
- 1.0.0 — Initial creation

---

### CourseDialog
- **File**: `components/courses/CourseDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Create or edit a course.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/courses/:id` | `useCourse(id)` | Load existing course for edit |
| POST | `/courses` | `useCreateCourse()` | Create course |
| PUT | `/courses/:id` | `useUpdateCourse()` | Update course |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/courses/page.tsx` | "Add Course" + row edit |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx`

**Change Log**:
- 1.0.0 — Initial creation

---

### ExportPdfDialog
- **File**: `components/reports/ExportPdfDialog.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Options modal for exporting report data as PDF.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/reports/overview` | `useReportOverview()` | Data to export |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(dashboard)/reports/page.tsx` | Export button |

**Used In (Components)**:
- `components/ui/responsive-dialog.tsx`

**Change Log**:
- 1.0.0 — Initial creation

---

### LoginForm
- **File**: `components/auth/LoginForm.tsx`
- **Version**: 1.0.0
- **Status**: active

**Purpose**: Email + password login form with validation and submit handler.

**API Routes Used**:
| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| POST | `/auth/login` | `useLogin()` | Authenticate user |

**Used In (Pages)**:
| Route | Why |
|-------|-----|
| `app/(auth)/login/page.tsx` | The login page |

**Dependencies**:
- hooks: `useLogin()` from `hooks/useAuth.ts`
- react-hook-form + zod

**Change Log**:
- 1.0.0 — Initial creation

---

## 🗺 Full Route → Component → API Map

> Quick reference: for each page, what components are used and what APIs are called.

### `app/(auth)/login/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| `LoginForm` | `POST /auth/login` |

---

### `app/(dashboard)/leads/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /leads`, `PATCH /leads/:id/status`, `POST /leads/auto-assign`, `PATCH /leads/bulk/status`, `DELETE /leads/bulk`, `PATCH /leads/bulk/team` |
| `LeadDialog` | `POST /leads`, `PUT /leads/:id`, `GET /courses/all`, `GET /teams` |
| `AssignLeadDialog` | `GET /teams`, `PATCH /leads/:id/team`, `PATCH /leads/:id/assign` |
| `DeleteLeadDialog` | `DELETE /leads/:id` |
| `LeadsDateFilter` | — (emits filter values only) |

---

### `app/(dashboard)/leads/[leadId]/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /leads/:id`, `PUT /leads/:id`, `PATCH /leads/:id/status`, `POST /leads/:leadId/notes`, `PUT /leads/:leadId/notes/:id`, `DELETE /leads/:leadId/notes/:id` |
| `ReminderPanel` | `POST /leads/:leadId/reminders`, `PUT /leads/:leadId/reminders/:id`, `DELETE /leads/:leadId/reminders/:id` |
| `PaymentPanel` | `POST /leads/:leadId/payments`, `PUT /leads/:leadId/payments/:id`, `DELETE /leads/:leadId/payments/:id` |
| `AiChatPanel` | `GET /ai/memory/lead/:id`, `POST /ai/chat/lead/:id`, `DELETE /ai/memory/lead/:id` |

---

### `app/(dashboard)/leads/upload/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `POST /leads/upload` |

---

### `app/(dashboard)/reminders/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /leads/reminders/mine`, `POST /leads/:leadId/reminders`, `PUT /leads/:leadId/reminders/:id`, `DELETE /leads/:leadId/reminders/:id` |

---

### `app/(dashboard)/teams/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /teams` |
| `TeamDialog` | `POST /teams`, `GET /users` |
| `DeleteTeamDialog` | `DELETE /teams/:id` |

---

### `app/(dashboard)/teams/[teamId]/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /teams/:id`, `GET /teams/:id/leads`, `GET /teams/:id/member-stats`, `GET /teams/:id/dashboard`, `GET /teams/:id/logs`, `GET /teams/:id/updates`, `POST /teams/:id/messages`, `POST /teams/:id/auto-assign`, `PATCH /teams/:id/members/:memberId/toggle-active`, `PATCH /teams/:id/leads/:leadId/assign`, `PATCH /teams/:id/leads/bulk/assign`, `PATCH /teams/:id/leads/bulk/transfer`, `PATCH /teams/:id/leads/bulk/status`, `PATCH /leads/:leadId/transfer`, `GET /teams/:id/revenue`, `GET /teams/:id/revenue/timeline` |
| `TeamDialog` | `PUT /teams/:id`, `GET /users` |
| `DeleteTeamDialog` | `DELETE /teams/:id` |

---

### `app/(dashboard)/teams/[teamId]/members/[memberId]/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /teams/:id/members/:memberId`, `GET /teams/:id/members/:memberId/leads` |

---

### `app/(dashboard)/users/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /users` |
| `UserDialog` | `POST /users`, `PUT /users/:id`, `GET /roles/all` |
| `DeleteUserDialog` | `DELETE /users/:id` |

---

### `app/(dashboard)/users/[userId]/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /users/:id`, `PUT /users/:id`, `GET /users/:id/leads`, `GET /users/:id/lead-stats` |

---

### `app/(dashboard)/roles/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /roles` |
| `RoleDialog` | `GET /roles/:id`, `POST /roles`, `PUT /roles/:id` |
| `DeleteRoleDialog` | `DELETE /roles/:id` |

---

### `app/(dashboard)/courses/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /courses` |
| `CourseDialog` | `GET /courses/:id`, `POST /courses`, `PUT /courses/:id` |
| `DeleteCourseDialog` | `DELETE /courses/:id` |

---

### `app/(dashboard)/reports/page.tsx`
| Component | APIs Called |
|-----------|-------------|
| Page direct | `GET /reports/overview`, `GET /reports/timeline`, `GET /reports/users`, `GET /reports/teams`, `GET /reports/team-split`, `GET /reports/revenue/overview`, `GET /reports/revenue/timeline`, `GET /reports/revenue/teams`, `POST /ai/chat/report`, `GET /ai/memory/report/report`, `DELETE /ai/memory/report/report` |
| `ExportPdfDialog` | `GET /reports/overview` |

---

### `app/(dashboard)/layout.tsx` (all dashboard pages)
| Component | APIs Called |
|-----------|-------------|
| `Header` → `NotificationBell` | `GET /leads/reminders/mine`, `GET /leads/reminders/count` |
| `Sidebar` | `GET /teams/mine` |
| Socket (via `useReminderNotifications`) | Events: `reminder:due`, `reminder:warning` |

---

## ➕ Adding a New Component

1. Copy the template at the top
2. Place in the correct category
3. Fill **every section** including "API Routes Used" and "Used In (Pages)"
4. If reusable in 2+ places → `/components/shared/`, status: `active`
5. Update this file's component count

**Component count**: 24
*(Increment every time you add a component)*

---

## TeamRemindersTab (added 2026-04-06)

**File:** `components/teams/TeamRemindersTab.tsx`
**Props:** `teamId: string`, `members: { _id: string; name: string }[]`
**Used in:** `app/(dashboard)/teams/[teamId]/page.tsx` — "Reminders" tab (leader/admin only)
**Hook:** `useTeamReminders(teamId, filters)` from `hooks/useTeams.ts`
**Features:** Search (debounced 400ms), member filter, isDone filter (pending/done), pagination (20/page), overdue badge, Framer Motion stagger list.

---

## MemberSelector (added 2026-04-24)

**File:** `app/(dashboard)/leads/upload/page.tsx` (inline sub-component)
**Props:** `teamId: string`, `members: TeamMember[]`, `inactiveMembers: string[]`, `selected: Set<string>`, `locked?: boolean`, `lockedIds?: string[]`, `onChange: (id: string) => void`
**Used in:** `TeamMemberSelector` → upload page
**Purpose:** Renders member pills with checkboxes. Locked mode (BDE): members can't be deselected. Inactive members shown greyed/disabled. "All/None" quick actions for admins.

---

## TeamMemberSelector (added 2026-04-24)

**File:** `app/(dashboard)/leads/upload/page.tsx` (inline sub-component)
**Props:** `teams: Team[]`, `selectedTeamIds: Set<string>`, `selectedMemberIds: Record<string, Set<string>>`, `lockedTeamId?: string | null`, `lockedMemberId?: string | null`, `onToggleTeam: (id: string) => void`, `onToggleMember: (teamId: string, memberId: string) => void`, `onSetAllMembers: (teamId: string, all: boolean) => void`
**Used in:** upload page
**Purpose:** Vertical list of team rows, each expands to show `MemberSelector`. BDE sees only their team (locked, non-removable). Admins can toggle any team + any member. Framer Motion AnimatePresence for expand/collapse.

---

## CloseLeadDialog / CloseLeadsQueue (added 2026-10-01)

**File:** `components/students/CloseLeadDialog.tsx`
**CloseLeadDialog props:** `lead: Lead`, `progress?: string`, `onClose()`, `onClosed()` — the enrolment dialog (`CreateStudentModal`) for one lead, fetching its existing enrolment first. Mount with `key={lead._id}`.
**CloseLeadsQueue props:** `leadIds: string[]`, `markClosed(leadId) => Promise`, `onDone({ closed, skipped })` — several leads closed one enrolment after another ("2 of 5"); a dismissed dialog skips that lead, it is not closed. Each lead is fetched fresh (`useLead`).
**Used in:** leads page (status menu, bulk Change Status → Closed), `KanbanBoard` (card dropped on Closed), team page (bulk Change Status → Closed, closing through the team's own bulk route).
**Why:** every way of closing a lead goes through its enrolment — a lead closed without one never reaches finance, the LMS or Tetra Commission.

## CreateStudentModal — bonus question (changed 2026-10-01)

"Bonus given? No / Yes" with the amount when yes — required on a first close, editable on Save enrolment. "Pending" is now "Balance" (fee − paid; a bonus is never part of it). New optional prop `progress` for the queue. `EditStudentModal` and the student page's Fee Summary show the bonus too.

## MapCourseDialog (added 2026-10-04, replaces MapToFinanceDialog)

**File:** `components/courses/MapCourseDialog.tsx`
**Props:** `course: Course | null`, `open: boolean`, `onClose: () => void`
**Used in:** `app/(dashboard)/courses/page.tsx` — the Map button on each course card, and the card's mapping chips
**Purpose:** Where a course goes when it is sold: the Delta Finance product it bills as (select), and the LMS course(s) the student gets on approval (a checkbox list; tick order is the order they open — two for a bundle). Says so plainly when finance or the LMS is not connected or cannot be read. The same component as the Draw and Remote CRMs.

## CourseDialog (changed 2026-10-04)

A Bonus field (the course's currency, 0 for none) beside the Amount on Add and Edit, with "A new close starts from it". The course card shows "· $X bonus" beside the fee.

## CreateStudentModal (changed 2026-10-04)

A new close starts "Bonus given?" at yes with the course's bonus, marked "From the course — change it if this sale differs"; choosing another course moves it until the seller answers or types an amount (`bonusTouched`). Editing an enrolment never takes it.

---

## Commission page (added 2026-10-04)

**Route:** `app/(dashboard)/commission/page.tsx` — tabs Earnings / Plan; in the sidebar for every role (`permModule: null`).
**EarningsTab** (`components/commission/EarningsTab.tsx`): month picker (UAE months), totals, each person's Sales Staff / TL / SM, and every sale with its lines or why it is on hold, excluded or reversed.
**PlanTab** (`components/commission/PlanTab.tsx`): how it's paid (per `TL_RULE`), a card per course (Super Admins edit and save each row), the Sales Manager, excluded logins, team leaders to fix, sales on hold.
**CommissionPreview** (`components/commission/CommissionPreview.tsx`): props `courseId`, `teamId`, `closerId` — what the counsellor earns on the sale, in the closing dialog; never blocks a close.
**Changed:** the course card shows its commission (Sales / TL / SM, MT5 credit) and links to the plan; `CreateStudentModal` shows `CommissionPreview` after the fee.

---

## EnrolmentSteps (added 2026-10-04, replaces AfterApproval)

**File:** `components/students/EnrolmentSteps.tsx` — `EnrolmentStepsStrip({ steps })` (five pills at the foot of a My Enrolments card, details on hover, and "Next step: …" / "Every step done") and `EnrolmentStepsList({ steps })` (the enrolment page: each step with its detail, who and when). Green done, amber waiting, red stopped, grey unknown / not needed.
**Page:** `app/(dashboard)/enrolments/[id]/page.tsx` — opened from the student's name on a card; the steps and the sale's commission.

### Change log — 2026-10-05 (View as)
- `ImpersonationBanner` (new, `components/shared/`) — the amber bar while viewing as someone: name, email (wider screens), "View
  only", m:ss left, "Back to my account"; goes back on its own at zero. Rendered by `Header` above the header bar. Its fade-in is
  defined in the file (this app keeps animation variants per component).
- `lib/impersonation.ts` (new) — `getViewAs`, `canViewAs`, `beginViewAs`, `endViewAs`, `leaveViewAsForSignOut`; localStorage
  `crm-view-as`, `crm-own-auth`.
- Users list (row actions) and user page (next to Export PDF) — "View as" for super admins (`canViewAs`).
- `lib/axios.ts` — a 401 while viewing goes back to the admin's account, not /login. `useLogout` ends the session first;
  `usePushNotification` won't subscribe or unsubscribe while viewing, and `NotificationBell` doesn't ask for push then.

### Change log — 2026-10-05 (split payments)
- `PaymentRowsEditor` (new, `components/students/`) — one row per payment at the close: method, amount (fixed for the money
  already on the lead), its own receipt upload; add / remove rows. Exports `newPaymentRow`, `rowAmount`, `missingInRows`.
- `CreateStudentModal` — a new close uses the rows instead of one method and one receipt; red "more than the fee" and a blocked
  save when collected is above the fee (edit mode too).

### Change log — 2026-10-05 (notification sounds)
- `lib/alertTone.ts` — `playAlertSound("lead" | "other")` plays `/sounds/new-lead.mp3` or `/sounds/notification.mp3`
  (decoded once, unlocked on the first tap/key; falls back to the old chime). Replaces `playAlertTone`.
- `NotificationBell` — the lead sound for `lead_assigned`, the other sound for every other notification.
- `useReminderNotifications` — `ring()`: the other sound and the browser notification, for due and upcoming reminders.

### Change log — 2026-10-05 (test notifications)
- `NotificationTests` (new, `components/notifications/`) — the collapsible "Test notifications" section in the bell
  panel: device status + Enable, sound buttons (`playAlertSound(kind, { force: true })`), a local test notification
  (`showLocalTestNotification`), and "Send a test to all my devices" (`sendTestPush` → `POST /push/test`).

### Change log — 2026-10-05 (salary slabs)
- `components/pay/PayMonthCard` (new) — a person's month on their slab (total, salary, commission earned, paid at N%,
  approved sales, the next level, what isn't counted yet); `compact` for the dashboard. Exports `basisOf(row, own)`.
- `components/pay/SlabLadder` (new) — `LadderBar` (a bar filled to the month's sales, ticks at each level, scaleX) and
  `SlabTable` (the slab top-down, the level reached highlighted, the next one flagged).
- `components/pay/EveryonePayTable` (new) — everyone's month with totals, for a Super Admin or the Sales Manager.
- `components/pay/DashboardPayCard` (new) — the top of the dashboard: `PayMonthCard compact`, or everyone's totals for a
  Super Admin not on a slab, or nothing.
- `components/commission/SlabsCard` (new) — the slabs on Commission → Plan; Super Admin editing (add / remove levels, the
  base row's target fixed at 0, checks before save).
- `app/(dashboard)/my-pay/page.tsx` (new) — My Pay; sidebar item "My Pay" (no permModule, like Commission).

### Change log — 2026-10-10 (academy at the close)
- `AcademyBadge` (new, `components/students/`) — Dubai / Bangalore pill.
- `PaymentRowsEditor` — `academy` prop; Bangalore: ₹ amounts, "Paid in AED" (AED + rate), the lead's own money at a rate.
  `rowAmount(r, academy)`, `missingInRows(rows, academy)`, new `rowAed`, `rowOriginal`.
- `CreateStudentModal` — the academy selector (only when the server offers Bangalore; read only when editing a Bangalore
  enrolment), Bangalore price / ₹, no lead payments for Bangalore.
- `CorrectEnrolmentDialog` — academy badge (read only), ₹, Bangalore price on course change, AED payments restored.
- `MapCourseDialog` — Bangalore section (price, Bangalore finance product, LMS courses).
- `lib/currency` — `fmtINR`, `fmtAED`, `fmtAcademy(n, academy)`.

### Change log — 2026-10-10 (the client's email)
- `AddEnrolmentEmail` (new, `components/students/`) — "Add the client's email and send again": an email field (checked
  with `EMAIL_RE`) and Send again (`useAddEnrolmentEmail`); after saving, "Email added — sending to finance…". Props
  `studentId`, `initialEmail?`, `className?`. Mounted only when the server says `needsEmail`: on My Enrolments cards
  (instead of the "Could not reach finance" line and "Generate invoice"), the enrolment page header and the student page
  — for whoever has `enrolments:edit` (others see a plain line on the first two).
- `CreateStudentModal` — asks for the client's email in the details strip when the lead has none that works (or one
  finance won't take), required for a new close; sent as `email`.
- `CorrectEnrolmentDialog` — `EMAIL_RE` now from `types/student`.
- Enrolment page and student page — "Sending to finance…" while a first send is on its way.

### Change log — 2026-10-10 (one email, one client)
- `CreateStudentModal` — a lead email another client holds is treated as missing: the Email field shows with
  "<lead email>: This email is already used by …", saving blocked until the client's own (free) email is typed
  ("Still needed: the client's own email"); the typed email is checked too; "Checking the client's email…" while asked.
  The lead keeps its email.
- `CorrectEnrolmentDialog` — the same message under Email (from the check, or the server's 409); blocks saving when the
  client's name and phone are as saved, only warns when they were changed (the server weighs those on save).
- `AddEnrolmentEmail` — the same message, Send again disabled while the email is taken or being checked.

---

### callUi (CallResult, CallPerson, RecordingPlayer, SyncNote, fmtDuration, fmtTalkTotal, fmtWhen)
- **File**: `/components/calls/callUi.tsx`
- **Version**: 1.0.0
- **Created**: 2026-10-12
- **Status**: active

**Purpose**: How a 3CX call shows (ported from Tetra Commission): in/out + Connected / Missed / Not answered badge, the
person (CRM user or extension), a recording player (asks for a 10-minute link, plays in `<audio>`, a button per part),
and the sync line (last synced / 3CX not connected / first import / the error for a super admin).

**Used In**: `app/(dashboard)/calls/page.tsx`, `components/leads/CallsPanel.tsx`.

### CallsPanel (updated 2026-10-12)
- **File**: `/components/leads/CallsPanel.tsx` — now the lead's **3CX** calls (`useLeadThreecxCalls`), totals chips,
  first 8 with "Show all", recordings; the ClickToCall button unchanged; hidden history for a role without `calls:view`.

---

### CallFlow (CallFlowProvider, useCallFlow, dialNumbers)
- **File**: `/components/calls/CallFlow.tsx`
- **Version**: 1.0.0
- **Created**: 2026-10-12
- **Status**: active

**Purpose**: Call, then log it — as in Tetra Commission's `CallFlow.jsx`. One set of dialogs for the app, mounted by
`app/(dashboard)/layout.tsx`. A Call button opens **CallChoiceDialog**: "3CX call" (when `GET /calls/3cx/click-to-call`
says the caller's extension is known and 3CX is connected; otherwise why not) or "Phone call" (tel:), a picker when the
lead has several numbers, Copy number, Open the 3CX web client. A 3CX call (`POST /calls/3cx/call`) opens **CallWindow**:
polls `GET /calls/3cx/my-call` every 2 s — ringing your 3CX, calling the lead, connected with a timer, ended — Hang up
(`POST /calls/3cx/hang-up`), Log the call, Close (the call goes on). When it ends, or on Log the call, or after a Phone
call, **AfterCallDialog** "How did the call go?": connected yes/no (prefilled when 3CX saw it connect); the status — Keep,
or any of the CRM's statuses (not connected / CNC / callback first when it didn't connect): follow-up opens
`FollowupDetailsModal` (what happened, when, next follow-up date and time), lost opens `LostReasonModal`, closed opens
`CloseLeadDialog` (the enrolment; the lead is closed only once it is saved), anything else `PATCH /leads/:id/status`;
cancelling one of those comes back to the popup. Notes are saved as a lead note (`POST /leads/:id/notes` — the note's
activity too): "Call (3CX|phone) — connected|not connected · status → X" + the notes. **Later** puts it aside: the log is
kept in sessionStorage (`crm.pendingCallLog`, 8 hours), reopens after a reload, and a "not logged yet — Log it" chip
stays in the corner. "Don't log" drops it. Only for calls started here, and only for roles with `leads:edit`.

**Used In**: `ClickToCall` (every Call button: lead page, leads table, calls page, profile, CallsPanel), `KanbanBoard`
(card menu "Call").

### ClickToCall (rewritten 2026-10-12)
- **File**: `/components/leads/ClickToCall.tsx` — same props; opens the CallFlow choice (tel: when no provider). No longer
  posts `/calls/click` or `PATCH /leads/:id/call-count`.

### Call counts from 3CX (2026-10-12)
- Lead page: the two +/− counters are replaced by a read-only "Calls · from 3CX" box (Calls / Connected / Not connected).
- Leads table: a "Calls (3CX)" column (all · connected · not), on by default.
- `KanbanBoard`: card badges calls · connected · not connected; the preview shows all three; the card menu's "CNC +1"
  is now "Call". `TeamMemberKanban`: calls · not connected badges.

### Leaderboard page / DashboardLeaderboardCard (updated 2026-10-12)
- Rank by Revenue (as before) / Calls / Talk time; the page adds Calls, Connected and Talk time columns (3CX calls by
  whoever took them); the card shows Calls + Talk time when ranked by them.

### Change log — 2026-10-13 (exact money figures)
- `lib/currency.ts` — `fmtFull` caps at two decimals and reads a missing amount as 0; `fmtCompact` is now only for chart axes.
- `app/(dashboard)/reports/page.tsx` — `fmtUSD` is `fmtFull` (was `fmtCompact`); `KpiCard` puts the value on its own full-width line, smaller when long (> 7 / > 10 characters); the revenue chart's Y axis keeps `fmtCompact`.
- `app/(dashboard)/teams/[teamId]/page.tsx` — `fmtUSD` is `fmtFull`; new local `MoneyFigure` for the Total Received / Total Pending / Avg per Lead cards; the Y axis keeps `fmtCompact`.

### Change log — 2026-10-15 (reports by programme)
- `components/reports/ProgramTagsDialog.tsx` (new) — the Programmes screen: Lead sources / Courses (one list at a time,
  so long names read in full), a native select per row (— None, Forex, Digital Academy, JURA), "suggested" / "changed"
  badges, search, "Not saved yet", "Save N changes" (only the rows that differ from what is saved). Icon-only trigger
  on phones.
- `app/(dashboard)/reports/page.tsx` — programme row (`PROGRAM_TABS`) above the report tabs; `?program=`; the tab
  content wrapped in `ReportProgramContext.Provider`; what-counts line / nothing-tagged warning; Programmes button for
  `canEdit`; Export PDF gets the programme.
- `components/reports/ExportPdfDialog.tsx` — `program` prop (overall export only).

### Change log — 2026-10-15 (inactive leads)
- `app/(dashboard)/inactive-leads/page.tsx` (new) — stats, Inactive now / Moves log, filters; tables from `lg`, cards
  below (`LeadCard`, `MoveCard`: why it won't move on its own and who lost it before written out); long names clamp to
  two lines in the table; `HowBadge` (`compact` on cards); the team filter from `useInactiveLeadTeams`; an emptied last
  page steps back; an unknown state shows as itself; the tab bar scrolls inside itself; ticking and Move only with the
  box's edit; no page padding of its own (the layout's `<main>` has it).
- `components/inactive-leads/MoveLeadsDialog.tsx` (new) — `ResponsiveDialog` (a drawer on phones): next in their team /
  a person (`useMovePeople`, searchable, asked for only while open on it; the current owner can't be picked).
- `components/settings/AutomationSettingsCard.tsx` (new) — on the Settings page; renders nothing without Settings view.
- `components/shared/StatCard.tsx`, `Pager.tsx`, `ListStates.tsx` (`EmptyState`, `ErrorState`, `TableSkeleton`),
  `lib/animations.ts` (new, as in the Remote CRM) — a StatCard fills its grid cell, so a row of them is one height.
- `components/notifications/NotificationBell.tsx` — merges the stored notices (`stored`), keeping one that came on the
  socket after the list was read; types `inactive_lead_moved`, `inactive_leads_moved`, `inactive_leads_stuck`; read /
  dismiss / clear also on the server.
- `components/layout/Sidebar.tsx` — Inactive Leads (`Hourglass`, `permModule: "inactive-leads"`); the new-leads count
  refreshes on a stored notice too (its type at the top) and on a lead moved away.
- `app/(dashboard)/leads/[leadId]/page.tsx` — `inactive_reassigned` in the activity log; "by System" with no person.

### Change log — 2026-10-15 (the open leaderboard, a TV board)
- `app/public/leaderboard/page.tsx` (new) — outside the dashboard layout, no sign-in. CSS variables for the two themes
  (solid colours; dark unless `public-leaderboard-dark` = "0" in this browser) and a boot script, so a light screen
  never flashes dark. `PersonCard` (a phone layout and a desktop / TV grid with a header row; 1st–3rd in gold / silver
  / bronze — border, side bar, badge, the ranked figure), `RankMark` (`Trophy3D` for the leader only, turning with CSS;
  numbered badges below), `Flash` (a changed figure blue for a moment, not on switching month or ranking),
  `TargetBar` / `TargetFigure`, `LeadsNow` (the leads held now, by status), `Clock` (Dubai, ticks on its own). Controls
  fade after 4 s idle and the pointer hides (≥ 1024 px); auto-scroll after 20 s idle when taller than the screen
  (≥ 1024 px); full screen; ▲ / ▼ for 8 s after a live re-order; a month with nothing in it shows "Nothing on the
  board yet".
- `app/public/leaderboard/layout.tsx` (new) — title "Leaderboard — Delta Sales", dark status bar.
- `app/(dashboard)/leaderboard/page.tsx` — Today column (current month only); **Public link** (copies, else opens).
- `hooks/useLeaderboard.ts` — `usePublicLeaderboard`, `useLeaderboardLive`, the new optional row fields.
- The open board's statuses are named from `lib/statusConfig.ts` (`STATUS_META`), in pipeline order with closed and lost
  last; an unknown key in its own words ("unknown" → "Unknown"). Shared links carry og site name and type.

### Change log — 2026-10-15 (Activity, with the HRMS)
- `app/(dashboard)/activity/page.tsx` (new, as in the Remote CRM) — stats, People / Attendance / Sign-ins / Idle
  alerts; cards below `lg`, tables from it; `ShiftLine` ("Shift 10:00–19:00 · in 09:57") under each person's status;
  the Attendance tab's day picker ("Today" back), search and team filter.
- `components/activity/AttendanceTable.tsx` (new) — the day's counts, then a card per person (phones, tablets) or a
  table (shift, in, out, sessions, worked, day, now); `dayBadge`, `nowBadge`; the HRMS not answering → a warning.
- `components/activity/TeamAttendanceTab.tsx` (new) — a team's page → Attendance: a day picker and the table.
- `app/(dashboard)/teams/[teamId]/page.tsx` — the Attendance tab, for its leaders or the Activity box.
- `components/settings/AutomationSettingsCard.tsx` — the Idle alerts section; working hours say both clocks.
- `components/layout/Sidebar.tsx` — Activity (`permModule: "activity"`).
- `components/notifications/NotificationBell.tsx` — `idle_self`, `idle_alert`.
- `app/(dashboard)/layout.tsx` — `useActivityHeartbeat()`.
- Later the same day: the Activity header's badge says "Idle alerts paused · the HRMS isn't answering" (`idleRule.paused`);
  `AttendanceTable` exports `clockAt` and `shiftText`, says "no clock-out" for a past day, and "isn't linked yet" vs
  "didn't answer"; `TeamAttendanceTab` answers a 403 with "Not yours to see".

### Change log — 2026-10-15 (currency on the account)
- `app/(dashboard)/settings/page.tsx` — the Currency card uses `chooseCurrency`; its text says the choice follows you.
- `app/(dashboard)/layout.tsx` — `useSyncedCurrency()`; the page sits in `CurrencyRedraw` (new,
  `components/shared/CurrencyRedraw.tsx`), which draws it again when the account's currency arrives as the app opens —
  not on a pick in Settings, nor while someone is typing.
- `app/(dashboard)/settings/page.tsx` — its toasts go through `@/lib/toast` (the app's toaster; `sonner`'s never showed).
