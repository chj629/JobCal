# 시스템 구조

## 전체 구조

```text
사용자 브라우저
  ↓
Next.js Frontend
  ↓
Express API
  ↓
Supabase PostgreSQL
  └─ Supabase Auth
```

배포 구조:

```text
Next.js → Vercel
Express → Render
Database/Auth → Supabase
```

## 기술별 역할

### Next.js
- 웹 화면
- 페이지 라우팅
- 사용자 입력
- 데이터 표시
- 반응형 UI
- API 통신

### Express
- 요청 처리
- 입력값 검증
- 권한 확인
- Supabase 데이터 접근
- 향후 OpenAI API 호출

### Supabase
- PostgreSQL 데이터베이스
- 회원가입과 로그인
- Row Level Security

### 모바일 확장

웹 MVP 이후 모바일 앱은 동일한 API와 데이터베이스를 사용합니다.

```text
React Native / Expo
  ↓
동일한 Express API
  ↓
동일한 Supabase Database
```
