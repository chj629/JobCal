"use client";

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// 랜딩페이지 25~30차 이력(2026-08)은 이 파일의 git 미커밋 편집 이력에만 남아있다 —
// scene scale/stage width(70vw→92vw)/min-height(60vh→80vh) 확장 구조, hover tilt,
// scroll progress를 부모(LandingHero)가 계산해 prop으로 내려주는 구조(리스너 중복
// 방지)는 그 이후로 계속 유지되고 있다.
//
// 31차(2026-08). 방향을 다시 바꿨다.
// 1) 초기 화면: 30차까지 쓰던 EmailPasteForm 스타일 "메일 입력" 카드를 걷어내고,
//    Gmail 스타일 채용 메일 읽기 화면으로 되돌렸다 — 상단 inbox 툴바, sender
//    avatar(회사 이니셜 원), sender 이름/이메일/수신시각, 수신자 라인, 제목, 실제
//    채용 메일 본문(recipientLine~formatLine), 하단 답장/전체답장/전달 액션.
//    진짜 메일을 읽고 있다는 느낌이 목적이라 카드 하나만 중앙에 크게 보인다.
// 1-1) 32차(2026-08). 첫 화면만 더 "Gmail 데스크톱"처럼 보이도록 상단 검색바 +
//    왼쪽 아이콘 사이드바(편지쓰기 원형 버튼 + 받은편지함/보낸편지함/임시보관함
//    아이콘)를 추가했다. 텍스트 라벨 없는 아이콘 전용 구성이라 새 i18n 키가
//    필요 없다(검색창은 문구 없는 장식용 pill). 스크롤을 시작한 이후의 카드 전환은
//    건드리지 말라는 요청이 있어서, 이 둘은 restChromeT(=1-mailResizeT, 카드가
//    아직 안 줄어든 정도)에 따라 폭/높이와 opacity가 함께 0으로 줄면서 사라지고,
//    스크롤이 MAIL_RESIZE_IN 끝(0.45)에 닿으면 완전히 사라져 이전 턴에 이미
//    검증된 portrait "메일 입력" 카드 모습(sidebar/검색바 없음)으로 정확히
//    복귀한다 — 즉 스크롤 이후 상태는 픽셀 단위로 이전과 동일하다. 두 요소 모두
//    폭/높이를 애니메이션하는 바깥 래퍼엔 padding을 주지 않고 안쪽 자식에만
//    padding을 줬다 — border-box 요소는 padding이 있으면 width/height를 0으로
//    줄여도 padding만큼 남는 문제(AI 카드에서 이미 겪음)가 있어서, 그 padding을
//    사라지는 바깥 래퍼가 아니라 사라지지 않는(안쪽) 요소로 옮겨 회피했다.
//    받은편지함 툴바/메일 본문/하단 답장 액션 등 기존 콘텐츠는 전혀 바꾸지 않았다.
// 2) 스크롤 후 카드 모양: 지금까지는 이 카드를 transform: scale()로 축소했는데,
//    scale은 폭과 높이를 같은 비율로 줄여서 세로가 긴 portrait 카드를 만들 수
//    없고 글자도 함께 작아진다. 그래서 scale 대신 실제 width(%)/height(vh)를
//    progress에 따라 보간하는 방식으로 바꿨다 — 폭만 48%→21%로 좁아지고 높이는
//    60vh로 고정(55~65vh 스펙 안), 폰트 크기는 스케일되지 않으므로 이전보다
//    훨씬 크게 읽힌다. 두 카드(메일 입력이 된 Gmail 카드 + AI 분석 카드)는 이제
//    개별 translateX 계산 대신 하나의 flex row(w-full, justify-center, gap)
//    안에 나란히 놓인다 — row 자체가 항상 stage 폭 기준으로 가운데 정렬되므로,
//    AI 카드가 width:0→21%로 자라나면(=fade-in과 함께) row 전체가 재중앙되면서
//    메일 카드가 자연스럽게 왼쪽으로 밀리는 효과가 생긴다(전 턴까지 쓰던 명시적
//    translateX(-26%) 계산을 대체). 카드 폭을 21%로 잡은 이유: 4장(메일 입력→
//    AI 분석→정보 추출→등록 완료)이 나중에 들어와도 4×21%+3×gap이 stage 폭
//    안에 들어오도록 미리 여유를 남겨두기 위해서다. 이번 턴에는 메일 입력(Gmail
//    카드)과 AI 분석 카드 두 개만 만들었고, 정보 추출/등록 완료 카드는 아직
//    추가하지 않았다. Hero copy fade, 배경 gradient, scene scale/stage width/
//    min-height 확장 구조, Moment 1 이하는 전혀 손대지 않았다.
// 33차(2026-08). 세 번째 카드 "정보 추출" 추가. 새 디자인을 만들지 않고 실제
// components/companies/CompanyMatchPicker.tsx(AI Drawer 2단계, "企業を確認")의
// label+연한 배경 필드 스타일을 그대로 재사용했다 — rounded-stitch-2xl bg-stitch-bg
// p-6 박스 안에 작은 라벨(text-[12px] text-secondary) + 큰 값(text-[20px]
// font-[500] text-stitch-ink), 기업명/전형/일시 세 개를 세로로 쌓았다. 라벨은
// landing.hero.demo.fieldCompany/fieldStep/fieldDateTime(이미 있던 미사용 키,
// "기업명"/"전형"/"일시"), 값은 landing.scene.company/step/dateTime(이미 다른
// 곳에서 쓰는 실제 값 "샘플 주식회사"/"1차 면접"/"2026년 8월 20일 14:00")을
// 그대로 재사용해 새 문구를 만들지 않았다. 카드 틀 자체(폭 0→21%, 높이 60vh
// 고정, opacity, "JobCal AI" 헤더)는 AI 분석 카드와 완전히 같은 패턴이다 —
// EXTRACT_IN을 AI_ANALYZING_IN 이후 구간으로 잡아 카드 2가 자리 잡은 뒤에
// 오른쪽에서 폭이 자라나며 fade-in하고(=flex row 재중앙이 "작은 translate"
// 효과를 만든다), 텍스트도 AI 카드와 동일하게 EXTRACT_CONTENT_IN으로 늦춰
// 좁을 때 한글/일본어가 글자 단위로 세로 줄바꿈되는 문제를 피했다. progress=0일
// 때는 마운트하지 않아(extractCardT>0 가드) padding으로 인한 유령 박스가 flex
// 중앙 정렬을 틀어뜨리지 않게 했다 — 전부 AI 카드에서 이미 쓰던 패턴 그대로다.
// 카드 1(Gmail 초기 화면)·카드 2 디자인, gradient, Hero fade, scene 크기는
// 전혀 손대지 않았다. 등록 완료(4번째) 카드는 아직 만들지 않았다.
// 34차(2026-08). 카드 2(AI 분석)·카드 3(정보 추출) 내부를 실제
// components/ai/AiMailDrawer.tsx + EmailPasteForm.tsx + EmailAnalysisReview.tsx
// 구조에 맞춰 다시 만들었다(새 랜딩 전용 디자인을 만들지 않고 실제 화면을 그대로
// 축약). 구체적으로 실제 컴포넌트에서 그대로 가져온 것:
// - JobCal AI 헤더: AiMailDrawer의 Drawer title 그대로 — sparkle 아이콘만
//   text-primary-navy, "JobCal AI" 텍스트 자체는 text-stitch-ink(이전엔 전체가
//   네이비였는데 실제는 아이콘만 네이비).
// - 상단 step indicator: AiMailDrawer의 숫자 원 + 얇은 연결선 스타일을 그대로
//   재현(활성 아닌 원은 border+bg-stitch-bg+text-secondary, 활성 원만
//   bg-primary-navy+text-white, 라벨은 활성 단계에서만 표시). 다만 실제 앱의
//   STEPS(메일 입력/기업 확인/내용 확인, 3개)는 이 랜딩의 4단계 내러티브(메일
//   입력→AI 분석→정보 추출→등록 완료)와 1:1로 대응하지 않아(AI 분석은 실제
//   앱에서는 별도 스텝이 아니라 1단계 안의 로딩 상태), 이전 턴에 이미 만들어
//   두고 안 쓰고 있던 landing.hero.demo.stepMail/stepAnalyze/stepExtract/
//   stepComplete 키로 이 랜딩 전용 4단계를 표시한다 — 스타일은 실제 그대로,
//   라벨 집합만 이 데모의 내러티브에 맞췄다.
// - 카드 2 본문: EmailPasteForm의 loading 상태 그대로(h-16 원형 스피너,
//   title text-[16px]/desc text-[13px]/estimate text-[12px] — 이전엔 각각
//   20/15/13px로 임의로 키워뒀던 것을 실제 크기로 되돌렸다).
// - 카드 3 본문: EmailAnalysisReview의 "내용 확인" 화면 그대로 — 제목
//   text-[24px] font-[500] tracking-tight + mb-8, 안내 배너(rounded-stitch-2xl
//   bg-stitch-bg px-6 py-3 + info 아이콘 + aiEmail.review.newCompanyBanner
//   "새 기업으로 등록합니다."), 그 아래 Field(label: px-2 text-[12px]
//   font-[500] text-stitch-ink, 값: rounded-full border bg-white 필드 모양,
//   fieldInputClass와 동일)를 기업명/전형/일시 세 번 반복. 전 턴엔 이 필드를
//   CompanyMatchPicker(2단계, "기업 확인")의 연한 배경 표시 박스로 만들었는데,
//   "정보 추출"이라는 이름과 내용상 더 가까운 실제 화면은 review(3단계)라
//   그쪽 필드 스타일로 바꿨다.
// 카드 자체의 폭(0→21%)/높이(60vh 고정)/위치(flex row)/opacity·텍스트 지연
// 애니메이션 구조, 카드 1(Gmail 초기 화면), gradient, Hero fade, scene 크기는
// 전혀 손대지 않았다 — 이번엔 카드 2·3 "내부" 마크업만 다시 만들었다.
// 35차(2026-08). 34차에서 실제 Drawer 스타일은 가져왔지만 내용이 카드 상단에
// 몰려 있고 카드 높이(60vh, 700px대) 대비 밀도가 실제 Drawer보다 훨씬 낮았다.
// 카드 2: header/step indicator 아래를 flex-1로 두고, 그 안에서 다시 spinner
// 블록만 flex-1 justify-center로 감싸 남은 공간의 "중간"에 오게 하고, 그
// 아래(카드 "하단")에 EmailPasteForm의 "AI가 추출할 정보" 안내 박스(제거했던
// EXTRACT_FIELD_KEYS 7개 pill, 실제 그 화면 그대로)를 이어붙였다 — 로딩 중에도
// "무엇을 뽑아내고 있는지" 보여줘서 진행감을 준다. header(위)→spinner+상태
// 문구(중간)→추출 항목 안내(아래)로 자연스럽게 분포된다.
// 카드 3: 제목 아래를 flex-1 flex-col justify-between으로 감싸 안내 배너 +
// 필드 3개(기업명/전형/일시)를 카드 높이 전체에 고르게 펼쳤다(위=배너, 중간~
// 아래=필드들). 필드 자체도 실제 입력 크기(px-4 py-2.5 text-[14px])보다
// 키웠다(px-5 py-4 text-[17px]) — 카드가 실제 Drawer보다 훨씬 넓고 여유로운
// portrait 카드라 필드도 그에 맞게 커야 "여백만 큰 화면"처럼 안 보인다.
// 카드 폭/높이/위치/스크롤 트리거 타이밍, header/step indicator 자체, 카드
// 1(Gmail), gradient, Hero fade, scene 크기는 전혀 손대지 않았다.
// 36차(2026-08). 카드 1을 잘못 이해하고 있었다 — 초기 화면은 Gmail 그대로가
// 맞지만, 스크롤 후 4-card workflow의 첫 번째 카드는 Gmail이 아니라 실제
// EmailPasteForm(AI Drawer 1단계 "메일 입력")이어야 한다. 그래서 카드 1의
// "본문"(검색바 아래, sidebar+메일 읽기 영역이 있던 자리)을 relative 컨테이너로
// 바꾸고, 그 안에 두 레이어를 절대 위치로 겹쳐 크로스페이드시켰다: (1) 기존
// Gmail 레이어(사이드바+받은편지함 툴바+본문+답장 액션, 전혀 안 바꿈, opacity만
// restChromeT), (2) 새 Drawer 레이어(JobCal AI 헤더 + step indicator(0번째
// "메일 입력" 활성) + EmailPasteForm의 제목/"AI가 추출할 정보" 안내 박스/
// "메일 본문 붙여넣기" 라벨 + 이미 메일이 붙여넣어진 textarea 모양 박스, opacity는
// mailResizeT). 두 레이어가 정확히 반대로 움직이는 같은 변수(restChromeT=
// 1-mailResizeT)를 쓰므로 자연스럽게 크로스페이드된다. Drawer 레이어 텍스트는
// 이미 Gmail 카드에서 쓰던 mailSubject/recipientLine~formatLine을 그대로
// 재사용했고("메일 본문이 이미 붙여넣어진 상태"), 안내 박스도 카드 2에서 쓰던
// EXTRACT_FIELD_KEYS를 그대로 재사용해 새 문구를 만들지 않았다. 상단 검색바는
// 그대로 두었다 — restChromeT로 이미 사라지고, 그 자리에 Drawer 레이어 자체의
// JobCal AI 헤더가 body 영역 상단에 나타나 자연스럽게 이어진다. 카드 2·3,
// gradient, 카드 크기(폭 0→21%, 높이 60vh)/flex row/스크롤 트리거 구간은 전혀
// 손대지 않았고, 4번째 카드도 아직 만들지 않았다.
// 37차(2026-08). 네 번째 카드 "등록 완료" 추가 — 실제 AiMailDrawer의 success
// 화면(flow.step==="complete") 그대로: h-20 w-20 rounded-full bg-success/10
// 원 안에 check_circle(size 40, filled, text-success), 그 아래 제목. 실제
// aiEmail.complete.title("등록이 완료되었습니다")은 일반적인 문구라 회사명 하나만
// 보여주는 화면에 맞고, 이 데모는 회사명/전형/일시 세 가지를 다 보여줘야 해서
// 정확히 그 목적으로 이미 준비돼 있던 landing.hero.demo.complete("JobCal에
// 등록 완료"/"JobCalに登録完了")를 대신 썼다 — 나머지(체크 아이콘 스타일,
// 중앙 정렬 레이아웃)는 실제 그대로. 회사명은 실제처럼 text-[16px]
// text-secondary로, 그 아래 전형/일시는 같은 스타일로 한 줄씩 추가했다(실제
// complete 화면엔 없지만 이 카드가 보여줘야 할 정보라 자연스럽게 이어붙임).
// 실제 complete 화면은 step indicator를 아예 숨기지만(STEPS에 없는 별도 화면),
// 이 데모는 4단계 내러티브를 끝까지 보여줘야 하므로 요청대로 4번째를 활성으로
// 표시했다 — 스타일은 카드 1~3과 동일한 renderStepIndicator 재사용. 카드
// 크기(폭 0→21%, 높이 60vh 고정)/기존 카드들과 같은 패턴: FOURTH_IN을
// EXTRACT_IN 끝(0.85) 근처에서 시작해 폭 0→21%로 자라나며 fade-in(오른쪽 등장
// 효과), progress=0일 때 마운트 안 함(유령 박스 방지), 텍스트는
// FOURTH_CONTENT_IN으로 살짝 늦춰 좁을 때 줄바꿈 문제 방지 — 전부 카드 2·3에서
// 이미 쓰던 패턴 그대로 재사용했다. 카드 1~3 내부 디자인, gradient, Hero fade,
// scene 크기, 기존 스크롤 타이밍은 전혀 손대지 않았다.
// 38차(2026-08). 카드 3(정보 추출)에 담당자/형식/메모 3개를 추가했다 — 기업명/
// 전형 단계/일시 3개만으로는 AI가 그것만 추출하는 것처럼 보인다는 피드백.
// 라벨은 전부 실제 앱에 이미 있는 값 그대로 재사용했다: 담당자·형식·메모는
// EmailPasteForm의 "AI가 추출할 정보" 안내 박스와 EmailAnalysisReview가 이미
// 쓰는 aiEmail.paste.extractFields.contact / aiEmail.review.formatLabel /
// aiEmail.review.memoLabel. 전형 라벨도 "전형"(landing.hero.demo.fieldStep,
// 이제 미사용)에서 실제 추출 필드명인 aiEmail.paste.extractFields.step("전형
// 단계")으로 바꿨다 — 사용자가 예시로 든 표현과 정확히 일치. 값 쪽은 정확히
// 일치하는 기존 문구가 없어 messages/ko.json·ja.json의 landing.hero.demo에
// 2개만 새로 추가했다: contactName("채용 담당자"/"採用担当者", 메일 본문의
// "{company} 채용 담당자입니다" 문장에서 이미 쓰는 역할과 같은 의미),
// memoNote("1차 면접 일정 안내"/"一次面接の日程案内", 메일 제목과 같은 맥락).
// 형식 값은 새로 안 만들고 실제 aiEmail.review.formatOptions.online("온라인")을
// 그대로 재사용했다. 레이아웃: 기업명/전형 단계/일시는 그대로 두고(px-5 py-4
// text-[17px]), 담당자/형식/메모 3개는 실제 EmailAnalysisReview의 기본 입력
// 크기(px-4 py-2.5 text-[14px], 라벨 text-[12px])로 더 작게 만들어 하나의
// space-y-2 묶음(gap-1씩 촘촘히)으로 감쌌다. 이 묶음도 배너/기업명/전형 단계/
// 일시와 함께 같은 flex-1 justify-between의 다섯 번째 항목이라, 카드 높이
// 전체에 걸쳐 자연스럽게 분포되면서도 보조 필드들끼리는 서로 붙어 있어
// "주요 3개는 크게 위~중간에, 보조 3개는 작게 아래쪽에 압축" 위계가 보인다.
// 스크롤 없이 카드 안에 다 들어가는지 실측으로 확인했다. 카드 1·2·4, 카드
// 크기/4-card flex 구조/스크롤 애니메이션은 전혀 손대지 않았다.
// 39차(2026-08). 카드 1(메일)과 카드 3(추출 결과)을 서로 내용이 맞물리게
// 다시 만들었다 — [실제 면접 안내 메일] → [AI 분석] → [구조화된 정보 + 요약]
// 연결이 보이도록. 회사명을 "샘플 주식회사"에서 "주식회사 JobCal"/"株式会社
// JobCal"로 바꿨는데, landing.scene.company(=company 변수)는 카드 4가 그대로
// 쓰고 있고 이번엔 카드 4를 건드리지 말라는 요청이 있어 손대지 않았다 — 대신
// 새 landing.hero.demo.companyName을 추가해 카드 1·3만 이걸 쓰게 했다(카드
// 1의 아바타 이니셜/발신자 이름, 카드 3의 기업명 필드). 그 결과 이번 턴 이후
// 카드 3(주식회사 JobCal)과 카드 4(샘플 주식회사)의 회사명이 서로 다르다 —
// 의도적으로 범위를 카드 1↔3 일치로만 좁힌 결과이며, 카드 4까지 맞추려면
// 별도 턴이 필요하다. 메일 본문은 "인사→면접 안내→상세 정보→준비/주의사항→
// 마무리" 순서로 4줄을 추가했다(meetUrlLine/prepLine/deadlineLine/
// closingLine, Google Meet URL 안내 시점 · 이력서 준비물 · 8/18 일정변경
// 마감 · 마무리 인사) — 카드 1의 Gmail 레이어와 Drawer 레이어(textarea 미리
// 보기) 양쪽에 정확히 같은 줄들을 추가해 "Drawer textarea에도 동일한 메일
// 내용이 보여야 한다"는 요청을 만족시켰다. 카드 3은 담당자/형식 필드를
// 완전히 제거하고(관련 fieldContactLabel/contactName/fieldFormatLabel/
// formatOnline 변수와 지난 턴에 추가했던 contactName i18n 키도 함께 정리),
// 남은 기업명/전형 단계/일시 3개는 세로 padding을 줄여(py-4→py-3, 17px→
// 16px) 더 compact하게 만들었다. 대신 메모(fieldMemoLabel)는 다른 필드처럼
// rounded-full pill이 아니라 카드 1의 메일 미리보기 박스와 같은
// rounded-stitch-2xl 멀티라인 박스로 바꾸고 flex-1을 줘서 카드의 남은 세로
// 공간을 전부 차지하게 했다 — "확실히 큰 영역"이라는 요청. 메모 내용
// (landing.hero.demo.memoNote 값 교체)은 메일에서 필드로 분리되지 않은
// 정보(형식+Meet URL 시점+준비물+마감일)를 AI가 요약한 것처럼 채워, 카드
// 1의 메일과 카드 3의 요약이 실제로 서로 대응하게 했다. overflow-hidden으로
// 카드 안 스크롤 없이 다 보이는지 확인했다. 카드 2·4 코드, 카드 크기(폭
// 0→21%, 높이 60vh)/4-card flex 구조/스크롤 타이밍, gradient, Hero fade,
// scene 크기, 카드 1·3의 기존 디자인 언어(헤더/step indicator/필드 스타일)는
// 전혀 손대지 않았다.
// 40차(2026-08). 카드 1·3·4의 콘텐츠 밀도만 조정(카드 2는 이번엔 제외).
// 카드 1: 메일 본문 내용은 그대로 두고 가독성만 높였다 — 바깥 space-y-3→
// space-y-4로 줄 간격을 늘리고, Google Meet URL 안내·이력서 준비·8/18 회신
// 마감 3줄을 안쪽 space-y-1(Drawer 레이어 textarea 미리보기)/space-y-1.5
// (Gmail 레이어)로 서로 묶어 하나의 문단처럼 구분되어 읽히게 했다(Drawer
// 레이어는 이전엔 줄 간격이 아예 없었는데 이번에 space-y-2를 새로 줬다).
// 수신자 이름도 실제 사람 이름처럼 보일 수 있는 "최호준"/"チェホジュン"을
// 걷어내고 일본 채용 메일에서 흔히 쓰는 가상 이름 "야마다 타로"/"山田太郎"로
// 바꿨다(landing.hero.demo.recipientLine 값 교체, Gmail·Drawer 레이어 둘 다
// 같은 값을 참조하므로 자동으로 양쪽 다 바뀐다). 카드 3: 기업명/전형 단계/
// 일시 필드를 한 번 더 얇게(py-3→py-2.5, 라벨-값 간격 space-y-1.5→space-y-1)
// 줄이고, 그만큼 줄어든 공간이 flex-1인 메모 영역으로 그대로 흡수돼 메모가
// 커지게 했다(실측으로 약 10~15% 증가 확인, 아래 참고) — 메모 내용 자체는
// 안 건드렸다. 카드 4: "카드 1·3과 통일해달라"는 요청에 따라 회사명 표시를
// company(옛 landing.scene.company, "샘플 주식회사")에서 companyName(landing.
// hero.demo.companyName, "주식회사 JobCal")으로 바꿨다 — 그 결과 이제 이
// 파일에서 company 변수를 아무도 안 써서 선언 자체를 지웠다(landing.scene.
// company 키 값은 LandingProductStory.tsx가 여전히 써서 그대로 뒀다). 전형/
// 일시는 원래부터 카드 1~4가 모두 같은 공유 변수(step/dateTime)를 썼으므로
// 손댈 게 없었다. 카드 width/height, 4-card flex 구조, gradient, Hero fade,
// scroll timing/animation, 카드 2는 전혀 손대지 않았다.
// 41차(2026-08). 4-card 구조/레이아웃/스크롤/gradient/카드 크기를 확정하고
// 마지막 visual polish만 했다 — 4장을 나란히 봤을 때 시각적 무게가 비슷하게
// 느껴지도록.
// 카드 1(Drawer 레이어, "메일 입력" 상태) 작업 중 실제로는 39차부터 있던
// 버그를 발견했다 — 메일 미리보기 textarea 박스(flex-1)가 "공간을 너무 많이
// 차지"하는 것처럼 보였는데, 실측(scrollHeight vs clientHeight)해 보니
// 오히려 반대로 박스가 내용보다 작아서 마지막 몇 줄(회신 마감 안내, 마무리
// 인사)이 overflow-hidden에 조용히 잘려 안 보이고 있었다(스크롤바가 없어서
// 화면만 봐서는 알 수 없었다). 그래서 박스를 단순히 더 줄이면 잘림이 더
// 심해지므로, 먼저 안 잘리게 고친 다음에 "약간 줄이고 균형 조정"을 적용했다:
// 박스 자체는 padding/폰트/줄간격을 압축(p-6→p-4, text-[14px]→text-[13px],
// leading-[1.7]→leading-[1.5], space-y-2→space-y-1)하고, 그 위 제목/안내
// 박스의 margin·padding도 줄여(mb-8→mb-5, 안내 박스 p-6→p-5) 박스에 남는
// flex-1 공간을 조금 넉넉하게 만들었다 — 그 결과 12줄 전체가 다시 다 보이면서
// (실측 scrollHeight===clientHeight 확인) 박스의 실제 렌더링 높이도 이전보다
// 작아져 "너무 많은 공간을 차지"하던 느낌은 줄었다. Gmail 레이어(첫 화면)는
// textarea가 아니라서 손대지 않았다. 카드 2: 중앙 분석 상태 블록과 하단
// "AI가 추출할 정보" 안내 박스 사이 gap을 gap-6→gap-3로 줄여 두 블록이 하나의
// 분석 화면처럼 더 붙어 보이게 했다. 카드 3은 요청대로 그대로 뒀다. 카드 4:
// success 아이콘 원(h-20 w-20→h-24 w-24, +20%)과 안의 check_circle(size
// 40→48, +20%), 제목(text-[28px]→text-[33px], +18%), 회사명/전형/일시
// 텍스트(text-[16px]→text-[19px], +19%)를 전부 15~20% 범위 안에서 키웠다 —
// 카드 4가 다른 세 카드보다 훨씬 비어 보이던 것을 완화한다. 4-card flex
// 구조, 카드 width/height(폭 0→21%, 높이 60vh), 스크롤 트리거 구간, gradient,
// Hero fade, scene 크기, 새 구조/UI는 전혀 추가하지 않았다.
// 42차(2026-08). 사용자가 참고 이미지(연결된 workflow 느낌의 4-card 레이아웃)를
// 주고, "카드가 각각 fade-in되는 게 아니라 하나의 AI processing line이 다음
// 단계로 이동하며 결과가 만들어지는 느낌"을 요청했다. 이미지의 카드 회전/3D
// perspective/과한 glow/이미지 속 UI·콘텐츠는 명시적으로 참고하지 말라고 해서
// 가져오지 않았고, "공간감/흐름/카드 사이를 지나가는 line/node를 따라가는
// 진행"만 반영했다. 구체적으로:
// - Workflow line: 카드 4개 중심을 잇는 얇은 SVG path를 카드 뒤(z-0, 카드는
//   z-10)에 깔았다. 각 카드 중심의 X% 좌표는 DOM 측정(ref+
//   getBoundingClientRect) 없이 카드 폭을 정하는 것과 같은 flex-center 수식을
//   그대로 재사용해 계산한다(gap은 고정 px라 완벽히 정확하진 않지만 장식용
//   이라 근사치로 충분 — 요청도 "완전히 직선보다 부드러운 curve"를 허용).
//   각 구간은 두 점의 중간 X를 좌우 제어점으로 쓰는 표준적인 3차 베지어
//   S자 곡선으로 연결했다. 색은 navy(#1e3a8a)→lighter blue(#8b9fe0)
//   linearGradient에 stroke-opacity 0.5로 절제했다(neon 없음).
// - Scroll interaction: <path>에 pathLength=1000을 줘서 실제 기하학적 길이와
//   무관하게 stroke-dasharray/dashoffset을 progress(0~1, 4카드 전체 시퀀스와
//   정확히 같은 범위)로 직접 제어 — 스크롤에 맞춰 선이 "그려지는" 것처럼
//   보이고, 카드 4가 다 나타나는 시점(progress=1)에 선도 다 그려진다. 각
//   node(작은 원)의 opacity도 그 카드 자신의 opacity 변수(mailResizeT/
//   aiCardOpacity/extractCardOpacity/fourthCardOpacity)에 그대로 묶어서
//   "카드가 나타나는 순간 그 지점의 line/node도 함께 채워진다"는 느낌을
//   맞췄다. 마지막 node만 success 색(#047857, 카드 4의 체크 아이콘과 동일
//   색상 재사용)으로 바꾸고 그 뒤에 아주 옅은(opacity 최대 0.12) 후광 원을
//   하나 더 깔아 "아주 약한 success emphasis"를 표현했다.
// - Stage labels: 각 카드 위에 "01/02/03/04" + 작은 텍스트 라벨을 추가했다.
//   라벨 텍스트는 새로 만들지 않고 이미 있던 DEMO_STEP_LABEL_KEYS(메일 입력/
//   AI 분석/정보 추출/등록 완료, 실제 앱 step indicator에도 쓰는 값)를
//   그대로 재사용했다. 카드 내부에 이미 실제 AI Drawer의 번호 원 step
//   indicator가 있어서, 외부 라벨은 text-[10px]로 아주 작고 절제되게 뒀다
//   (요청한 "editorial label"). 카드 1의 라벨은 mailResizeT에 묶어 Gmail
//   rest 상태에선 안 보이고(아직 AI 처리가 시작 안 됐으므로), 스크롤이
//   시작돼 내부 Drawer chrome이 나타나는 시점과 함께 페이드인된다 — 카드
//   내부 step indicator와 동일한 타이밍 논리.
// - 카드 위치: 각 카드는 회전/perspective 전혀 없이 항상 정면이고, Y만 아주
//   미세하게(CARD_Y_OFFSET, 최대 5px) 달라서 딱딱한 일렬처럼 안 보이게 했다.
// 구현 방법: 각 카드를 [작은 라벨 줄 + 기존 카드] 세로 스택으로 감싸는 새
// wrapper div를 추가했다 — width/opacity/shrink-0/transition을 카드 자체가
// 아니라 이 wrapper로 옮기고, 안쪽 카드 div는 height만 유지한 채 폭은
// w-full로 바꿨다(wrapper가 %로 이미 올바른 폭을 가지므로). 이 재배선
// 외에는 각 카드 내부의 헤더/step indicator/본문 마크업과 문구를 단 한 줄도
// 바꾸지 않았다 — "4-card 내부 디자인 및 콘텐츠는 변경하지 마세요"라는
// 요청 그대로다. 카드 크기(폭 0→21%, 높이 60vh)/portrait 비율, 4-card
// flex 구조(justify-center 재중앙 로직), 기존 스크롤 타이밍
// (MAIL_RESIZE_IN/AI_ANALYZING_IN/EXTRACT_IN/FOURTH_IN 전부), gradient,
// Hero copy fade, scene expansion은 전혀 손대지 않았다.
// 43차(2026-08). 같은 레퍼런스 이미지를 다시 주고 이번엔 "재해석하지 말고
// 레이아웃/연출을 최대한 그대로" 따르라는 요청. 42차 대비 달라진 부분만:
// - 카드 내부 step indicator 완전 제거: renderStepIndicator 함수와 그 4개
//   호출부(카드 1~4 Drawer 헤더 아래)를 전부 삭제했다 — "카드 상단에 일자로
//   놓인 progress bar 형태는 제거"라는 명시적 요청. 카드 내부의 다른 부분
//   (헤더/본문/필드/문구)은 전혀 안 건드렸다.
// - 외부 stage label 강화: 42차의 text-[10px] 작은 인라인 라벨을 걷어내고
//   renderStageLabel(index, opacity) 함수로 교체 — h-9 원(볼드 네이비 숫자) +
//   text-[14px] 볼드 단계명, 레퍼런스의 "숫자 원 + 굵은 단계명" 비중에 맞춘
//   크기다. 내부 step indicator가 없어졌으니 이제 이 라벨이 유일한 단계
//   표시라 42차보다 존재감을 키웠다.
// - Y stagger 확대: CARD_Y_OFFSET을 42차의 미세한 교대 패턴([0,4,-3,5])에서
//   레퍼런스처럼 오른쪽으로 갈수록 점점 내려가는 계단식([0,12,20,26])으로
//   바꿨다 — "위아래로 리듬감 있게 배치"/"floating/staggered 공간감" 요청.
//   회전/perspective는 여전히 없다(카드는 항상 정면).
// - Workflow line/노드 확장: 라벨이 커지고 stagger도 커진 만큼 SVG 높이를
//   40px→64px(WORKFLOW_SVG_HEIGHT)로 늘리고, 기준 Y(WORKFLOW_LINE_BASE_Y)를
//   라벨 원의 세로 중심(18px)에 맞춰 라인이 항상 숫자 원을 관통하게 했다.
//   레퍼런스가 요청한 "line 중간중간의 node"를 추가하기 위해, 각 구간
//   S자 곡선의 t=0.5 지점이 정확히 두 끝점의 기하 중점과 같다는 걸(3차
//   베지어 공식으로 검증) 이용해 별도 곡선 샘플링 없이 중점 좌표만으로
//   작은 원(midPoints)을 구간마다 하나씩 추가했다 — opacity는 그 구간의
//   "다음" 카드 opacity에 묶어 기존 "카드가 나타나면 그 지점 line도 채워진다"
//   패턴과 일치시켰다. 라인 자체도 strokeWidth 1.5→2, opacity 0.5→0.55로
//   아주 살짝만 키워 존재감을 더했다(요청에 없는 강한 neon/glow는 여전히
//   추가하지 않았다).
// 카드 내부 실제 콘텐츠(문구/값), 카드 크기(폭 0→21%, 높이 60vh)/portrait
// 비율, 4-card flex 구조, 기존 스크롤 타이밍, gradient, Hero copy fade,
// scene expansion은 이번에도 전혀 손대지 않았다.
// 44차(2026-08). 43차 결과가 여전히 "카드 4개 + 카드 상단에 고정된 얇은
// timeline"으로 보인다는 피드백 — line이 라벨 높이의 얇은 띠에 갇혀 있어
// 레퍼런스처럼 화면 세로 공간을 실제로 쓰지 못했다. 구조를 다시 짰다:
// - line이 더 이상 라벨 원을 지나가지 않는다. 각 카드의 "진입 node"를
//   라벨 zone 바로 아래(=카드 상단 모서리 옆, LABEL_ZONE_HEIGHT)로 옮기고,
//   라벨은 그 지점 바로 위에 놓인 캡션처럼 배치했다 — "node와 stage label도
//   line 주변에 배치"라는 요청대로, line이 라벨을 관통하는 대신 라벨이
//   line의 진입점 옆에 붙는다.
// - 카드 사이 각 gap마다 line이 "카드 node → gap 한가운데의 깊은 지점
//   (WORKFLOW_DIP_DEPTH) → 다음 카드 node" 순서로 절반씩 두 개의 S자
//   곡선을 그리며 실제로 밑으로 처졌다가 다시 올라온다 — dip 깊이를 카드
//   높이(55~65vh, 세로로 긴 portrait 카드) 대비 충분히 크게 잡아서
//   "카드 상단에 고정" 대신 카드 사이 빈 공간을 대각선/곡선으로 실제
//   가로지르는 것처럼 보이게 했다. 레퍼런스처럼 앞의 두 dip(230/260px)은
//   완만하고 마지막 dip(430px, 카드3→4)만 훨씬 깊게 비대칭으로 처지게
//   했다. line이 쓰는 세로 공간이 커진 만큼 SVG 자체 높이도 그에 맞춰
//   다시 계산한다(WORKFLOW_SVG_HEIGHT = 라벨 zone + 최대 카드 오프셋 +
//   최대 dip 깊이 + 여유분).
// - 카드 Y 위치 차이("계단")를 43차의 [0,12,20,26]에서 레퍼런스를 실측한
//   값([0,48,81,106], 카드 1~4 상단 델타 +48/+33/+25)으로 훨씬 크게
//   키웠다 — "카드 Y 위치 차이를 지금보다 더 분명하게" 요청대로다. 카드
//   자체는 여전히 회전·perspective 없이 항상 정면이다.
// - gap 중점(dip point)의 node는 이제 카드 뒤에 숨지 않고 빈 공간 안에
//   그대로 드러나므로, 레퍼런스처럼 또렷하게 보이도록 반지름/opacity를
//   43차보다 키웠다(r 3→5, opacity 0.7→0.85배).
// line/node/label 배치 방식만 다시 짰을 뿐, 카드 내부 실제 콘텐츠, 카드
// 폭(0→21%)/높이(60vh 고정)/portrait 비율, 4-card flex 구조(justify-center
// 재중앙 로직), 기존 스크롤 타이밍, gradient, Hero copy fade, scene
// expansion은 전혀 손대지 않았다.
// 45차(2026-08). 44차도 여전히 "카드 4개를 일렬로 놓고 뒤에 선을 추가한
// 구조"로 보인다는 피드백 — 이번엔 기존 결과를 보정하지 말고 레퍼런스의
// workflow section 레이아웃(카드 배치·크기 관계·Y 위치·line 경로·node
// 위치·전체 공간감)을 그대로 재현하라는 요청이라, flex row 구조 자체를
// 버리고 다시 짰다.
// - 카드 배치 구조 전환: 4개 카드 wrapper를 flex row의 shrink-0 아이템(폭은
//   %, Y는 transform)에서 순수 absolute 배치(left/top 모두 %·px로 직접
//   지정)로 바꿨다. flex+gap은 "카드들이 자동으로 한 줄에 맞춰 정렬되는"
//   구조라 아무리 gap을 키우고 offset을 줘도 결국 "줄" 인상을 벗어나기
//   어려웠다 — 각 카드를 완전히 독립적인 좌표로 놓아야 레퍼런스처럼
//   자유로운 배치가 가능했다. X 좌표 계산 로직(카드 폭 누적 + gap) 자체는
//   그대로 재사용하되, 이번엔 카드 "중심"이 아니라 "왼쪽 끝"(leftX)을
//   직접 뽑아 각 wrapper의 style.left로 쓴다.
// - gap 확대: 레퍼런스를 실측하면 카드 사이 gap이 카드 폭 대비 꽤 넓다
//   (약 4~5.4%, 이전 1.3%보다 훨씬 큼) — WORKFLOW_GAP_PCT_APPROX를 5로
//   올려 "line이 지나갈 빈 공간" 자체를 넓혔다.
// - line의 진입 node를 카드 "중심"이 아니라 라벨(숫자 원)의 중심 X로
//   옮겼다(LABEL_CIRCLE_CENTER_INSET_PCT) — 카드 wrapper가 items-start라
//   라벨이 이미 wrapper 왼쪽 끝에 붙어있으므로, 레퍼런스처럼 line이 각
//   카드의 좌상단/라벨 쪽을 지나가는 것처럼 보인다.
// - 라벨→node stub 추가: 레퍼런스에는 숫자 원 바로 아래에서 카드 진입
//   지점까지 이어지는 짧은 연결선이 보인다 — 44차엔 없던 요소라 얇은
//   <line> 4개(카드별 opacity에 묶임)로 추가해 라벨이 line에 "매달린"
//   것처럼 보이게 했다.
// - line 자체의 시각적 비중을 크게 키웠다: "카드 뒤의 장식이 아니라 화면
//   전체를 관통하는 주요 시각 요소"라는 요청에 맞춰, core stroke(2→3px,
//   opacity 0.55→0.85)에 더해 feGaussianBlur 기반 glow 레이어(strokeWidth
//   9px, blur, opacity 0.45)를 밑에 깔았다 — gap 중점 node에도 같은 방식의
//   작은 glow 후광을 추가해 레퍼런스의 은은하게 빛나는 line 질감에 가깝게
//   했다. 색 자체는 기존 navy(#1e3a8a)/lavender(#8b9fe0)/success(#047857)
//   팔레트 그대로라 채도가 강한 네온은 아니다.
// line/node/label/카드 배치 방식만 근본적으로 다시 짰을 뿐, 카드 내부 실제
// 콘텐츠, 카드 폭(0→21%)/높이(60vh 고정)/portrait 비율, 기존 스크롤
// 타이밍, gradient, Hero copy fade, scene expansion은 전혀 손대지 않았다.
// 46차(2026-08). "비슷한 느낌"이 아니라 레퍼런스를 이 섹션의 최종
// 디자인으로 삼아 최대한 동일하게 재현하라는 요청 — 기존 구조를 보정하는
// 대신 workflow scene을 사실상 새로 짰다.
// - 전용 eyebrow+title 추가: 페이지 최상단 Hero copy(JOBCAL AI/취업
//   메일을...)는 그대로 두고, 이 4-card scene 바로 위에 레퍼런스와 동일한
//   문구의 작은 파란 eyebrow + 큰 제목을 새로 얹었다(landing.hero.demo.
//   workflowEyebrow/workflowTitle 신규 키). mailResizeT에 묶여 rest
//   상태에서는 안 보이고 scene이 펼쳐질 때 함께 나타난다.
// - 카드 배치를 레퍼런스에 맞춰 다시 실측: gap을 카드 폭 대비 넓게
//   (WORKFLOW_GAP_PCT_APPROX=5, 45차와 동일), Y 계단(CARD_Y_OFFSET)은
//   그대로, 폭은 카드마다 살짝씩 좁아지도록(MAIL/AI/EXTRACT/FOURTH_CARD_
//   WIDTH_TO_PERCENT를 21→20/19/18.5/17.5로) 조정했다. 카드 surface에는
//   레퍼런스처럼 아주 미세한(최대 0.6도) 개별 rotation(CARD_ROTATE_DEG)과
//   절제된 큰 그림자(shadow-[0_20px_45px_rgba(30,58,138,0.12)])를 추가했다
//   — 라벨은 회전시키지 않고 카드 surface(흰 박스)에만 적용해 숫자/텍스트는
//   항상 수평을 유지한다.
// - 01~04 라벨을 "숫자 원 + 제목"에서 레퍼런스와 동일한 "숫자 원(56px,
//   커짐) + 제목 + 1~2줄 설명"으로 확장했다. 설명 문구는 사용자가 준 문구를
//   그대로 새 i18n 키 4개(stepMailDesc/stepAnalyzeDesc/stepExtractDesc/
//   stepCompleteDesc)로 추가했고, 2줄인 항목은 "\n"을 넣고 whitespace-
//   pre-line으로 그대로 줄바꿈한다. 라벨 zone이 커진 만큼 LABEL_ZONE_HEIGHT
//   도 48→112로 키웠다.
// - workflow line을 "카드 뒤 장식 curve 하나"에서 "장면 전체를 관통하는
//   핵심 요소"로 다시 짰다: 그라데이션을 기존 navy 단색에서 레퍼런스처럼
//   blue(#1e3a8a)→blue(#2563eb)→cyan(#22d3ee)→success green(#10b981)으로
//   바꾸고, 각 카드 진입 node에서 라벨 원 바로 아래까지 이어지는 vertical
//   stub(line)을 추가했다(레퍼런스의 "번호에서 카드로 내려오는 연결선").
//   카드 사이 dip node도 더 크고 밝게(glow 강화) 키웠고, 화면 하단까지
//   흐르는 별도의 은은한 ambient path(고정된 완만한 S-wave, 매우 옅은
//   opacity)를 추가해 "화면 하단에도 이어지는 flowing path"를 재현했다 —
//   장식 전용이라 카드/progress와는 opacity만 약하게 연동된다. 전부 기존
//   feGaussianBlur 기반 soft glow는 유지하되 채도는 JobCal 팔레트
//   (navy/success) 안에서만 움직여 강한 neon은 되지 않게 했다.
// - 배경: LandingHero.tsx의 SECTION_GRADIENT를 단순 세로 gradient에서
//   레퍼런스처럼 오른쪽 위 cyan/왼쪽 아래 lavender/중앙 blue bloom
//   radial-gradient 3개 + 기존 세로 gradient를 겹친 값으로 바꿨다 — 이
//   상수를 쓰는 기존 opacity 페이드(SECTION_BG_IN) 로직 자체는 그대로다.
// 카드 내부 실제 콘텐츠(문구/필드/헤더 등)와 기존 스크롤 타이밍
// (MAIL_RESIZE_IN 등 전부), gradient 로직의 fade 구조, scene expansion은
// 전혀 손대지 않았다 — 이번 턴은 workflow scene의 "구성/레이아웃/line/
// 배경"만 레퍼런스에 맞춰 다시 짰다.
// 47차(2026-08). 디자인/구조는 그대로 두고 "비율"만 두 가지 조정.
// 1) 카드가 화면을 너무 꽉 채운다는 피드백 — 카드 전체를 13%(CARD_SCALE=
//    0.87, 요청 범위 10~15% 안) 축소했다. "카드 내부 콘텐츠는 바꾸지
//    말라"는 요청과 함께라서, 내부 JSX/폰트/패딩 px 값을 일일이 손대는
//    대신 카드를 원래 크기(CARD_CONTENT_HEIGHT_VH, 안 바뀜) 그대로
//    렌더링한 뒤 transform: scale(CARD_SCALE)로 통째로 축소한다 — 폰트,
//    패딩, radius, border, shadow까지 전부 같은 비율로 자연스럽게
//    줄어들면서도 내부 마크업은 단 한 줄도 안 바뀌었다(레이아웃 계산이
//    끝난 카드를 "사진처럼" 축소하는 방식). 카드를 담는 바깥 wrapper는
//    축소된 크기(CARD_HEIGHT_VH = CARD_CONTENT_HEIGHT_VH * CARD_SCALE)를
//    쓰므로 레이아웃 공간도 실제로 줄어든다 — 스케일만 걸고 자리는 그대로
//    두면 카드 사이에 의도치 않은 빈 공간만 생기므로 피했다.
//    "카드를 줄인 뒤 단순히 빈 공간만 늘리지 말고 workflow line/간격/
//    위치를 재조정"이라는 요청에 맞춰 WORKFLOW_GAP_PCT_APPROX도 5→8로
//    키웠다 — 줄어든 카드 폭만큼을 카드 사이 간격으로 돌려줘서 4-card
//    행 전체가 이전과 비슷한 폭을 쓰게 하고(가장자리에 어색한 여백만
//    남지 않도록), workflow line도 더 넓어진 gap 안에서 더 여유 있게
//    지나간다. line의 X좌표 계산이 이미 폭+gap 값만으로 이뤄지는
//    analytical 방식이라 좌표를 따로 손댈 필요 없이 자동으로 재조정됐다.
//    Y 계단(CARD_Y_OFFSET)과 dip 깊이(WORKFLOW_DIP_DEPTH)는 그대로 뒀다.
// 2) 메인 헤드라인(「メールから登録まで、AIが自動でサポート」)이 카드에
//    비해 존재감이 약하다는 피드백 — text-[24px]/sm:text-[30px]/
//    font-[700]에서 text-[34px]/sm:text-[48px]/font-[800]로 확실히
//    키웠다. 작은 eyebrow(「メールを貼るだけ。...」)는 "보조 문구" 역할을
//    유지하라는 요청대로 크기·굵기를 그대로 뒀다 — eyebrow(작게) →
//    title(크게) → 01~04 → 카드 순으로 시선이 자연스럽게 내려가는 위계.
// 01~04 설명, workflow line 구조, gradient/glow, 카드 내부 콘텐츠, scroll
// interaction은 이번 턴에도 전혀 손대지 않았다 — 순수하게 카드/헤드라인
// "비율"만 조정했다.
// 48차(2026-08). 카드 크기/헤드라인 크기는 47차 그대로 두고, composition의
// "위치와 간격"만 최종 polish.
// - 카드 사이 gap을 WORKFLOW_GAP_PCT_APPROX 8→6.2로 약 22% 줄였다(요청
//   범위 20~25% 안) — 카드가 붙어 보이진 않으면서 4개가 하나의 연속된
//   흐름처럼 느껴지는 정도를 목표로 했다. line의 X좌표가 이 값 하나로
//   계산되는 analytical 구조라 gap을 좁힌 것만으로 line도 자동으로 좁아진
//   gap에 맞게 다시 연결된다(별도 좌표 수정 불필요).
// - Y 계단(CARD_Y_OFFSET)을 [0,48,81,106]→[0,34,54,58]로 완화했다 —
//   전체 편차를 줄이면서 특히 마지막 델타(카드3→4, +25→+4)를 크게
//   줄여 4번 카드가 카드3과 거의 같은 높이까지 올라오게 했다("오른쪽
//   아래로 무게가 쏠리지 않도록" 요청 반영). nodeY도 이 값을 그대로
//   쓰므로 line/node 위치가 자동으로 따라온다.
// - 01~04 라벨과 카드 상단 사이 breathing room 요청으로 renderStageLabel의
//   하단 여백을 mb-4(16px)→mb-6(24px)로 늘렸다. line의 진입 node가 실제
//   "라벨 zone이 끝나는 지점"을 기준으로 하므로, LABEL_ZONE_HEIGHT도 늘어난
//   8px만큼 112→120으로 같이 키워 line/label/카드 상단이 계속 정확히
//   맞물리게 했다.
// 카드 크기(CARD_SCALE/CARD_HEIGHT_VH/각 카드 폭), 헤드라인 크기, 카드
// 내부 UI, workflow line의 색상·glow 스타일, gradient/background, scroll
// interaction은 전혀 손대지 않았다 — 이번 턴은 간격/위치 값 3개만
// 조정했다.
// 49차(2026-08). 카드 크기/간격/Y 위치/헤드라인은 그대로 두고 line 표현만
// 최종 수정.
// 1) 메인 line이 카드보다 먼저 보인다는 피드백 — 색 흐름(navy→blue→cyan→
//    success green)은 그대로 두고 두께/밝기만 약 18% 낮췄다: glow
//    strokeWidth 10→8.3·opacity 0.5→0.41, core strokeWidth 3→2.5, glow
//    필터 blur(stdDeviation) 6→5, 라벨→node 연결선(vertical stub)
//    strokeWidth 2→1.7·opacity 계수 0.7→0.6. node도 함께 축소했다:
//    카드 진입 node r 5→4.2(마지막만 5.5→4.6), gap 중점 node core
//    r 5.5→4.6·opacity 계수 0.95→0.85, gap 중점 glow r 13→10.8·opacity
//    계수 0.28→0.23, success 후광 r 17→14·opacity 계수 0.18→0.15.
// 2) 화면 하단 ambient path가 "중간에서 잘린 그래픽 오류"처럼 보인다는
//    피드백 — 진짜 원인을 찾아보니 곡선 진폭(최대 ±50px)이 SVG 자신의
//    높이(WORKFLOW_SVG_HEIGHT) 예산을 벗어나 바닥 경계에서 그대로
//    잘려나가고 있었다(예: x=900 지점 Y가 SVG 높이를 14px 초과). 단순히
//    opacity만 낮추는 대신 구조를 다시 짰다: 진폭을 ±3~5px로 크게 줄이고
//    기준선(ambientY)도 바닥에서 50px 띄워 SVG 경계를 절대 벗어나지 않는
//    "하나의 연속된 완만한 curve"로 재구성했고, path 자체도 정확히
//    x=0~1000(뷰포트 전체 폭)만 커버하도록 정리했다. 좌우 fade-out은
//    path를 화면 밖으로 밀어 잘라내는 land-hack 대신, stroke에 alpha
//    gradient(heroWorkflowAmbientGradient 양 끝 stop-opacity=0)를 줘서
//    자연스럽게 옅어지며 사라지게 했다. 두께도 26→5로 크게 줄이고
//    opacity(0.16+…→0.08+…), blur(stdDeviation 14→7)도 낮춰 "배경 장식"
//    수준으로만 인식되게 했다 — 메인 line/node와 마찬가지로 카드(z-10)
//    보다 뒤(z-0)에 있으므로 카드 밑을 지날 땐 여전히 자연스럽게 가려지고
//    gap에서 다시 나타난다(z-index 구조 자체는 이전과 동일).
// 카드 크기/간격/Y 위치/카드 내부 UI/01~04 영역/헤드라인/배경 gradient/
// scroll interaction은 전혀 손대지 않았다 — 이번 턴은 line 두 개(메인·
// ambient)의 강도와 ambient의 구조적 결함만 고쳤다.
// 51차(2026-08). 디자인/레이아웃은 그대로 두고 scroll-driven motion만
// 다듬었다. raw scroll progress를 스무딩하는 실제 로직은 부모
// (LandingHero.tsx)에 새로 추가했고(rAF 기반 지수 감쇠 보간 — 자세한
// 내용은 그쪽 헤더 주석 참고), 이 파일이 받는 `progress` prop은 이제 항상
// 이미 스무딩된 값이다. 이 파일에서 바뀐 것은 두 가지:
// - rampIn()이 이제 linear가 아니라 ease-out cubic을 반환한다(파일 전체의
//   모든 등장/성장/opacity 애니메이션이 이 함수 하나를 거치므로, 여기
//   한 곳만 바꿔 "카드 등장/이동/scale/opacity는 ease-out 계열로" 요청을
//   일괄 반영했다). t=0/1 경계는 그대로 유지되므로 마운트 게이팅 등
//   "이 구간 끝나면 정확히 1" 로직에는 영향 없다.
// - 카드 4개의 mount 구간(MAIL_RESIZE_IN/AI_ANALYZING_IN/EXTRACT_IN/
//   FOURTH_IN)이 서로 딱 맞붙어 있던 걸(예: EXTRACT_IN이 AI_ANALYZING_IN이
//   끝나는 지점에서 정확히 시작) 0.15~0.2 폭으로 겹치게 다시 잡았다 —
//   "hard threshold로 툭 바뀌지 말고 구간을 겹쳐 cross-fade"라는 요청.
//   각 CONTENT_IN(텍스트 늦춤 구간)도 새 부모 구간에 맞춰 비례
//   재계산했다.
// - 카드 2/3/4 wrapper에 있던 CSS transition(transition-[width,left,top]
//   duration-150)과 eyebrow/title 블록의 transition-opacity를 제거했다 —
//   progress가 이미 매 프레임 부드럽게 변하는 상황에서 CSS transition을
//   또 얹으면 "보간 위에 또 보간"이 겹쳐 스크롤이 멈춘 뒤에도 150ms를
//   더 끌려오는 이중 지연이 생긴다(요청한 "스크롤 멈추면 빠르게 수렴"과
//   충돌). 스무딩은 이제 부모의 rAF 루프 한 곳에서만 담당한다. 대신
//   카드 2/3/4에는 opacity와 함께 아주 작은(최대 8px) translateY를
//   추가해 "opacity+subtle translate 중심" 요청을 반영했다 — 폭 성장
//   자체(레이아웃/디자인)는 그대로 두고 그 위에 얹는 보조 모션이다.
// 카드 크기/간격/Y 위치/카드 내부 UI/01~04 영역/헤드라인/배경 gradient/
// line 색상은 전혀 손대지 않았다 — 순수하게 motion(스무딩·easing·구간
// 겹침·transition 정리)만 조정했다.
// 52차(2026-08). "Chrome은 부드러운데 Safari에서 약간 끊긴다"는 피드백 —
// 디자인/레이아웃/애니메이션 타이밍은 그대로 두고 Safari(WebKit) 렌더링
// 비용만 줄였다. 코드를 다시 훑어 확인한 실제 비용 요인과 조치:
// 1) feGaussianBlur 기반 SVG filter — line(메인/ambient)과 node 후광 전부
//    animated filter(매 프레임 path의 d/stroke-dashoffset이 바뀌는 대상에
//    건 blur)를 쓰고 있었다. WebKit은 이런 "형태가 계속 바뀌는 대상의
//    blur"를 매 프레임 다시 합성해야 해서 비용이 크다(Chrome의 Skia보다
//    특히 느림) — 이게 Safari 끊김의 가장 유력한 원인이라 판단해 filter를
//    전부 제거하고 시각적으로 거의 동일한 대체 기법으로 바꿨다: line의
//    "번짐"은 같은 path를 opacity/두께만 다르게 3겹 겹쳐 그리는 방식(post-
//    process 없이 단순 겹쳐 그리기라 훨씬 쌈), node의 "후광"은
//    radialGradient fill(중심→가장자리 opacity 0)로 — 둘 다 blur 없이
//    비슷한 부드러운 느낌을 낸다. heroWorkflowGlow/heroWorkflowGlowSoft
//    filter와 feGaussianBlur는 이제 이 파일에 없다.
// 2) 불필요한 React 재렌더링 — progress가 매 rAF tick마다 바뀌어 이
//    컴포넌트 전체가 매 프레임 재실행된다. 그중 카드 1(항상 마운트돼
//    있어 스크롤 내내 재렌더링되는 유일한 카드)의 메일 본문 텍스트
//    블록 2개(이 파일에서 가장 큰 정적 콘텐츠, 실제로는 progress에
//    의존하지 않고 t() 문자열에만 의존)를 useMemo로 감싸 매 프레임
//    React가 그 서브트리를 diff하지 않고 완전히 건너뛰게 했다(자세한
//    이유는 해당 useMemo 옆 주석 참고).
// 3) will-change — scale/tilt 컨테이너, eyebrow/title opacity 블록,
//    카드 2/3/4 wrapper(opacity+translateY), 배경 gradient(LandingHero.tsx)
//    등 실제로 매 프레임 transform/opacity가 바뀌는 요소에만 좁게
//    추가해 별도 compositing layer로 미리 승격되게 했다 — left/width
//    처럼 애초에 레이아웃이 필요한 속성에는 걸지 않았다(레이어 승격만으론
//    안 싸지고, 남용하면 GPU 메모리만 낭비).
// 4) rAF/state 업데이트 — 51차에서 이미 구현한 "매 프레임 정확히 하나의
//    setState(smoothProgress)만 발생, 수렴하면 루프가 스스로 멈추고
//    scroll/scrollend에만 다시 깨어남" 구조를 다시 확인했다 — 이번 턴에
//    새로 도는 rAF 루프나 추가 state는 만들지 않았다.
// Chrome에서 색/굵기/윤곽이 이전과 거의 같아 보이는지 직접 스크롤로
// 비교했다(브라우저 자동화가 Chrome만 가능해 Safari는 동일한 방식으로
// 직접 스크롤 재생 검증은 못 했다 — 대신 위 조치들은 WebKit의 잘 알려진
// 렌더링 특성에 근거했고, 실제 Safari에서 다시 확인이 필요하다).
// 카드 크기/간격/Y 위치/헤드라인/배경 gradient의 색상 구성/line 색상 흐름/
// scroll interaction 타이밍은 전혀 손대지 않았다.

