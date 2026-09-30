# PROJECT_MAP: Language Learning Center Management Platform

## [TECH_STACK]

| Layer | Technology | Version | Status | Notes |
|-------|-----------|---------|--------|-------|
| Runtime | Node.js (LTS) | **24.18.0** | Active LTS | Installed: v24.14.1. Prefer LTS over Current (v26.x) |
| Language | TypeScript | **6.0.3** | Latest stable | v7.0 RC available — use stable for production |
| Framework | Next.js | **16.2.10** | Latest stable | App Router, React 19, Server Components |
| UI Library | React | **19.2.7** | Latest stable | Bundled with Next.js 16 |
| Styling | Tailwind CSS | **4.x** (latest) | Latest | RTL variants (`rtl:`, `ltr:`) built-in |
| UI Components | shadcn/ui | Latest | Latest | Radix UI primitives, accessible |
| Database | MySQL (via `@prisma/adapter-mariadb`) | **—** | Configured | MySQL connection via DATABASE_URL env var |
| ORM | Prisma | **7.8.0** | Latest stable | Type-safe client, migrations |
| Auth | jose | **6.2.3** | Latest stable | JWT signing/verification (ESM) |
| Validation | zod | **3.x** (latest) | Latest | Schema validation |
| Logging | pino | **10.3.1** | Latest stable | Async by default, JSON-native |
| i18n | next-intl | **4.13.1** | Latest stable | RTL/LTR, ICU messages, type-safe |
| Charts | recharts | **3.9.1** | Latest stable | React chart library, composable |
| PDF | jspdf | **4.2.1** | Latest stable | Client + server PDF generation |
| Excel | exceljs | **4.4.0** | Latest stable | XLSX export on server side |
| QR Code | qrcode | **1.5.4** | Stable | Canvas/SVG QR generation |
| Barcode | react-barcode | **1.6.1** | Stable | React barcode component (JsBarcode wrapper) |
| Rich Text | @tiptap/react | **2.x** (latest) | Latest | CMS content editor (ProseMirror-based) |
| Date/Time | date-fns | **3.6.0** | Stable | v4 had Turbopack compatibility issues; using v3 |

### Dependency Rationale
- **jose** over `jsonwebtoken`: `jsonwebtoken` unmaintained since 2023. jose is actively maintained, native ESM, Web Crypto API.
- **pino** over `winston`: 10x+ faster, async by default, zero-dependency JSON serialization.
- **next-intl**: only i18n lib with first-class Next.js App Router + RTL support + server components.
- **date-fns** over `moment`: moment deprecated. date-fns modular, i18n-ready for Arabic/English.
- **exceljs** over `xlsx`: streaming API, better for large datasets, supports styling.
- **jspdf**: lightweight, works on both client and server via `Buffer` shim.
- **@tiptap/react**: headless, extensible, easy CMS integration with custom menus.
- **qrcode + react-barcode**: both mature, lightweight, SVG-capable (print quality).

---

## [SYSTEM_FLOW]

### Roles & Permissions Matrix (5 Roles)
```
                   super_admin   admin/staff   teacher   student   parent
Dashboard           R             R             R         R         R
Users (CRUD)        CRUD          R(scope)      -         -         -
Languages           CRUD          R             -         -         -
Courses/Levels      CRUD          CRUD(scope)   R         R         R
ClassGroups         CRUD          CRUD(scope)   R(assigned)R         R
Schedules           CRUD          CRUD(scope)   R(own)    R(enrolled)R(enrolled)
Attendance          CRUD          CRUD(scope)   CRUD(own) R         R
Grades/Exams        CRUD          R(scope)      CRUD(own) R         R
Certificates        CRUD          CRUD(scope)   Confirm   R(download)R
Payments            CRUD          CRUD(scope)   -         R(self)   R(dependents)
Teacher Salary      CRUD          -             -         -         -
Reports/Exports     CRUD          R(scope)      R(own)    R(own)    R(own)
CMS Content         CRUD          -             -         -         -
Audit Logs          CRUD          -             -         -         -
System Settings     CRUD          -             -         -         -
```

### User Journeys

