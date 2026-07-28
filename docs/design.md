# Design System

# Concept

JobCal is a professional productivity tool for managing Japanese job applications.

일본 취업 준비생이 많은 기업을 빠르고 정확하게 관리할 수 있도록 설계된 생산성 중심 SaaS.

---

# Design Philosophy

- Information First
- Productivity Over Decoration
- Clean & Minimal
- Fast Navigation
- Consistent Experience
- Desktop First

원칙

- 정보 전달이 디자인보다 우선이다.
- 클릭 수를 최소화한다.
- 반복 작업을 줄인다.
- 필요한 정보를 빠르게 찾을 수 있어야 한다.
- 일관된 UI를 유지한다.
- 모든 화면은 실제 업무에 사용하는 SaaS처럼 설계한다.

---

# Visual Style

Inspired by

- Linear
- Notion
- Raycast
- Stripe Dashboard

Style

- Clean
- Minimal
- Modern
- Calm
- Professional

Avoid

- 과도한 Gradient
- Glassmorphism
- 큰 Shadow
- 불필요한 애니메이션

---

# Colors

| Role | Color |
|---|---|
| Primary | #2563EB |
| Background | #F8FAFC |
| Surface | #FFFFFF |
| Border | #E5E7EB |
| Text | #111827 |
| Secondary Text | #6B7280 |
| Success | #10B981 |
| Warning | #F59E0B |
| Error | #EF4444 |
| Offer | #2563EB |
| Joined | #8B5CF6 |
| Cancelled | #9CA3AF |

---

# Status Colors

| Status | Color |
|---|---|
| 진행 중 | Primary |
| 내정 | Offer |
| 입사 | Joined |
| 불합격 | Error |
| 지원 취소 | Cancelled |

Status는 항상

- Badge
- Text
- Color

를 함께 사용한다.

---

# Typography

Fonts

- Inter
- Pretendard
- Noto Sans JP

Font Scale

Page Title

28px

Section Title

20px

Card Title

16px

Body

14px

Caption

12px

Font Weight

Regular

Medium

Semibold

Bold

---

# Spacing

Use 8px Grid.

Available spacing

4

8

12

16

24

32

48

64

---

# Radius

10px

---

# Border

Border를 Shadow보다 우선한다.

Default

1px solid Border Color

---

# Shadow

Use only when necessary.

Allowed

- Modal
- Drawer
- Dropdown

Avoid

- Floating Cards
- Large Shadows

---

# Icons

Lucide Icons

Size

16

18

20

24

Use consistent icon size within the same component.

---

# Layout

Desktop First

Authenticated Layout

Sidebar

240px

Main Content

Fluid

Content Max Width

1200px

Overall Max Width

1440px

AI Assistant

Right Drawer

Closed by default

Must not permanently reduce content width.

---

# Navigation

Sidebar contains only

- Dashboard
- Companies
- Schedule
- Settings

No additional navigation unless required.

---

# Components

Core Components

- Card
- Button
- Badge
- Table
- Timeline
- Input
- Select
- Modal
- Drawer
- Dialog
- Tabs
- Dropdown
- Date Picker
- Tooltip
- Empty State
- Skeleton

---

# Buttons

Variants

- Primary
- Secondary
- Ghost
- Danger

Height

40px

Radius

10px

---

# Inputs

Height

40px

Radius

10px

Focus

Primary Color

---

# Tables

Desktop uses Table layout.

Table Rules

- Hover Row
- Clickable Company Name
- Badge for Status
- Compact spacing
- Horizontal scroll allowed on smaller screens

---

# Timeline

Timeline contains

- Step
- Status
- Schedule
- Result
- Memo

Current step must be visually emphasized.

---

# Responsive

Desktop

Sidebar + Table

Tablet

Collapsed Sidebar

Mobile

Card Layout

---

# Motion

Duration

150ms ~ 200ms

Rules

- Fade
- Slide
- Subtle Scale

Avoid

- Bounce
- Elastic
- Excessive motion

---

# Landing Page

Landing page should

- Clearly explain the service within 3 seconds.
- Show the real product UI.
- Contain a strong CTA.
- Focus on conversion rather than decoration.

---

# AI Assistant

Current Status

Planned Feature

UI

Right Drawer

Default

Closed

Current MVP

Do not implement AI functionality.

Only prepare reusable UI structure if needed.

---

# Implementation Rules

- Existing functionality has higher priority than visual fidelity.
- Do not change working business logic for UI purposes.
- Do not modify Supabase schema unless explicitly requested.
- Reuse existing components whenever possible.
- Avoid unnecessary abstractions.
- Build one screen at a time.
- Run TypeScript, ESLint, and Build after each screen.

---

# Design Principles

1. Information is more important than decoration.
2. Productivity is more important than visual effects.
3. Reduce repetitive work.
4. Every page should feel like a professional SaaS.
5. Consistency is more important than creativity.
6. Simple UI creates a better user experience.