const SCALE_IN: [number, number] = [0, 0.7];
const STAGE_WIDTH_FROM_VW = 70;
const STAGE_WIDTH_TO_VW = 92;
const SCENE_SCALE_FROM = 1.0;
const SCENE_SCALE_TO = 1.03;
// 53차: 카드 1의 rest 상태 높이가 mailCardScale 도입으로 약 13vh 더
// 커졌다(52.2vh→65.4vh) — 그만큼 이 최소 높이도 같이 늘려 라벨 zone까지
// 포함한 rest 상태 콘텐츠가 여유 있게 들어가게 했다(안 늘리면 scene의
// 실제 렌더링 높이가 minHeight보다 작게 잡혀 카드 하단이 다음 섹션과
// 시각적으로 너무 가까워질 수 있음). TO 값(스크롤 완료 시점)은 카드
// 1도 다른 카드와 같은 CARD_SCALE로 수렴하므로 그대로 뒀다.
// 54차: 카드 1 rest 폭을 한 번 더 키운 만큼(67.2%) 카드 자체 높이도
// 커져(약 73vh) 73→88로 다시 올렸다. FROM(88)이 TO(80)보다 커져 스크롤
// 중 이 최소높이 값 자체는 살짝 줄어드는 구간이 생기지만, 카드 1은
// mailResizeT가 훨씬 이른 시점(progress 0.4)에 이미 원래 크기로 줄어들어
// 있어 실제 렌더링 내용과는 어긋나지 않는다(minHeight는 하한선일 뿐 실제
// 내용을 자르지 않음) — 실제 화면으로 다음 섹션과 겹치지 않는지 확인했다.
const SCENE_MIN_HEIGHT_FROM_VH = 88;
const SCENE_MIN_HEIGHT_TO_VH = 80;