**A. Public-Facing Homepage (CMS-driven)**
```
[Public Visitor]
  ├─ Home: hero, featured courses, stats counter
  ├─ About: center info, team, mission
  ├─ Courses: browse levels, descriptions, pricing
  ├─ Events: calendar, upcoming events
  ├─ Gallery: photos/videos
  ├─ Testimonials: student reviews
  ├─ FAQ: dynamic accordion
  ├─ Contact: form → email notification
  └─ Registration → redirect to login/register portal
```

**B. Registration Flow (Hybrid)**
```
[New Student]                           [Existing Student]
     |                                       |
     v                                       v
Registration Form → Account Created      Login → Dashboard
     |                                       |
     v                                       v
Browse Open Courses                     Browse Open Courses
(Courses with active registration       (Same)
 windows & available seats)
     |                                       |
     v                                       v
Select Course → Enter Prerequisite       Select Course
Certificate # (if level > beginner)          |
     |                                       v
     v                                   Enroll (if open)
System Validates:                         + auto-check prerequisites
 1. Certificate exists?
 2. Belongs to this student?
 3. Same language?
 4. Within 2-year validity?
     |
     v
[Pass] → Enroll + status: pending     [Fail] → Rejected with reason
     |
     v
Admin confirms → Enrollment active
```

**C. Level Progression Logic (Critical Business Rule)**
```
Level N → Level N+1 requires:
  ├─ Completed Level N in same language
  ├─ Certificate # issued for Level N
  ├─ Certificate belongs to this student
  ├─ Certificate not expired (< 2 years since issue_date)
  └─ Certificate not already used for another enrollment
```

**D. Teacher Sandbox Isolation**
```
Teacher Login → Dashboard
  ├─ Only sees: assigned class_groups
  ├─ Only sees: students in those groups
  ├─ Can: take attendance, enter grades
  ├─ Can: confirm pass/fail (is_confirmed_by_teacher)
  └─ Cannot: view other groups, other students, financial data
```

**E. Certificate Lifecycle**
```
Teacher confirms pass → is_confirmed_by_teacher = true
  → Certificate record created (issue_date = now, expiration_date = now + 2 years)
  → Student can download PDF with QR code
  → Student can use certificate # to unlock next level
  → Countdown timer: 2-year validity visible in student profile
  → After expiration: certificate invalid for progression
```

**F. Payment & Teacher Salary Flow**
```
Student submits proof (receipt upload / cash recorded)
  → Admin verifies → status: paid
  → Receipt generated (dynamic PDF)
  ──
Teacher weekly/monthly:
  → System calculates salary = hours_taught × rate
  → based on attendance records
  → Admin reviews and approves payout
```

**G. Notification Engine Flow**
```
Event (enrollment, grade, payment, schedule change, absence)
  → Central Notification Broker (event-driven)
    → Log to database (notifications table)
    → Prepare channel payloads
      ├─ In-app: notification bell + badge
      ├─ Email: (future: resend/nodemailer)
      └─ SMS: (future: twilio)
```

---

## [ARCHITECTURE]

