# Design System

# Concept

JobCal is a professional productivity tool for managing Japanese job applications.

Designed to help Japanese job seekers manage dozens of applications efficiently with a clean, information-first SaaS interface.

---

# Official Design Reference

All UI implementation must follow the design reference images located at:

docs/design-references/

These PNG files are the official visual specification for the project.

The current design reference contains:

- Authentication
- Main Pages
- AI Drawer
- Modals & Dialogs
- Landing Page
- Design System Components

Developers should always use these images as the primary UI reference.

Do not redesign screens unless explicitly requested.

---

# Design Philosophy

- Information First
- Productivity Over Decoration
- Clean & Minimal
- Fast Navigation
- Consistent Experience
- Desktop First

Rules

- Information has higher priority than decoration.
- Reduce unnecessary clicks.
- Reduce repetitive work.
- Make important information easy to find.
- Keep the UI visually consistent.
- Every screen should feel like a professional SaaS product.

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

- Heavy gradients
- Glassmorphism
- Large shadows
- Unnecessary animations

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
| In Progress | Primary |
| Offer | Offer |
| Joined | Joined |
| Rejected | Error |
| Withdrawn | Cancelled |

Status should always be represented using:

- Badge
- Text
- Color

---

# Typography

Fonts

- Inter
- Pretendard
- Noto Sans JP

Scale

Page Title — 28px

Section Title — 20px

Card Title — 16px

Body — 14px

Caption — 12px

Weights

- Regular
- Medium
- Semibold
- Bold

---

# Spacing

Use an 8px grid.

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

Prefer borders over shadows.

Default

1px solid Border Color

---

# Shadow

Only use shadows when necessary.

Allowed

- Modal
- Drawer
- Dropdown

Avoid

- Floating Cards
- Heavy shadows

---

# Icons

Lucide Icons

Preferred Sizes

16

18

20

24

Keep icon size consistent within the same component.

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

Overall Width

1440px

AI Assistant

Right Drawer

Closed by default

Opening the drawer should not permanently shrink the layout.

---

# Navigation

Sidebar contains only

- Home
- Companies
- Calendar
- Analytics
- Settings

Optional

- Tags
- Login Accounts

---

# Components

Core Components

- Button
- Card
- Badge
- Input
- Table
- Timeline
- Select
- Modal
- Drawer
- Dialog
- Tabs
- Dropdown
- Date Picker
- Empty State
- Skeleton

---

# Responsive

Desktop

Sidebar + Main Content

Tablet

Collapsed Sidebar

Mobile

Card Layout

Bottom Navigation

---

# Motion

Duration

150ms–200ms

Allowed

- Fade
- Slide
- Subtle Scale

Avoid

- Bounce
- Elastic
- Large Motion

---

# AI Assistant

Position

Right Drawer

Default

Closed

Current MVP

Only the UI is implemented.

No AI logic should be added until requested.

---

# Implementation Rules

- Always check the corresponding PNG in docs/design-references before implementing a screen.
- Match spacing, alignment, hierarchy, sizing, and visual structure as closely as practical.
- Do not redesign or reinterpret the UI without explicit instructions.
- Reuse existing components whenever possible.
- Existing functionality has higher priority than visual polish.
- Do not modify the Supabase schema unless requested.
- Implement one screen at a time.
- Run TypeScript, ESLint, and Build after each completed screen.

---

# Design Principles

1. Information over decoration.
2. Productivity over visual effects.
3. Consistency over creativity.
4. Simplicity improves usability.
5. Build reusable components.
6. Follow the official design reference.

---

# Localization

JobCal supports multiple languages.

Current UI reference images are primarily written in Japanese.

These images define the layout, spacing, hierarchy, and visual design only.

Do not treat the text inside the PNG files as fixed.

All user-facing text must be localizable.

The application should support:

- Japanese (ja)
- Korean (ko)

Future support:

- English (en)

Implementation Rules

- Never hardcode UI text.
- Use i18n translation keys.
- Preserve the layout shown in the design reference regardless of language.
- Components should expand naturally for longer translated text.


Localization Rules

- PNG text is for visual reference only.
- UI layout follows the PNG.
- Display language depends on the active locale.
- Do not implement Japanese-only components.