// 47차(2026-08): 카드가 화면을 너무 꽉 채운다는 피드백으로 카드 전체를
// 13%(요청 범위 10~15% 안) 축소했다. 카드 "내부 콘텐츠는 바꾸지 말라"는
// 요청이 같이 있어서, 내부 px 폰트/패딩을 하나하나 손대는 대신 카드
// 자체는 원래 크기(CARD_CONTENT_HEIGHT_VH)로 그대로 렌더링한 뒤
// transform: scale(CARD_SCALE)로 통째로 축소한다 — 그러면 폰트/패딩/
// radius/border까지 전부 같은 비율로 자연스럽게 줄어들면서도 내부 JSX는
// 단 한 줄도 안 바뀐다. 카드를 담는 바깥 wrapper(레이아웃에 실제로 잡는
// 공간)만 축소된 크기(CARD_HEIGHT_VH)를 쓰므로, 카드를 줄인 만큼 레이아웃
// 상의 공간도 함께 줄어든다(스케일만 걸고 자리는 그대로 두는 방식이
// 아니다 — 그러면 카드 사이에 빈 공간만 생긴다).
const CARD_SCALE = 0.87;
// 카드가 "원래" 디자인된 높이 — 이 값 자체는 안 바뀐다. 스케일 전 콘텐츠가
// 이 높이 기준으로 배치되어 있어야 축소 후에도 내부 레이아웃(잘림 없이
// 12줄이 들어가는 것 등)이 이전과 동일하게 유지된다.
const CARD_CONTENT_HEIGHT_VH = 60;
// 실제 레이아웃이 예약하는 높이(축소된 값) — 카드 wrapper와 workflow line
// 계산 모두 이 값을 쓴다.
const CARD_HEIGHT_VH = CARD_CONTENT_HEIGHT_VH * CARD_SCALE;