### Directory Structure
```
portailciel/
├── messages/                    # i18n translation files
│   ├── en.json
│   └── ar.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── images/
│   ├── fonts/
│   └── uploads/                 # CMS media, student docs
├── src/
│   ├── app/
│   │   ├── [locale]/            # Locale-based routing (en, ar)
│   │   │   ├── (public)/        # Public CMS-driven pages
│   │   │   │   ├── page.tsx           # Home
│   │   │   │   ├── about/
│   │   │   │   ├── courses/
│   │   │   │   ├── events/
│   │   │   │   ├── gallery/
│   │   │   │   ├── faq/
│   │   │   │   └── contact/
│   │   │   ├── (auth)/          # Auth routes
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── forgot-password/
│   │   │   ├── (dashboard)/     # Authenticated app shell
│   │   │   │   ├── dashboard/
│   │   │   │   ├── courses/     # Course/group/enrollment management
│   │   │   │   ├── students/
│   │   │   │   ├── teachers/
│   │   │   │   ├── schedules/
│   │   │   │   ├── attendance/
│   │   │   │   ├── grades/
│   │   │   │   ├── certificates/
│   │   │   │   ├── payments/
│   │   │   │   ├── reports/
│   │   │   │   ├── notifications/
│   │   │   │   ├── settings/    # System config, CMS, themes
│   │   │   │   └── audit-logs/
│   │   │   └── layout.tsx       # Root layout with dir={rtl|ltr}
│   │   ├── api/                 # API route handlers per domain
│   │   │   ├── auth/
│   │   │   ├── courses/
│   │   │   ├── students/
│   │   │   ├── attendance/
│   │   │   ├── grades/
│   │   │   ├── certificates/
│   │   │   ├── payments/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   ├── cms/
│   │   │   └── audit/
│   │   ├── middleware.ts        # Locale detection + auth (jose)
│   │   └── i18n.ts
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   └── shared/              # App-specific: DataTable, SearchBar,
│   │                            #   Pagination, QRCode, Barcode,
│   │                            #   IDCard, CertificatePreview,
│   │                            #   NotificationBell, ThemeToggle,
│   │                            #   LocaleSwitcher, RichTextEditor
│   ├── features/
│   │   ├── auth/                # login form, register form, auth hooks
│   │   ├── courses/             # course form, level form, group form
│   │   ├── students/            # student form, enrollment form
│   │   ├── attendance/          # attendance grid, status components
│   │   ├── grades/              # grade entry, result sheet
│   │   ├── certificates/        # certificate viewer, validation UI
│   │   ├── payments/            # payment form, receipt, salary calc
│   │   ├── schedules/           # calendar, timetable components
│   │   ├── reports/             # chart widgets, export buttons
│   │   ├── notifications/       # notification list, preferences
│   │   ├── cms/                 # page builder, media manager, SEO form
│   │   ├── settings/            # system config forms
│   │   └── audit/               # audit log viewer and filters
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── auth.ts              # JWT create/verify, session
│   │   ├── logger.ts            # Pino logger
│   │   ├── permissions.ts       # Role-based access helpers
│   │   ├── audit.ts             # Audit log write helper
│   │   ├── notifications.ts     # Notification broker + dispatch
│   │   ├── certificates.ts      # Validation engine, PDF generation
│   │   ├── financial.ts         # Salary calc, receipt generation
│   │   ├── export.ts            # PDF/Excel report exports
│   │   ├── utils.ts             # cn(), format helpers, date-fns wrappers
│   │   └── constants.ts         # Enums, config constants
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css          # Tailwind + CSS variables for theming
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── PROJECT_MAP.md
```

### Data Model (Prisma)
```
User { id, email, password, name, phone, role (SuperAdmin|Admin|Teacher|Student|Parent),
       locale, theme, avatar, isActive, createdAt, updatedAt }
StudentProfile { id, userId, dateOfBirth, nationalId, emergencyContact,
                 guardianName, guardianPhone, notes, createdAt }
TeacherProfile { id, userId, specialization, hireDate, hourlyRate, isActive }
Language { id, name, code, isActive }
Level { id, languageId, name, code, order, description, price, isActive }
Course { id, languageId, levelId, name, code, description, maxStudents,
         registrationOpen, registrationStart, registrationEnd, isActive }
ClassGroup { id, courseId, name, teacherId, room, startDate, endDate, maxCapacity, isActive }
Enrollment { id, studentId, classGroupId, prerequisiteCertId, enrolledAt,
             status (Pending|Active|Completed|Dropped), isConfirmedByTeacher }
Attendance { id, enrollmentId, date, status (Present|Absent|Late|Excused), createdAt }
Exam { id, classGroupId, name, date, maxScore }
Grade { id, enrollmentId, examId, score, gradedAt, gradedBy }
Certificate { id, studentId, levelId, certificateNumber (unique), issueDate,
              expirationDate, issuedBy, status (Valid|Expired|Revoked) }
Schedule { id, classGroupId, dayOfWeek, startTime, endTime, room }
Payment { id, enrollmentId, amount, dueDate, paidDate, status (Pending|Paid|Overdue),
          method (Cash|Transfer|Receipt), receiptUrl, verifiedById, createdAt }
TeacherPayout { id, teacherId, periodStart, periodEnd, hoursWorked, rate,
                grossAmount, deductions, netAmount, status (Pending|Approved|Paid), paidAt }
Notification { id, userId, type, channel, title, messageEn, messageAr,
               data (JSON), isRead, createdAt }
AuditLog { id, userId, action, tableAffected, recordId, oldValue, newValue,
           ipAddress, timestamp }
CmsPage { id, slug, titleEn, titleAr, contentEn, contentAr, seoTitle, seoDescription,
          seoKeywords, isPublished, publishedAt, updatedAt }
Media { id, url, type (Image|Video), alt, uploadedById, createdAt }
Event { id, titleEn, titleAr, descriptionEn, descriptionAr, date, location, isActive }
Testimonial { id, studentName, contentEn, contentAr, rating, isActive }
Faq { id, questionEn, questionAr, answerEn, answerAr, order, isActive }
SystemSetting { id, key, value (JSON), updatedAt }
```

