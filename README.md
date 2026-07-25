# JobFlow

일본 취업을 준비하는 사용자를 위한 웹 기반 취업 활동 관리 서비스입니다.

지원 기업, 전형 단계, 일정, 결과 발표일, 마이페이지, 담당자 정보, 메모를 한곳에서 관리할 수 있습니다.

## 프로젝트 목표

일본 취업을 준비하는 학생들은 보통 30~100개 이상의 기업에 지원합니다. 기업마다 전형 방식과 일정이 다르기 때문에 Excel, Notion, 메모장만으로 관리하면 중요한 일정이 누락되거나 반복 입력이 늘어납니다.

JobFlow의 첫 번째 목표는 다음과 같습니다.

> Excel이나 Notion 대신 사용할 수 있는 쉽고 빠른 취업 활동 관리 웹 서비스

## 개발 방향

### Phase 1
웹 MVP를 먼저 개발합니다.

### Phase 2
AI 메일 분석, 자동 일정 생성, 알림 기능을 추가합니다.

### Phase 3
React Native와 Expo를 이용해 모바일 앱으로 확장합니다.

## 기술 스택

### Frontend
- React
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript

### Database & Authentication
- Supabase PostgreSQL
- Supabase Auth

### Hosting
- Vercel
- Render

### AI
- OpenAI API

## 프로젝트 구조

```text
jobflow/
├── CLAUDE.md
├── README.md
└── docs/
    ├── project.md
    ├── roadmap.md
    ├── architecture.md
    ├── database.md
    └── api.md
```

## 문서 안내

- `CLAUDE.md`: Claude Code 개발 규칙
- `docs/project.md`: 제품 기획과 디자인 시스템
- `docs/roadmap.md`: 개발 순서
- `docs/architecture.md`: 시스템 구조
- `docs/database.md`: 데이터베이스 설계
- `docs/api.md`: API 설계