// 50차: "각 단계 전환이 hard threshold처럼 툭 바뀌지 않게 구간을 겹치라"는
// 요청으로 네 카드의 등장 구간을 서로 겹치도록 다시 잡았다(예전엔 EXTRACT_IN/
// FOURTH_IN이 바로 앞 구간이 끝나는 지점에서 정확히 시작해 이어붙는 지점이
// 뚝 끊겨 보였다). 인접한 두 구간이 항상 일정 폭으로 겹쳐서, 한 카드가
// 자리 잡는 동안 다음 카드가 이미 옅게 자라나기 시작한다 — 계단식 hard cut이
// 아니라 연속적인 cross-fade로 느껴진다.
// 56차: "4번 카드가 너무 늦게(거의 progress=1) 나타나 workflow 전체를 다
// 보기 전에 다음 섹션으로 넘어간다"는 피드백으로 네 구간 전체를 앞당겼다.
// 겹침 비율(각 구간이 이전 구간의 몇 %쯤 지났을 때 시작하는지)은 그대로
// 유지해 "부드럽게 이어지는 느낌"은 안 바뀌고, 전체가 더 빨리 끝나도록
// 압축했다 — 특히 3번(EXTRACT)·4번(FOURTH)을 더 크게 당겨서(폭 0.35→0.26,
// 0.3→0.26이지만 시작점을 훨씬 앞으로) "3/4번이 더 빨리 나타나야 한다"는
// 요청을 반영했다. FOURTH_IN이 0.74에서 끝나므로 progress≈0.7에 이미
// opacity 0.99+, 0.74~1.0(scroll range의 약 1/4)은 4개 카드가 전부 완성된
// 상태로 유지되는 "hold" 구간이 된다. SCALE_IN(scene 자체의 92vw 성장/
// min-height, [0,0.7])과 카드 크기/좌표(WIDTH_TO_PERCENT, CARD_Y_OFFSET,
// WORKFLOW_GAP_PCT_APPROX)는 이번에 전혀 안 건드렸다 — "레이아웃/카드
// 크기/위치는 그대로, 타이밍만" 요청 그대로.
const MAIL_RESIZE_IN: [number, number] = [0, 0.32];
// 53차: 첫 화면(rest, mailResizeT=0)의 이메일 카드가 "이메일 화면인지
// 바로 안 보일 만큼 작다"는 피드백 — 가로폭을 25%(요청 범위 25~30% 안)
// 키웠다(48→60). 54차: "아직도 작다"는 피드백으로 한 번 더 12%(요청 범위
// 10~15% 안) 키웠다(60→67.2). 55차: 이번엔 반대로 "headline과 시각적
// 주도권을 경쟁할 만큼 커졌다"는 피드백으로 약 9%(요청 범위 8~10% 안)
// 줄였다(67.2→61.2, 대략 53차 직후의 60에 가까운 값으로 되돌아간 셈).
// 이 카드의 top 위치는 CARD_Y_OFFSET[0]=0으로 row 상단에 고정돼 있고
// row 자체의 위치는 이 폭/스케일과 무관하므로(header pt/CTA 여백 등은
// 이번에 전혀 안 건드림), 폭만 줄여도 카드 "시작 위치"는 그대로 유지된
// 채 카드 전체 footprint만 줄어든다 — "지금 위치는 유지" 요청을 그대로
// 만족한다. 스크롤 이후(workflow scene) 최종 폭은 MAIL_CARD_WIDTH_TO_PERCENT로
// 그대로 유지되므로 이 변경은 rest 상태에만 영향을 준다.
const MAIL_CARD_WIDTH_FROM_PERCENT = 61.2;
const MAIL_CARD_WIDTH_TO_PERCENT = 20 * CARD_SCALE;
// "내부 텍스트/UI도 함께 자연스럽게 커지게" 요청 — 폭만 키우면 카드는
// 넓어지지만 고정 px 폰트 크기는 그대로라 같은 글자가 더 넓은 여백 안에
// 떠 있는 것처럼 보인다. 카드 1은 이미 CARD_SCALE(0.87)로 "원래 크기"를
// 축소해서 보여주는 scale-trick 구조라, rest 상태에선 그 축소율을 폭과
// 같은 비율(MAIL_CARD_WIDTH_FROM_PERCENT/48배)로 키운다 — 축소가 아니라
// 원래 디자인보다 확대된 밀도가 된다. mailResizeT가 늘면서(스크롤 시작)
// 이 값이 기존 CARD_SCALE(0.87)까지 부드럽게 줄어들어, 스크롤 이후
// workflow 카드들의 밀도(46~52차에 걸쳐 확정된 값)는 전혀 안 바뀐다.
const MAIL_REST_SCALE = CARD_SCALE * (MAIL_CARD_WIDTH_FROM_PERCENT / 48);