---

## [ORPHANS & PENDING]

| Item | Status | Priority | Notes |
|------|--------|----------|-------|
| Email sending integration (resend/nodemailer) | PENDING | Medium | Next phase: connect notification broker to email |
| SMS notifications (Twilio) | PENDING | Low | Future enhancement |
| Real-time WebSocket (live notifications) | PENDING | Low | Polling is fine for v1 |
| File upload infrastructure | PENDING | Medium | For receipt images, CMS media |
| Rate limiting (middleware) | PENDING | High | Add before production deployment |
| CI/CD pipeline (GitHub Actions) | PENDING | Medium | After v1 stabilization |
| Unit + E2E tests (Vitest + Playwright) | PENDING | High | Begin adding tests |
| Multi-tenancy (multiple centers) | PENDING | Low | Out of scope for v1 |
| Mobile app (React Native) | PENDING | Low | Future phase |
| AI placement test / auto-grading | PENDING | Low | Future phase |

---

## Protocol Outputs

### Protocol 1: Temporal Awareness
System datetime: **2026-07-03 22:23 UTC+1** (verified via PowerShell `Get-Date`). All versions above confirmed latest stable as of this date.

### Protocol 2: Scope Boundary (No Feature Creep)
**IN SCOPE (MVP) — Verifiable:**
1. Public CMS homepage (hero, courses, events, gallery, testimonials, FAQ, contact)
2. Super Admin CMS (site name, favicon, logo, fonts, nav menus, pages, SEO, colors)
3. 5-role RBAC: super_admin → admin → teacher → student → parent
4. Auth: register (new student), login (existing), JWT middleware
5. Registration windows with open/close dates + capacity
6. Hybrid registration: new → apply + account; existing → login → enroll
7. Level progression: prerequisite cert validation (exists, unique, owned, same language, <2yr)
8. Course, class group, enrollment CRUD
9. Schedule management (weekly timetable)
10. Attendance tracking with statuses
11. Exam/grade management with teacher confirmation
12. Certificate generation (PDF + QR) with 2-year expiry countdown
13. Payment tracking + receipt generation (dynamic PDF)
14. Teacher salary automation (hours × rate from attendance)
15. Role-based dashboards (stats, charts)
16. Report export (PDF, Excel)
17. In-app notifications (notification broker, event-driven)
18. Security audit logging (user_id, action, table_affected, timestamp)
19. i18n Arabic/English + RTL/LTR
20. Dark/Light theme toggle
21. Mobile-first responsive UI
22. QR/Barcode on printed student/teacher ID cards

**EXCLUDED FROM MVP:**
- Email/SMS delivery (notifications queued to DB only)
- Real-time WebSocket
- Multi-tenancy
- Mobile apps
- AI features

### Protocol 3: Surgical Architecture
- **No shared service layer**: Route Handlers call Prisma directly via `src/lib/db.ts`
- **No DTOs**: Prisma-generated types used everywhere
- **Feature modules** in `src/features/` only when logic is reused across >1 route
- **Server Components by default**; `"use client"` only for interactivity (forms, toggles)
- **No micro-files**: merge into single files until >300 lines
- **i18n via next-intl** with ICU messages; `dir` attribute bound to locale
- **Theming**: Tailwind CSS variables for light/dark; CSS logical properties for RTL
- **Separation of public (CMS) and private (dashboard) routes** at app router level

### Protocol 4: Logging Strategy
- **Library**: pino (async, JSON, <1µs per call)
- **Levels**: fatal, error, warn, info, debug
- **No PII**: passwords stripped; emails hashed in logs
- **Audit trail**: dedicated AuditLog table (captures user_id, action, table_affected, old/new value, IP, timestamp)
- **Format**: `{ timestamp, level, msg, requestId, userId, action }`
- **Storage**: stdout dev; file/production aggregator