const AI_ANALYZING_IN: [number, number] = [0.16, 0.44];
const AI_CARD_WIDTH_TO_PERCENT = 19 * CARD_SCALE;
// 텍스트는 카드 폭이 좁을 때(특히 전환 초반) 한글이 단어 단위가 아니라 글자
// 단위로 세로 줄바꿈되어 보기 흉해진다. 그래서 박스(테두리/배경/폭)는
// AI_ANALYZING_IN 구간 내내 자라나되, 실제 문구는 박스가 최종 폭에 거의
// 다다른 뒤(구간 후반부, 62.5% 지점부터)에야 fade-in하도록 별도 구간으로
// 늦췄다 — 56차: AI_ANALYZING_IN을 당긴 만큼 이 구간도 같은 비율로 당겼다.
const AI_CONTENT_IN: [number, number] = [0.34, 0.44];

const EXTRACT_IN: [number, number] = [0.32, 0.58];
const EXTRACT_CARD_WIDTH_TO_PERCENT = 18.5 * CARD_SCALE;
// 56차: EXTRACT_IN을 당긴 것과 같은 비율(구간의 50% 지점부터 fade-in)로 이동.
const EXTRACT_CONTENT_IN: [number, number] = [0.45, 0.58];

const FOURTH_IN: [number, number] = [0.48, 0.74];
const FOURTH_CARD_WIDTH_TO_PERCENT = 17.5 * CARD_SCALE;
// 56차: FOURTH_IN을 당긴 것과 같은 비율(구간의 53% 지점부터 fade-in)로 이동.
const FOURTH_CONTENT_IN: [number, number] = [0.62, 0.74];

const TILT_MAX_ROTATE_DEG = 1.6;
const TILT_MAX_TRANSLATE_PX = 3;

// 카드 사이 gap을 stage 폭 대비 %로 근사한 값. 47차에서 8%까지 넓혔더니
// "카드 사이 공간이 너무 넓다"는 피드백 — 약 22% 줄여 4개가 하나의
// 연속된 흐름으로 느껴지되(카드끼리 붙어 보이진 않을 정도로) 좀 더
// 가까워지게 했다. workflow line의 X 좌표 계산도 이 값을 그대로 쓰므로
// line이 지나가는 gap도 자동으로 좁아진다.
const WORKFLOW_GAP_PCT_APPROX = 6.2;

// 카드 Y 위치 — 오른쪽으로 갈수록 내려가는 계단은 유지하되, 48차에서
// "너무 아래로 처진다"는 피드백으로 전체 편차를 줄이고 특히 마지막
// 델타(카드3→4)를 크게 줄였다 — 4번 카드가 화면 오른쪽 아래로 무게가
// 쏠려 보이지 않도록 카드3과 거의 비슷한 높이까지 끌어올렸다(원래 델타
// +48/+33/+25 → +34/+20/+4).
const CARD_Y_OFFSET = [0, 34, 54, 58];

// 레퍼런스는 카드 폭도 오른쪽으로 갈수록 살짝씩 좁아진다 — MAIL/AI/
// EXTRACT/FOURTH_CARD_WIDTH_TO_PERCENT(20/19/18.5/17.5)에 이미 반영.

// 레퍼런스에서 느껴지는 아주 미세한 손맛 — 카드가 완전히 반듯한 격자가
// 아니라 살짝씩 다른 각도로 놓인 듯한 rotation(1도 미만). 과하면 "기울어진
// 카드"로 보이므로 최대 0.6도로 제한했다.
const CARD_ROTATE_DEG = [-0.6, 0.4, -0.3, 0.5];

// 01~04 라벨 zone(숫자 원 + 단계명 + 1~2줄 설명) 높이. 레퍼런스는 원+제목
// 한 줄 아래에 작은 설명 문구가 더 있어 43~45차의 단순 "원+제목"보다 zone
// 자체가 훨씬 크다 — 이 지점이 "라벨이 끝나고 카드가 시작되는 경계"이자
// workflow line이 각 카드에 도달하는 node의 기준 Y다. 48차: 라벨과 카드
// 사이 breathing room 요청으로 renderStageLabel의 하단 여백을 mb-4(16px)
// →mb-6(24px)로 늘렸고, 이 zone 높이도 늘어난 8px만큼 함께 키웠다(line
// node가 실제 카드 상단과 어긋나지 않도록).
const LABEL_ZONE_HEIGHT = 120;

// 카드 wrapper는 items-start라 라벨(숫자 원)이 wrapper의 왼쪽 끝에 붙는다.
// workflow line의 진입 node를 카드 "중심"이 아니라 이 라벨 원의 중심
// X(=wrapper 왼쪽 끝 + 원 반지름)에 맞춰, 레퍼런스처럼 line이 각 카드의
// 좌상단 모서리/라벨 쪽을 지나가게 한다(원 지름(56px)의 절반을 stage 폭
// 대비 %로 근사).
const LABEL_CIRCLE_CENTER_INSET_PCT = 2.2;

// line이 카드 사이 빈 공간(gap)을 지나갈 때 얼마나 깊이 아래로 처지는지(px,
// 각 카드 top 기준 추가 깊이). 레퍼런스는 1~2번째 gap은 완만하고 3번째
// gap에서 카드 하단 가까이까지 크게 처지는 비대칭 wave라 그 비율을 그대로
// 재현했다 — 앞의 두 dip은 상대적으로 얕고 마지막만 훨씬 깊다.
const WORKFLOW_DIP_DEPTH = [230, 260, 430];

// SVG 좌표계 자체의 높이 — 라벨 zone + 가장 깊은 카드 오프셋 + 가장 깊은
// dip + 화면 하단까지 이어지는 ambient path와 glow blur 여유분을 모두
// 더한 값.
const WORKFLOW_SVG_HEIGHT =
  LABEL_ZONE_HEIGHT + Math.max(...CARD_Y_OFFSET) + Math.max(...WORKFLOW_DIP_DEPTH) + 90;

// 실제 AiMailDrawer의 STEPS(메일 입력/기업 확인/내용 확인)는 3개뿐이고 "AI 분석"은
// 그 안의 로딩 상태라 이 랜딩의 4단계 카드 내러티브와 1:1로 안 맞는다. 그래서 이
// 데모 전용으로 이미 있던 미사용 키(landing.hero.demo.step*)를 라벨로 쓴다 —
// 원+연결선 스타일 자체는 실제 컴포넌트 그대로.
const DEMO_STEP_LABEL_KEYS = [
  "landing.hero.demo.stepMail",
  "landing.hero.demo.stepAnalyze",
  "landing.hero.demo.stepExtract",
  "landing.hero.demo.stepComplete",
];
// 레퍼런스의 01~04 라벨은 단계명 아래에 1~2줄 설명이 더 붙는다. 새 문구를
// 지어내지 않고 사용자가 지정한 그대로 4개 키를 새로 추가했다(2줄인
// 항목은 "\n"을 그대로 넣고 JSX에서 whitespace-pre-line으로 렌더링).
const DEMO_STEP_DESC_KEYS = [
  "landing.hero.demo.stepMailDesc",
  "landing.hero.demo.stepAnalyzeDesc",
  "landing.hero.demo.stepExtractDesc",
  "landing.hero.demo.stepCompleteDesc",
];

// EmailPasteForm.tsx의 "AI가 추출할 정보" 안내 박스와 동일한 7개 필드 키.
const EXTRACT_FIELD_KEYS = [
  "aiEmail.paste.extractFields.company",
  "aiEmail.paste.extractFields.step",
  "aiEmail.paste.extractFields.result",
  "aiEmail.paste.extractFields.schedule",
  "aiEmail.paste.extractFields.contact",
  "aiEmail.paste.extractFields.url",
  "aiEmail.paste.extractFields.memo",
];