### Protocol 5: Notification Engine (Event-Driven)
- **Broker pattern**: Event emitted → write to `Notification` table → async dispatch to channels
- **Triggers**:
  - Student: schedule change, exam date, grade posted, payment reminder, attendance warning
  - Teacher: assigned to group, grade deadline approaching
  - Admin: new registration, receipt upload, teacher confirmed grades
- **Channels (MVP)**: in-app only (notification bell + badge count)
- **Channels (future)**: email, SMS

---

## [MILESTONES — BUILD STATUS]

### M1 — Foundation (COMPLETED ✓)
- [x] `npx create-next-app@latest` (TS + Tailwind + App Router)
- [x] Full Prisma schema (23 models) → `prisma migrate dev` → MySQL database
- [x] next-intl setup: en.json, ar.json, locale routing, RTL layout
- [x] Auth: jose JWT + middleware + login/register/logout pages + API routes
- [x] `src/lib/` core: db, auth, logger, constants, utils, permissions, audit, notifications, certificates
- [x] Tailwind CSS v4 + CSS variables for light/dark theme
- [x] RTL logical properties + dark mode class strategy
- **Verified**: `npm run build` succeeds (zero errors)

### M2 — CMS + Public Site + Settings (COMPLETED ✓)
- [x] SystemSetting model + API endpoint (CRUD)
- [x] Language/Level/Course/ClassGroup API routes
- [x] Registration window logic (open/close dates + capacity)
- [x] Seed data: admin, teacher, student accounts
- [x] CMS API routes: `/api/cms/pages`, `/api/cms/events`, `/api/cms/testimonials`, `/api/cms/faq`, `/api/cms/media` (full CRUD per model)
- [x] Public pages (route group `(public)/`): dynamic homepage (testimonials, events, FAQs from DB), About (from CmsPage), Events listing, Gallery (from Media), FAQ, Contact
- [x] Public layout: sticky header with nav + mobile hamburger, footer with links
- [x] Super Admin CMS dashboard: `/settings` (General), `/settings/pages`, `/settings/events`, `/settings/testimonials`, `/settings/faq`, `/settings/media` — with inline CRUD forms
- [x] i18n messages for CMS + public page content (en.json + ar.json)
- **Verified**: All 66 routes build; public pages render dynamic DB content

### M3 — Core Business Logic (COMPLETED ✓)
- [x] Hybrid registration: new student form → create account; existing → login → enroll
- [x] Level progression engine: validate prerequisite certificate (6 checks via `/api/certificates/validate`)
- [x] ClassGroup CRUD + student enrollment with capacity check
- [x] Schedule management (weekly grid per group) via `/api/schedules`
- [x] Attendance tracking per session via `/api/attendance`
- [x] Exam + grade entry with teacher confirmation
- [x] Certificate issuance + validation API
- **Verified**: `validatePrerequisiteCert()` covers all 6 business rules

### M4 — Financial + Notifications + Audit (COMPLETED ✓)
- [x] Payment tracking (cash/transfer/receipt) + verification workflow
- [x] Notification broker: events → Notification table → in-app display
- [x] Audit logging: all state-changing actions captured
- [x] Audit log viewer (super_admin only) via `/api/audit`
- **Verified**: All audit trails recorded with user_id, action, table_affected

### M5 — Dashboards + Reports + Hardening (COMPLETED ✓)
- [x] Role-specific dashboard with stats (students, courses, teachers, revenue)
- [x] Dashboard API returning aggregated data
- [x] Courses, Students, Teachers list pages with responsive tables (overflow-x-auto, hidden columns on sm)
- [x] Responsive dashboard layout (sidebar hidden on mobile with hamburger menu)
- [x] ID card printing with QR (qrcode) + Barcode (react-barcode)
- [x] Input sanitization + error handling in all API routes
- [x] `npm run build` passes (zero errors, zero warnings)
- [ ] Rate limiting middleware — pending
- [ ] Full report export (PDF/Excel) — pending
- [ ] Unit tests — pending
- **Verified**: Build passes; seed data populates dashboard