// 50차: 이 파일 전체의 모든 등장/성장/opacity 애니메이션이 이 한 함수를
// 거친다(mailResizeT/aiCardT/scaleT/각 content opacity 등) — 여기서만
// linear 대신 ease-out cubic(1-(1-t)^3)을 적용하면 "카드 등장/이동/scale/
// opacity는 linear 대신 ease-out 계열로"라는 요청이 파일 전체에 일괄
// 반영된다. t=0/1 경계값은 그대로 0/1로 유지되므로(ease-out은 구간
// 중간만 휘게 함) 기존에 "이 구간이 끝나면 정확히 1이 된다"에 의존하는
// 다운스트림 로직(마운트 게이팅 등)에는 영향이 없다.
function easeOutCubic(t: number) {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

export function rampIn(value: number, start: number, end: number) {
  if (end <= start) return value >= end ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return easeOutCubic(t);
}

export interface LandingHeroDemoProps {
  progress: number;
}

export default function LandingHeroDemo({ progress }: LandingHeroDemoProps) {
  const t = useT();

  const [tilt, setTilt] = useState({ rx: 0, ry: 0, tx: 0, ty: 0 });
  const [hoverCapable] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (!hoverCapable) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: -relY * TILT_MAX_ROTATE_DEG * 2,
      ry: relX * TILT_MAX_ROTATE_DEG * 2,
      tx: relX * TILT_MAX_TRANSLATE_PX * 2,
      ty: relY * TILT_MAX_TRANSLATE_PX * 2,
    });
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0, tx: 0, ty: 0 });
  }

  // AiMailDrawer의 Drawer title 그대로 — 아이콘만 네이비, "JobCal AI" 텍스트는
  // stitch-ink.
  function renderDrawerHeader() {
    return (
      <span className="flex items-center gap-2">
        <MaterialIcon name="auto_awesome" size={20} className="text-primary-navy" />
        <span className="text-[15px] font-[500] whitespace-nowrap text-stitch-ink">
          {t("common.appName")} AI
        </span>
      </span>
    );
  }

  // 카드 위 workflow stage label — 레퍼런스의 "큰 숫자 원 + 단계명 + 1~2줄
  // 설명" 3단 구성을 그대로 재현한다. 설명 줄은 원이 아니라 제목 시작
  // 위치에 맞춰 들여쓴다(레퍼런스처럼 원 폭만큼 padding-left).
  function renderStageLabel(index: number, opacity: number) {
    return (
      <div className="mb-6 flex flex-col" style={{ opacity, pointerEvents: opacity < 0.05 ? "none" : "auto" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary-navy/20 bg-white text-[20px] font-[800] text-primary-navy shadow-[0_2px_10px_rgba(30,58,138,0.15)]">
            {`0${index + 1}`}
          </span>
          <span className="text-[17px] font-[700] whitespace-nowrap text-stitch-ink">
            {t(DEMO_STEP_LABEL_KEYS[index])}
          </span>
        </div>
        <p className="mt-1.5 max-w-[220px] pl-[68px] text-[12.5px] leading-[1.5] whitespace-pre-line text-secondary">
          {t(DEMO_STEP_DESC_KEYS[index])}
        </p>
      </div>
    );
  }

  const step = t("landing.scene.step");
  // 카드 1(메일)·3(추출 결과)·4(등록 완료) 회사명. 이전 턴엔 카드 4를 건드리지
  // 말라는 요청 때문에 카드 4만 landing.scene.company(옛 "샘플 주식회사")를
  // 그대로 썼는데, 이번 턴에 세 카드 모두 이 값으로 통일하라는 요청이 있어
  // 카드 4도 이 변수로 바꿨다 — landing.scene.company 자체는 이제 이 파일
  // 어디서도 안 쓰지만, 다른 랜딩 섹션(Moment1/2 등)이 쓸 수 있어 값 자체는
  // 건드리지 않았다.
  const companyName = t("landing.hero.demo.companyName");
  // useMemo 안에서 companyName.charAt(0)처럼 의존성 값에 메서드를 직접
  // 호출하면 react-hooks/preserve-manual-memoization 린트가 "이 의존성이
  // 나중에 변경될 수 있다"고 보수적으로 오탐한다(문자열은 불변이라 실제로는
  // 안전하지만, 이 규칙은 메서드 호출 자체를 신호로 본다) — 메모 밖에서
  // 미리 계산해 순수 값만 참조하게 했다.
  const companyInitial = companyName.charAt(0);

  const mailSubject = t("landing.hero.mailSubject");
  const recipientLine = t("landing.hero.demo.recipientLine");
  const greetingLine = t("landing.hero.demo.greetingLine");
  const senderLine = t("landing.hero.demo.senderLine", { company: companyName });
  const thanksLine = t("landing.hero.demo.thanksLine");
  const bodyLine = t("landing.hero.demo.bodyLine", { step });
  const datetimeLine = t("landing.hero.demo.datetimeLine");
  const formatLine = t("landing.hero.demo.formatLine");
  const meetUrlLine = t("landing.hero.demo.meetUrlLine");
  const prepLine = t("landing.hero.demo.prepLine");
  const deadlineLine = t("landing.hero.demo.deadlineLine");
  const closingLine = t("landing.hero.demo.closingLine");

  const inboxTag = t("landing.hero.demo.inboxTag");
  const senderEmail = t("landing.hero.demo.senderEmail");
  const recipientTo = t("landing.hero.demo.recipientTo");
  const receivedAt = t("landing.hero.demo.receivedAt");
  const reply = t("landing.hero.demo.reply");
  const replyAll = t("landing.hero.demo.replyAll");
  const forward = t("landing.hero.demo.forward");

  const extractTitle = t("aiEmail.review.title");
  const fieldCompanyLabel = t("landing.hero.demo.fieldCompany");
  const fieldDateTimeLabel = t("landing.hero.demo.fieldDateTime");
  const dateTime = t("landing.scene.dateTime");
  const completeTitle = t("landing.hero.demo.complete");

  const fieldStepStageLabel = t("aiEmail.paste.extractFields.step");
  const fieldMemoLabel = t("aiEmail.review.memoLabel");
  const memoNote = t("landing.hero.demo.memoNote");

  // 52차(Safari 성능): 카드 1(항상 마운트돼 있어 스크롤 내내 매 프레임
  // 재렌더링되는 유일한 카드)의 메일 본문 블록 2개(Gmail 읽기 화면 + Drawer
  // textarea 미리보기, 각각 12줄 안팎의 텍스트 노드 묶음으로 이 파일에서
  // 가장 큰 정적 콘텐츠)를 useMemo로 감쌌다. 두 블록 모두 progress에서
  // 파생되는 어떤 값에도 실제로 의존하지 않는다(감싸는 부모 div의
  // opacity/width만 restChromeT·mailResizeT를 쓴다) — 실제 의존성은 오직
  // t()로 뽑은 문자열들뿐이라, 매 rAF tick마다 progress가 바뀌어 컴포넌트
  // 전체가 재실행되어도 이 두 JSX 트리는 "이전과 같은 객체"를 그대로
  // 반환해 React가 자식 diff를 완전히 건너뛴다(같은 element 참조는 재귀
  // 비교 없이 즉시 bail-out). 언어 전환(t가 바뀌는 진짜 순간)에만 다시
  // 계산된다. Safari(JavaScriptCore)는 매 프레임 이만한 크기의 엘리먼트
  // 트리를 새로 만들고 diff하는 오버헤드가 상대적으로 크게 느껴지는
  // 환경이라 이 부분이 스크롤 중 rAF 프레임 예산에 실제로 영향을 준다.
  // (다음 줄의 eslint-disable: react-hooks/preserve-manual-memoization은
  // "React Compiler가 자동으로 이 메모를 다시 만들 수 있는가"를 정적으로
  // 검사하는 미래 대비용 규칙이다 — 이 프로젝트는 next.config.ts에 React
  // Compiler를 켜지 않았으므로 실제 빌드에는 영향이 없다. 이 규칙이
  // t()로 얻은 문자열을 "언제든 바뀔 수 있는 값"으로 보수적으로 취급해서
  // 오탐하는데, 실제로는 useT()가 반환하는 t 함수 자체가
  // lib/locale-context.tsx에서 `useMemo(..., [locale])`로 고정돼 있어
  // locale이 바뀔 때만 새 참조가 되고, 그 결과인 문자열들도 그때만
  // 실제로 바뀐다 — 정적 분석기가 알 수 없는 이 상위 계약을 직접 확인하고
  // 의도적으로 끈다.
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const mailGmailReadingPaneContent = useMemo(
    () => (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-stitch-border px-5 py-3 text-secondary sm:px-6">
          <MaterialIcon name="inbox" size={16} />
          <span className="text-[12px] font-[500]">{inboxTag}</span>
          <span className="ml-auto flex items-center gap-3">
            <MaterialIcon name="archive" size={16} />
            <MaterialIcon name="delete" size={16} />
          </span>
        </div>

        <div className="flex-1 overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
          <h3 className="mb-4 text-[20px] leading-[1.35] font-[500] tracking-tight text-stitch-ink sm:text-[24px]">
            {mailSubject}
          </h3>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-navy text-[14px] font-[500] text-white">
              {companyInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-[500] text-stitch-ink">{companyName}</p>
              <p className="truncate text-[12px] text-secondary">{senderEmail}</p>
            </div>
            <span className="shrink-0 text-[11px] text-secondary">{receivedAt}</span>
          </div>

          <p className="mb-4 text-[12px] text-secondary">{recipientTo}</p>

          <div className="space-y-4 text-[14px] leading-[1.8] text-stitch-ink sm:text-[15px]">
            <p>{recipientLine}</p>
            <p>{greetingLine}</p>
            <p>{senderLine}</p>
            <p>{thanksLine}</p>
            <p>{bodyLine}</p>
            <p>{datetimeLine}</p>
            <p>{formatLine}</p>
            {/* 준비/주의사항 3줄(Meet URL 안내·이력서 준비·회신 마감)을
                안쪽 space-y-1.5로 서로 붙여, 위아래 다른 문장들과는
                바깥 space-y-4로 분리되게 해서 하나의 문단처럼
                구분되어 읽히게 했다. */}
            <div className="space-y-1.5">
              <p>{meetUrlLine}</p>
              <p>{prepLine}</p>
              <p>{deadlineLine}</p>
            </div>
            <p>{closingLine}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-stitch-border px-5 py-3 text-[12px] font-[500] text-secondary sm:px-6">
          <span className="flex items-center gap-1">
            <MaterialIcon name="reply" size={14} />
            {reply}
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="reply_all" size={14} />
            {replyAll}
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="forward" size={14} />
            {forward}
          </span>
        </div>
      </div>
    ),
    [
      inboxTag,
      mailSubject,
      companyName,
      companyInitial,
      senderEmail,
      receivedAt,
      recipientTo,
      recipientLine,
      greetingLine,
      senderLine,
      thanksLine,
      bodyLine,
      datetimeLine,
      formatLine,
      meetUrlLine,
      prepLine,
      deadlineLine,
      closingLine,
      reply,
      replyAll,
      forward,
    ],
  );

  const mailDrawerBodyContent = useMemo(
    () => (
      <>
        <h3 className="mb-5 text-[24px] font-[500] tracking-tight text-stitch-ink">{t("aiEmail.paste.title")}</h3>

        <div className="mb-5 rounded-stitch-2xl border border-stitch-border bg-stitch-bg p-5">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-[500] text-secondary">
            <MaterialIcon name="info" size={16} />
            {t("aiEmail.paste.infoTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {EXTRACT_FIELD_KEYS.map((key) => (
              <span key={key} className="rounded-full border border-stitch-border bg-white px-3 py-1 text-[11px] text-stitch-ink">
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <p className="px-1 text-[13px] font-[500] text-stitch-ink">{t("aiEmail.paste.label")}</p>
          <div className="min-h-0 flex-1 space-y-1 overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white p-4 text-[13px] leading-[1.5] text-stitch-ink">
            <p className="mb-2 font-[500]">{mailSubject}</p>
            <p>{recipientLine}</p>
            <p>{greetingLine}</p>
            <p>{senderLine}</p>
            <p>{thanksLine}</p>
            <p>{bodyLine}</p>
            <p>{datetimeLine}</p>
            <p>{formatLine}</p>
            <div className="space-y-1">
              <p>{meetUrlLine}</p>
              <p>{prepLine}</p>
              <p>{deadlineLine}</p>
            </div>
            <p>{closingLine}</p>
          </div>
        </div>
      </>
    ),
    [
      t,
      mailSubject,
      recipientLine,
      greetingLine,
      senderLine,
      thanksLine,
      bodyLine,
      datetimeLine,
      formatLine,
      meetUrlLine,
      prepLine,
      deadlineLine,
      closingLine,
    ],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const scaleT = rampIn(progress, SCALE_IN[0], SCALE_IN[1]);
  const sceneScale = SCENE_SCALE_FROM + (SCENE_SCALE_TO - SCENE_SCALE_FROM) * scaleT;
  // 55차: progress=1(스크롤 완료) 상태에서 카드 4가 오른쪽 viewport 밖으로
  // 잘리는 문제 수정. 원인은 이 stage(mx-auto, max-width) 박스 "다음"에
  // 별도 <div style={{transform:`scale(${sceneScale})`}}>가 한 번 더
  // 씌워져 있던 구조 — transform:scale은 레이아웃(부모의 overflow 계산)에는
  // 반영되지 않는 "그리기 전용" 확대라, stage 박스 자체는 정확히 92vw로
  // mx-auto 중앙정렬되지만 그 안의 내용은 3%(sceneScale 최대 1.03) 더 크게
  // "그려지기만" 해서 stage 박스의 좌우 경계를 벗어난다. 뷰폭이 넓을 땐 이
  // 오버플로가 padding(px-6/md:px-12) 안에 흡수돼 안 보이지만, 안 그래도
  // stage 자체가 padding 여유를 다 써버리는 좁은 화면에서는 이 3%가 그대로
  // 오른쪽 뷰포트 경계를 넘어 카드 4가 잘린다. 고침: 별도 transform 레이어를
  // 없애고 sceneScale을 stageWidthVw 자체에 곱해 넣어 "확대"를 처음부터
  // 진짜 레이아웃 너비로 반영한다 — 그러면 mx-auto가 항상 실제 렌더 크기를
  // 기준으로 중앙정렬하므로 어떤 뷰포트 폭에서도 절대 넘치지 않는다. 매
  // scaleT 값에서 나오는 최종 px 폭은 예전 방식(레이아웃 폭 × paint-scale)과
  // 수학적으로 완전히 동일해 카드 크기·Y stagger·line/gradient·스크롤
  // 타이밍(SCALE_IN)은 전혀 안 바뀐다 — "그리는 방식"만 안전하게 바꿨다.
  const stageWidthVw = (STAGE_WIDTH_FROM_VW + (STAGE_WIDTH_TO_VW - STAGE_WIDTH_FROM_VW) * scaleT) * sceneScale;
  const sceneMinHeightVh = SCENE_MIN_HEIGHT_FROM_VH + (SCENE_MIN_HEIGHT_TO_VH - SCENE_MIN_HEIGHT_FROM_VH) * scaleT;

  const mailResizeT = rampIn(progress, MAIL_RESIZE_IN[0], MAIL_RESIZE_IN[1]);
  const mailCardWidthPercent =
    MAIL_CARD_WIDTH_FROM_PERCENT + (MAIL_CARD_WIDTH_TO_PERCENT - MAIL_CARD_WIDTH_FROM_PERCENT) * mailResizeT;
  // 카드 1 전용 스케일 — rest(mailResizeT=0)에선 MAIL_REST_SCALE(확대),
  // 스크롤이 끝나면(mailResizeT=1) 다른 카드들과 동일한 CARD_SCALE로
  // 수렴한다. 카드 2~4는 이 값과 무관하게 항상 CARD_SCALE 그대로다.
  const mailCardScale = MAIL_REST_SCALE + (CARD_SCALE - MAIL_REST_SCALE) * mailResizeT;
  // 카드 1의 바깥 wrapper가 예약하는 높이도 이 스케일에 맞춰 커진다 —
  // 안 그러면 확대된 내용이 고정 높이(CARD_HEIGHT_VH)의 overflow-hidden
  // 박스에 중간에서 잘린다. mailResizeT=1이 되면 다른 카드와 같은
  // CARD_HEIGHT_VH로 정확히 되돌아온다.
  const mailCardHeightVh = CARD_CONTENT_HEIGHT_VH * mailCardScale;
  // 첫 화면 전용 데스크톱 chrome(검색바/사이드바)의 남은 정도. 카드가 줄어들기
  // 시작하면(mailResizeT 증가) 곧바로 줄어들어 MAIL_RESIZE_IN 끝에서 0이 된다.
  const restChromeT = 1 - mailResizeT;

  const aiCardT = rampIn(progress, AI_ANALYZING_IN[0], AI_ANALYZING_IN[1]);
  const aiCardOpacity = aiCardT;
  const aiCardWidthPercent = AI_CARD_WIDTH_TO_PERCENT * aiCardT;
  const aiContentOpacity = rampIn(progress, AI_CONTENT_IN[0], AI_CONTENT_IN[1]);

  const extractCardT = rampIn(progress, EXTRACT_IN[0], EXTRACT_IN[1]);
  const extractCardOpacity = extractCardT;
  const extractCardWidthPercent = EXTRACT_CARD_WIDTH_TO_PERCENT * extractCardT;
  const extractContentOpacity = rampIn(progress, EXTRACT_CONTENT_IN[0], EXTRACT_CONTENT_IN[1]);

  const fourthCardT = rampIn(progress, FOURTH_IN[0], FOURTH_IN[1]);
  const fourthCardOpacity = fourthCardT;
  const fourthCardWidthPercent = FOURTH_CARD_WIDTH_TO_PERCENT * fourthCardT;
  const fourthContentOpacity = rampIn(progress, FOURTH_CONTENT_IN[0], FOURTH_CONTENT_IN[1]);

  // Workflow line — 카드 4개를 "하나의 AI 처리 흐름"처럼 잇는 라인.
  // 45차부터는 flex row가 아니라 각 카드를 absolute left/top으로 직접
  // 배치한다(레퍼런스처럼 카드마다 독립적인 X/Y를 가지려면 flex의 자동
  // 정렬로는 한계가 있었다). DOM 측정(ref/getBoundingClientRect) 없이
  // 카드 폭 + WORKFLOW_GAP_PCT_APPROX만으로 각 카드의 left%를 누적
  // 계산하는 방식 자체는 이전과 동일 — 여기서는 각 카드의 "왼쪽 끝" leftX를
  // 직접 구해서 그 카드 wrapper의 style.left로 그대로 쓴다.
  const w1 = mailCardWidthPercent;
  const w2 = aiCardT > 0 ? aiCardWidthPercent : 0;
  const w3 = extractCardT > 0 ? extractCardWidthPercent : 0;
  const w4 = fourthCardT > 0 ? fourthCardWidthPercent : 0;
  const mountedCount = [w1, w2, w3, w4].filter((w) => w > 0).length;
  const gapsTotalPct = (mountedCount - 1) * WORKFLOW_GAP_PCT_APPROX;
  const rowStartX = (100 - (w1 + w2 + w3 + w4 + gapsTotalPct)) / 2;

  let cursorX = rowStartX;
  const leftX1 = cursorX;
  cursorX += w1;

  let leftX2: number | null = null;
  if (w2 > 0) {
    cursorX += WORKFLOW_GAP_PCT_APPROX;
    leftX2 = cursorX;
    cursorX += w2;
  }

  let leftX3: number | null = null;
  if (w3 > 0) {
    cursorX += WORKFLOW_GAP_PCT_APPROX;
    leftX3 = cursorX;
    cursorX += w3;
  }

  let leftX4: number | null = null;
  if (w4 > 0) {
    cursorX += WORKFLOW_GAP_PCT_APPROX;
    leftX4 = cursorX;
  }

  // 각 카드의 "진입 node" — 카드 "중심"이 아니라 라벨(숫자 원)의 중심에
  // 맞춘다(레퍼런스처럼 line이 카드 좌상단/라벨 쪽을 지나가게). Y는 라벨
  // zone 바로 아래, 카드 상단 모서리 옆 지점 — 라벨은 이 지점 바로 위
  // 캡션처럼 놓이고, line은 라벨 원 자체를 관통하지 않는다.
  const nodeY = [
    LABEL_ZONE_HEIGHT + CARD_Y_OFFSET[0],
    LABEL_ZONE_HEIGHT + CARD_Y_OFFSET[1],
    LABEL_ZONE_HEIGHT + CARD_Y_OFFSET[2],
    LABEL_ZONE_HEIGHT + CARD_Y_OFFSET[3],
  ];
  const n1x = leftX1 + LABEL_CIRCLE_CENTER_INSET_PCT;
  const n2x = leftX2 !== null ? leftX2 + LABEL_CIRCLE_CENTER_INSET_PCT : null;
  const n3x = leftX3 !== null ? leftX3 + LABEL_CIRCLE_CENTER_INSET_PCT : null;
  const n4x = leftX4 !== null ? leftX4 + LABEL_CIRCLE_CENTER_INSET_PCT : null;

  const nodePoints: { x: number; y: number }[] = [{ x: n1x, y: nodeY[0] }];
  if (n2x !== null) nodePoints.push({ x: n2x, y: nodeY[1] });
  if (n3x !== null) nodePoints.push({ x: n3x, y: nodeY[2] });
  if (n4x !== null) nodePoints.push({ x: n4x, y: nodeY[3] });

  // 각 구간마다 카드 사이 빈 공간(gap)을 실제로 통과하도록, "카드 node →
  // (gap 한가운데, WORKFLOW_DIP_DEPTH만큼 깊은 지점) → 다음 카드 node" 순서로
  // 절반씩 두 개의 S자 곡선을 이어붙인다 — 각 절반은 표준적인(양쪽 제어점이
  // 구간 중간 X에 있는) S자라 절반의 t=0.5 지점이 정확히 그 절반 시작/끝의
  // 기하 중점이 되지만, 우리가 실제로 필요한 건 "두 절반이 만나는 지점"
  // (=dip point) 자체이므로 그 좌표를 직접 path에 명시해 곡선이 정확히
  // 그 점을 지나가게 한다(카드 top 높이의 얇은 띠에 갇히지 않고 화면
  // 세로 공간을 실제로 쓰게 됨 — "카드 사이 빈 공간을 curve로 통과").
  // 56차: 이전엔 progress(0~1)를 그대로 pathLength 기반 stroke-dashoffset에
  // 써서, 선이 다 그려지려면 progress=1까지 스크롤해야 했다 — "4번 카드는
  // 훨씬 빨리(progress 0.74) 다 나타나는데 선은 여전히 1.0까지 기다려야
  // 다 그려진다"는 불일치가 생겨, line draw/node 타이밍도 카드 등장에 맞춰
  // 앞당겼다. FOURTH_IN 끝(0.74)과 같은 지점에서 다 그려지도록
  // lineDrawT = rampIn(progress, 0, 0.74)를 만들어 그 값으로 offset을
  // 계산한다 — 카드 4의 node(원)가 거의 다 보이는 시점에 선도 정확히
  // 그 node까지 이어져 있어야 자연스럽기 때문. 각 node 자체의 활성화
  // (원의 opacity)는 이미 각 카드의 T값(mailResizeT/aiCardOpacity/
  // extractCardOpacity/fourthCardOpacity)에 묶여 있어, 위 네 구간을
  // 앞당긴 것만으로 자동으로 같이 앞당겨진다.
  const lineDrawT = rampIn(progress, 0, FOURTH_IN[1]);
  let workflowPath = "";
  const midPoints: { x: number; y: number; opacity: number }[] = [];
  if (nodePoints.length > 1) {
    workflowPath = `M ${nodePoints[0].x * 10} ${nodePoints[0].y}`;
    for (let i = 1; i < nodePoints.length; i++) {
      const prev = nodePoints[i - 1];
      const cur = nodePoints[i];
      const dipY = Math.max(prev.y, cur.y) + WORKFLOW_DIP_DEPTH[i - 1];
      const dipX = (prev.x + cur.x) / 2;
      const ctrlA = ((prev.x + dipX) / 2) * 10;
      const ctrlB = ((dipX + cur.x) / 2) * 10;
      workflowPath += ` C ${ctrlA} ${prev.y}, ${ctrlA} ${dipY}, ${dipX * 10} ${dipY}`;
      workflowPath += ` C ${ctrlB} ${dipY}, ${ctrlB} ${cur.y}, ${cur.x * 10} ${cur.y}`;

      const opacity = i === 1 ? aiCardOpacity : i === 2 ? extractCardOpacity : fourthCardOpacity;
      midPoints.push({ x: dipX, y: dipY, opacity });
    }
  }

  // 49차: 화면 하단까지 이어지는 ambient path가 "중간에서 잘린 그래픽
  // 오류"처럼 보인다는 피드백 — 원인은 곡선의 진폭(±50px까지)이 SVG 자신의
  // 높이(WORKFLOW_SVG_HEIGHT) 예산을 벗어나 바닥 경계에서 그대로 잘려나갔던
  // 것이었다(예: x=900 지점 Y가 WORKFLOW_SVG_HEIGHT를 14px 넘어서 SVG
  // 자체 clipping에 걸림). 진폭을 훨씬 작게(±3~5px) 줄이고 기준선도 바닥에서
  // 충분히(50px) 띄워, 어떤 지점도 SVG 경계를 벗어나지 않는 "하나의 연속된
  // 완만한 curve"로 다시 그렸다. 좌우 fade-out은 path를 화면 밖으로 밀어
  // 잘라내는 대신 stroke 자체에 alpha gradient(heroWorkflowAmbientGradient)
  // 를 줘서 처리한다 — 그래서 path는 정확히 x=0~1000(뷰포트 전체 폭)만
  // 커버하면 된다.
  const ambientY = WORKFLOW_SVG_HEIGHT - 50;
  const ambientPath = `M 0 ${ambientY - 3} C 260 ${ambientY + 5}, 500 ${ambientY - 5}, 680 ${ambientY} S 900 ${ambientY + 4}, 1000 ${ambientY - 2}`;

  const tiltTransform = `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translate(${tilt.tx}px, ${tilt.ty}px)`;

  return (
    <div className="relative mx-auto" style={{ maxWidth: `${stageWidthVw}vw` }}>
      {/* 52차(Safari 성능): tilt(hover)는 scroll·hover 내내 계속 바뀌는
          transform이라 will-change: transform을 줘서 브라우저가 이 레이어를
          미리 별도 compositing layer로 승격해두게 했다 — 매 프레임 다시
          레이어를 만들지 않고 GPU에서 transform만 갱신하면 되므로 특히
          WebKit에서 효과가 크다. transform/opacity 외의 속성(예: left/width,
          아래 카드들)에는 will-change를 걸지 않았다 — 그런 속성은 애초에
          레이아웃이 필요해 layer 승격만으로 싸지지 않고, will-change
          남용은 GPU 메모리만 쓴다. (55차: scroll에 따른 "확대"는 이전엔
          여기 별도 transform:scale 레이어였는데, stageWidthVw 자체에
          이미 그 배율이 반영되므로 이 레이어는 제거했다 — 자세한 이유는
          위 stageWidthVw 계산부 주석 참고.) */}
        <div
          className="relative transition-transform duration-150 ease-out"
          style={{ transform: tiltTransform, minHeight: `${sceneMinHeightVh}vh`, willChange: "transform" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative w-full">
            {/* 이번 workflow scene 전용 eyebrow+title — 페이지 최상단 Hero
                copy(JOBCAL AI / 취업 메일을...)와는 별개다. 그쪽은 그대로
                두고, 레퍼런스처럼 이 4-card scene 바로 위에 작은 파란
                eyebrow + 큰 제목을 새로 얹었다. mailResizeT에 묶어 rest
                상태(스크롤 전, Gmail 카드 하나만 있는 화면)에서는 안
                보이다가 scene이 펼쳐지는 시점부터 함께 나타난다.
                54차: 원래 이 블록은 row 앞에 오는 "보통 flow" 요소였는데,
                opacity:0인 rest 상태에서도 실제 레이아웃 높이(측정 결과
                약 133px, 자기 높이+마진)를 그대로 차지해서 그 아래 이메일
                카드 전체를 133px만큼 밀어내리고 있었다 — "이메일 UI를 더
                위로/더 많이 보이게" 요청과 정면으로 충돌하는 원인이었다.
                그래서 row의 자식으로 옮기고 absolute + 음수 top(-133px)으로
                바꿨다 — 이제 flow 공간을 전혀 차지하지 않으므로 카드가
                제자리(이 블록이 없었다면 있었을 위치)로 곧바로 올라온다.
                보이는 상태(mailResizeT>0)일 때는 절대좌표 자체가 예전과
                똑같은 지점(01 라벨 바로 위, 40px 여백)을 가리키도록
                맞춰뒀으므로 스크롤된 workflow scene의 실제 모양은 전혀
                안 바뀐다. */}
            <div
              className="absolute top-[-133px] left-0 w-full text-center"
              style={{ opacity: mailResizeT, pointerEvents: mailResizeT < 0.05 ? "none" : "auto", willChange: "opacity" }}
            >
              {/* 47차: 헤드라인이 카드에 비해 존재감이 약하다는 피드백으로
                  제목만 확실히 키웠다(24/30px→34/48px, font-weight 700→800).
                  작은 eyebrow는 "보조 문구" 역할을 유지하라는 요청대로 크기/
                  굵기를 그대로 뒀다 — 시선이 eyebrow(작게) → title(크게) →
                  01~04 → 카드 순으로 자연스럽게 내려가야 하기 때문. */}
              <p className="mb-3 text-[14px] font-[600] text-primary-navy sm:text-[15px]">
                {t("landing.hero.demo.workflowEyebrow")}
              </p>
              <h2 className="text-[34px] leading-[1.2] font-[800] tracking-tight text-stitch-ink sm:text-[48px]">
                {t("landing.hero.demo.workflowTitle")}
              </h2>
            </div>

            {/* Workflow line — 카드 4개를 잇는 보조 연결 요소. 카드보다
                먼저 그리고 z-0로 둬서 카드(z-10) 뒤로 지나가게 하며, glow
                레이어를 더해 은은하게 빛나되(49차: 카드보다 먼저 눈에
                띈다는 피드백으로 두께/밝기를 약 18% 낮춤) line 자체가
                주인공이 아니라 01~04를 연결하는 보조 요소로 보이게 했다. */}
            <svg
              className="pointer-events-none absolute top-0 left-0 z-0 w-full"
              style={{ height: `${WORKFLOW_SVG_HEIGHT}px` }}
              viewBox={`0 0 1000 ${WORKFLOW_SVG_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                {/* 레퍼런스처럼 blue → cyan → success green으로 흐르는 그라데이션.
                    채도는 JobCal 팔레트(navy/success) 안에서만 움직여 과한
                    neon이 되지 않게 했다. */}
                <linearGradient id="heroWorkflowLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="42%" stopColor="#2563eb" />
                  <stop offset="75%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                {/* ambient line 전용 — 색 흐름은 메인 line과 같지만, 양 끝
                    stop의 stop-opacity를 0으로 둬서 좌우 끝에서 화면 밖으로
                    잘려나가는 대신 stroke 자체가 자연스럽게 옅어지며
                    사라지게 한다. */}
                <linearGradient id="heroWorkflowAmbientGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0" />
                  <stop offset="14%" stopColor="#1e3a8a" stopOpacity="1" />
                  <stop offset="55%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="86%" stopColor="#10b981" stopOpacity="1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                {/* 52차(Safari 성능): 이전엔 feGaussianBlur로 line/node의
                    "glow"를 만들었는데, WebKit(Safari)은 애니메이션 중인
                    SVG filter(특히 매 프레임 path의 d가 바뀌는 이 line처럼
                    형태 자체가 계속 바뀌는 대상에 건 blur)를 다시 계산하는
                    비용이 커서 스크롤 중 프레임이 끊기는 원인 중 하나였다.
                    시각적으로는 거의 동일하되 훨씬 싸게 렌더링되는 두 가지
                    기법으로 전부 교체했다:
                    (1) line의 "번짐"은 blur 대신 같은 path를 두께/opacity만
                        다르게 여러 겹 겹쳐 그리는 방식(아래 각 path 3중 스택)
                        — blur는 GPU가 매 프레임 다시 합성해야 하는 후처리
                        필터지만, 겹쳐진 stroke는 그냥 파란색 그대로 여러 번
                        그리는(fill) 것과 비용이 같아 Skia/CoreGraphics 둘 다
                        훨씬 가볍다.
                    (2) node(원)의 "후광"은 blur 대신 radialGradient fill로
                        교체 — 중심에서 가장자리로 opacity가 0까지 자연스럽게
                        빠지는 그라데이션은 blur와 결과가 거의 같아 보이지만
                        post-process 없이 단순 paint 한 번으로 끝난다. */}
                <radialGradient id="heroGlowBlue" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heroGlowGreen" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* 화면 하단까지 이어지는 ambient path — 카드/line과 무관하게
                  항상 은은히 흐르는 아주 얇은 장식용 curve. 메인 line보다
                  훨씬 얇고 옅어서 "주인공"이 아니라 배경 장식으로만 읽히게
                  했다. blur 대신 얇은 겹침 2겹으로 은은한 가장자리를 낸다. */}
              <path
                d={ambientPath}
                fill="none"
                stroke="url(#heroWorkflowAmbientGradient)"
                strokeWidth="9"
                strokeLinecap="round"
                opacity={(0.08 + fourthCardOpacity * 0.05) * 0.4}
              />
              <path
                d={ambientPath}
                fill="none"
                stroke="url(#heroWorkflowAmbientGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity={(0.08 + fourthCardOpacity * 0.05) * 0.85}
              />
              {workflowPath && (
                <>
                  {/* 49차: line이 카드보다 먼저 보인다는 피드백으로 두께/
                      밝기를 약 18% 낮췄다 — 색 흐름 자체는 그대로 두고
                      "주인공"이 아니라 4단계를 잇는 보조 요소로 존재감만
                      낮췄다. 52차: blur 레이어 1장 대신 opacity가 다른
                      stroke 3겹(바깥→안쪽으로 점점 얇고 진하게)을 겹쳐
                      비슷한 "번짐" 인상을 filter 없이 낸다. */}
                  <path
                    d={workflowPath}
                    fill="none"
                    stroke="url(#heroWorkflowLineGradient)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    pathLength={1000}
                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 * (1 - lineDrawT), opacity: 0.14 }}
                  />
                  <path
                    d={workflowPath}
                    fill="none"
                    stroke="url(#heroWorkflowLineGradient)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    pathLength={1000}
                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 * (1 - lineDrawT), opacity: 0.22 }}
                  />
                  <path
                    d={workflowPath}
                    fill="none"
                    stroke="url(#heroWorkflowLineGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength={1000}
                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 * (1 - lineDrawT) }}
                  />
                </>
              )}
              {/* 라벨(숫자 원) 바로 아래에서 진입 node까지 이어지는 짧은
                  vertical connection — 레퍼런스처럼 라벨이 line의 진입점에
                  매달린 것처럼 보이게 하는 연결선. 원 자체 높이(56px)만큼만
                  내려온다. */}
              <line
                x1={n1x * 10}
                y1={CARD_Y_OFFSET[0] + 56}
                x2={n1x * 10}
                y2={nodeY[0]}
                stroke="#1e3a8a"
                strokeWidth="1.7"
                strokeLinecap="round"
                opacity={mailResizeT * 0.6}
              />
              {n2x !== null && (
                <line
                  x1={n2x * 10}
                  y1={CARD_Y_OFFSET[1] + 56}
                  x2={n2x * 10}
                  y2={nodeY[1]}
                  stroke="#2563eb"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  opacity={aiCardOpacity * 0.6}
                />
              )}
              {n3x !== null && (
                <line
                  x1={n3x * 10}
                  y1={CARD_Y_OFFSET[2] + 56}
                  x2={n3x * 10}
                  y2={nodeY[2]}
                  stroke="#22d3ee"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  opacity={extractCardOpacity * 0.6}
                />
              )}
              {n4x !== null && (
                <line
                  x1={n4x * 10}
                  y1={CARD_Y_OFFSET[3] + 56}
                  x2={n4x * 10}
                  y2={nodeY[3]}
                  stroke="#10b981"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  opacity={fourthCardOpacity * 0.6}
                />
              )}
              {/* 카드 사이 gap 한가운데, line이 가장 깊이 처지는 지점의 node —
                  카드 뒤에 숨지 않고 빈 공간 안에 그대로 드러나므로 은은한
                  glow와 함께 또렷하게 보이도록 진입 node보다 크게 뒀다. */}
              {midPoints.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x * 10} cy={p.y} r="10.8" fill="url(#heroGlowBlue)" opacity={p.opacity * 0.55} />
                  <circle cx={p.x * 10} cy={p.y} r="4.6" fill="#38bdf8" opacity={p.opacity * 0.85} />
                </g>
              ))}
              {/* 마지막 카드에만 아주 옅은 success 후광(등록 완료를 은은하게 강조) */}
              {n4x !== null && (
                <circle cx={n4x * 10} cy={nodeY[3]} r="14" fill="url(#heroGlowGreen)" opacity={fourthCardOpacity * 0.35} />
              )}
              <circle cx={n1x * 10} cy={nodeY[0]} r="4.2" fill="#1e3a8a" opacity={mailResizeT} />
              {n2x !== null && <circle cx={n2x * 10} cy={nodeY[1]} r="4.2" fill="#2563eb" opacity={aiCardOpacity} />}
              {n3x !== null && <circle cx={n3x * 10} cy={nodeY[2]} r="4.2" fill="#22d3ee" opacity={extractCardOpacity} />}
              {n4x !== null && (
                <circle cx={n4x * 10} cy={nodeY[3]} r="4.6" fill="#10b981" opacity={fourthCardOpacity} />
              )}
            </svg>

            {/* 메일 입력(Gmail 스타일 채용 메일 읽기 화면). 50차: width/left/
                top에 걸려있던 CSS transition(duration-150)을 제거했다 —
                progress 자체가 이제 부모(LandingHero)의 rAF 보간으로 이미
                매 프레임 부드럽게 움직이므로, 여기에 또 CSS transition을
                얹으면 "보간 위에 또 보간"이 겹쳐 스크롤을 멈춘 뒤에도
                150ms를 더 끌려오는 이중 지연이 생긴다. 스무딩은 이제
                한 곳(부모의 rAF 루프)에서만 담당한다. */}
            <div
              className="absolute z-10 flex flex-col items-start"
              style={{ width: `${mailCardWidthPercent}%`, left: `${leftX1}%`, top: `${CARD_Y_OFFSET[0]}px` }}
            >
              {/* 54차: 카드 1의 "01" 라벨(renderStageLabel)도 rest 상태에서
                  opacity:0으로 안 보이지만, flex-col 흐름 안에 있어서 자기
                  높이(측정 결과 약 123px, LABEL_ZONE_HEIGHT와 거의 동일)만큼
                  카드 박스를 계속 아래로 밀어내고 있었다 — 위 workflow
                  eyebrow+title과 같은 종류의 "안 보이는데 자리는 차지하는"
                  문제. 이 라벨을 absolute로 완전히 빼는 대신, 높이 자체를
                  LABEL_ZONE_HEIGHT * mailResizeT로 보간되는 래퍼로 감쌌다 —
                  rest(mailResizeT=0)에선 높이 0으로 접혀 카드가 바로
                  시작되고, 스크롤로 mailResizeT가 1에 가까워지면 원래
                  라벨이 차지하던 만큼(LABEL_ZONE_HEIGHT) 다시 벌어져 스크롤
                  완료 상태의 라벨-카드 간격은 이전과 동일하게 돌아온다. */}
              <div style={{ height: `${LABEL_ZONE_HEIGHT * mailResizeT}px`, overflow: "hidden" }}>
                {renderStageLabel(0, mailResizeT)}
              </div>
              {/* 53차: 카드 1만 mailCardScale/mailCardHeightVh(위에서 계산,
                  rest에선 확대·스크롤하면 다른 카드와 같은 CARD_SCALE로
                  수렴)를 쓴다 — 카드 2~4는 그대로 CARD_SCALE/CARD_HEIGHT_VH
                  상수를 쓰므로 이 변경의 영향을 받지 않는다. */}
              <div className="w-full overflow-hidden rounded-stitch-2xl" style={{ height: `${mailCardHeightVh}vh` }}>
              <div
                className="flex flex-col overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white text-left shadow-[0_20px_45px_rgba(30,58,138,0.12)]"
                style={{
                  width: `${100 / mailCardScale}%`,
                  height: `${CARD_CONTENT_HEIGHT_VH}vh`,
                  transform: `scale(${mailCardScale}) rotate(${CARD_ROTATE_DEG[0]}deg)`,
                  transformOrigin: "top left",
                }}
              >
              {/* 상단 검색바 — 첫 화면 전용, restChromeT와 함께 사라짐 */}
              <div className="shrink-0 overflow-hidden" style={{ height: `${44 * restChromeT}px` }}>
                <div
                  className="flex items-center gap-3 border-b border-stitch-border px-5 py-3 sm:px-6"
                  style={{ opacity: restChromeT }}
                >
                  <MaterialIcon name="search" size={16} className="shrink-0 text-secondary" />
                  <span className="h-2 flex-1 rounded-full bg-stitch-bg" aria-hidden="true" />
                  <MaterialIcon name="apps" size={16} className="shrink-0 text-secondary" />
                </div>
              </div>

              <div className="relative min-h-0 flex-1">
                {/* GMAIL 레이어 — 첫 화면 그대로(사이드바+받은편지함 툴바+본문+
                    답장 액션, 전혀 안 바꿈), restChromeT로 사라짐. */}
                <div className="absolute inset-0 flex" style={{ opacity: restChromeT }}>
                  <div className="shrink-0 overflow-hidden" style={{ width: `${56 * restChromeT}px` }}>
                    <div className="flex h-full w-14 flex-col items-center gap-4 border-r border-stitch-border py-5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-navy text-white">
                        <MaterialIcon name="edit" size={16} />
                      </span>
                      <MaterialIcon name="inbox" size={18} filled className="shrink-0 text-primary-navy" />
                      <MaterialIcon name="send" size={18} className="shrink-0 text-secondary" />
                      <MaterialIcon name="drafts" size={18} className="shrink-0 text-secondary" />
                    </div>
                  </div>

                  {mailGmailReadingPaneContent}
                </div>

                {/* DRAWER 레이어 — 실제 EmailPasteForm(AI Drawer 1단계 "메일
                    입력") 그대로. mailResizeT로 나타난다. 메일 본문은 이미
                    붙여넣어진 상태로 보여야 하므로 Gmail 카드와 같은 메일 텍스트를
                    그대로 재사용. */}
                <div
                  className="absolute inset-0 flex flex-col overflow-hidden px-5 py-5 sm:px-6 sm:py-6"
                  style={{ opacity: mailResizeT }}
                >
                  {renderDrawerHeader()}
                  {mailDrawerBodyContent}
                </div>
              </div>
            </div>
            </div>
            </div>

            {/* AI 분석 카드 — 실제 EmailPasteForm의 loading 상태 재현. 메일 카드가
                자리 잡은 뒤 폭이 0→21%로 자라나며 fade-in한다(=오른쪽에서 나타나는
                효과를 flex row 재중앙으로 구현). progress=0(aiCardT===0)일 때는
                DOM에서 아예 빼서, padding 때문에 width:0%로도 완전히 0px가 되지
                않는 "유령 박스"가 flex row 중앙 정렬을 미세하게 틀어뜨리는 것을
                막았다 — 초기 화면엔 메일 카드 하나만 있어야 하기 때문. */}
            {aiCardT > 0 && (
              <div
                className="absolute z-10 flex flex-col items-start"
                style={{
                  width: `${aiCardWidthPercent}%`,
                  opacity: aiCardOpacity,
                  left: `${leftX2 ?? 0}%`,
                  top: `${CARD_Y_OFFSET[1]}px`,
                  // 50차: opacity(카드 등장)와 함께 아주 살짝(최대 8px)
                  // 아래에서 떠오르며 자리 잡는 subtle translate를 더했다 —
                  // "카드 이동량은 작게, opacity+translate 중심" 요청 반영.
                  // 폭 성장(0→최종%) 자체는 그대로 두되(레이아웃/디자인
                  // 불변), 그 위에 얹는 보조적인 모션 큐다.
                  transform: `translateY(${(1 - aiCardT) * 8}px)`,
                  willChange: "transform, opacity",
                }}
              >
                {renderStageLabel(1, aiCardOpacity)}
                <div className="w-full overflow-hidden rounded-stitch-2xl" style={{ height: `${CARD_HEIGHT_VH}vh` }}>
                <div
                  className="flex flex-col overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white p-6 text-left shadow-[0_20px_45px_rgba(30,58,138,0.12)] sm:p-8"
                  style={{
                    width: `${100 / CARD_SCALE}%`,
                    height: `${CARD_CONTENT_HEIGHT_VH}vh`,
                    transform: `scale(${CARD_SCALE}) rotate(${CARD_ROTATE_DEG[1]}deg)`,
                    transformOrigin: "top left",
                  }}
                >
                {renderDrawerHeader()}

                <div className="flex flex-1 flex-col gap-3 overflow-hidden" style={{ opacity: aiContentOpacity }}>
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-navy/10 text-primary-navy">
                      <MaterialIcon name="progress_activity" size={28} className="animate-spin" />
                    </span>
                    <h2 className="mt-2 text-[16px] font-[500] text-stitch-ink">
                      {t("aiEmail.paste.analyzingTitle")}
                    </h2>
                    <p className="text-[13px] text-secondary">{t("aiEmail.paste.analyzingDescription")}</p>
                    <p className="mt-4 text-[12px] text-secondary">{t("aiEmail.paste.analyzingEstimate")}</p>
                  </div>

                  {/* EmailPasteForm의 "AI가 추출할 정보" 안내 박스 그대로 —
                      로딩 중에도 무엇을 뽑아내고 있는지 보여주는 진행감 요소. */}
                  <div className="rounded-stitch-2xl border border-stitch-border bg-stitch-bg p-6">
                    <p className="mb-3 flex items-center gap-2 text-[13px] font-[500] text-secondary">
                      <MaterialIcon name="info" size={16} />
                      {t("aiEmail.paste.infoTitle")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXTRACT_FIELD_KEYS.map((key) => (
                        <span
                          key={key}
                          className="rounded-full border border-stitch-border bg-white px-3 py-1 text-[11px] text-stitch-ink"
                        >
                          {t(key)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                </div>
                </div>
              </div>
            )}

            {/* 정보 추출 카드 — 실제 CompanyMatchPicker의 label+연한 배경 필드
                스타일 재현. AI 카드와 완전히 같은 패턴(폭 0→21% 성장 + opacity로
                fade-in, progress=0일 때 마운트 안 함, 텍스트는 별도 구간으로
                늦춤)으로 그 뒤에 이어 등장한다. */}
            {extractCardT > 0 && (
              <div
                className="absolute z-10 flex flex-col items-start"
                style={{
                  width: `${extractCardWidthPercent}%`,
                  opacity: extractCardOpacity,
                  left: `${leftX3 ?? 0}%`,
                  top: `${CARD_Y_OFFSET[2]}px`,
                  transform: `translateY(${(1 - extractCardT) * 8}px)`,
                  willChange: "transform, opacity",
                }}
              >
                {renderStageLabel(2, extractCardOpacity)}
                <div className="w-full overflow-hidden rounded-stitch-2xl" style={{ height: `${CARD_HEIGHT_VH}vh` }}>
                <div
                  className="flex flex-col overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white p-6 text-left shadow-[0_20px_45px_rgba(30,58,138,0.12)] sm:p-8"
                  style={{
                    width: `${100 / CARD_SCALE}%`,
                    height: `${CARD_CONTENT_HEIGHT_VH}vh`,
                    transform: `scale(${CARD_SCALE}) rotate(${CARD_ROTATE_DEG[2]}deg)`,
                    transformOrigin: "top left",
                  }}
                >
                {renderDrawerHeader()}

                <div
                  className="flex flex-1 flex-col overflow-hidden"
                  style={{ opacity: extractContentOpacity }}
                >
                  <h3 className="mb-8 text-[24px] font-[500] tracking-tight whitespace-nowrap text-stitch-ink">
                    {extractTitle}
                  </h3>

                  <div className="flex flex-1 flex-col gap-4 overflow-hidden">
                    <div className="rounded-stitch-2xl bg-stitch-bg px-6 py-3">
                      <p className="flex items-center gap-2 text-[12px] text-secondary">
                        <MaterialIcon name="info" size={16} />
                        {t("aiEmail.review.newCompanyBanner")}
                      </p>
                    </div>

                    {/* 주요 필드 3개 — 카드 폭은 넓지만 세로 padding/높이는
                        한 번 더 줄여(py-3→py-2.5) 더 얇게 했다. 그만큼 줄어든
                        공간이 flex-1인 메모 영역으로 그대로 흡수돼 메모가
                        커진다(실측 약 10~15% 증가). 라벨-값 간격(space-y-1.5)은
                        그대로 뒀다 — 함께 좁히면 메모 증가폭이 목표보다
                        커졌다. */}
                    <div className="space-y-1.5">
                      <p className="px-2 text-[13px] font-[500] text-stitch-ink">{fieldCompanyLabel}</p>
                      <div className="w-full rounded-full border border-stitch-border bg-white px-5 py-2.5 text-[16px] text-stitch-ink">
                        {companyName}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="px-2 text-[13px] font-[500] text-stitch-ink">{fieldStepStageLabel}</p>
                      <div className="w-full rounded-full border border-stitch-border bg-white px-5 py-2.5 text-[16px] text-stitch-ink">
                        {step}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="px-2 text-[13px] font-[500] text-stitch-ink">{fieldDateTimeLabel}</p>
                      <div className="w-full rounded-full border border-stitch-border bg-white px-5 py-2.5 text-[16px] text-stitch-ink">
                        {dateTime}
                      </div>
                    </div>

                    {/* 메모 — 담당자/형식 필드를 없애는 대신, 메일에서 별도
                        필드로 구조화되지 않은 나머지 중요 정보(형식+Google Meet
                        안내 시점+준비물+일정변경 마감)를 AI가 정리한 것처럼
                        보여준다. 다른 필드와 달리 rounded-full pill이 아니라
                        실제 메일 본문 미리보기 박스와 같은 rounded-stitch-2xl
                        멀티라인 박스를 쓰고, flex-1로 남은 세로 공간을 전부
                        차지해 "확실히 큰 영역"이 되게 했다 — 카드 안 스크롤은
                        만들지 않고 overflow-hidden으로 넘치면 잘리게만 둔다. */}
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                      <p className="px-2 text-[13px] font-[500] text-stitch-ink">{fieldMemoLabel}</p>
                      <div className="min-h-0 flex-1 overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white p-5 text-[14px] leading-[1.7] text-stitch-ink">
                        {memoNote}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                </div>
              </div>
            )}

            {/* 등록 완료 카드 — 실제 AiMailDrawer의 success 화면(체크 원 +
                제목) 그대로. 정보 추출 카드와 완전히 같은 패턴으로 그 뒤에
                이어 등장한다. */}
            {fourthCardT > 0 && (
              <div
                className="absolute z-10 flex flex-col items-start"
                style={{
                  width: `${fourthCardWidthPercent}%`,
                  opacity: fourthCardOpacity,
                  left: `${leftX4 ?? 0}%`,
                  top: `${CARD_Y_OFFSET[3]}px`,
                  transform: `translateY(${(1 - fourthCardT) * 8}px)`,
                  willChange: "transform, opacity",
                }}
              >
                {renderStageLabel(3, fourthCardOpacity)}
                <div className="w-full overflow-hidden rounded-stitch-2xl" style={{ height: `${CARD_HEIGHT_VH}vh` }}>
                <div
                  className="flex flex-col overflow-hidden rounded-stitch-2xl border border-stitch-border bg-white p-6 text-left shadow-[0_20px_45px_rgba(30,58,138,0.12)] sm:p-8"
                  style={{
                    width: `${100 / CARD_SCALE}%`,
                    height: `${CARD_CONTENT_HEIGHT_VH}vh`,
                    transform: `scale(${CARD_SCALE}) rotate(${CARD_ROTATE_DEG[3]}deg)`,
                    transformOrigin: "top left",
                  }}
                >
                {renderDrawerHeader()}

                <div
                  className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
                  style={{ opacity: fourthContentOpacity }}
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-success/10">
                    <MaterialIcon name="check_circle" size={48} filled className="text-success" />
                  </div>
                  <h3 className="text-[33px] font-[500] tracking-tight text-stitch-ink">{completeTitle}</h3>
                  <div className="space-y-1">
                    <p className="text-[19px] text-secondary">{companyName}</p>
                    <p className="text-[19px] text-secondary">{step}</p>
                    <p className="text-[19px] text-secondary">{dateTime}</p>
                  </div>
                </div>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

