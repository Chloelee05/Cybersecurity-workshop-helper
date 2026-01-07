# Supabase 연결 가이드

현재 시스템은 인메모리 저장소를 사용하고 있어 서버 재시작 시 데이터가 사라집니다. Supabase를 연결하면 데이터가 영구적으로 저장됩니다.

## 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 계정 생성
2. 새 프로젝트 생성
3. 프로젝트 설정에서 API 키와 URL 확인

## 2. 패키지 설치

```bash
npm install @supabase/supabase-js
```

## 3. 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 4. 데이터베이스 스키마

Supabase SQL Editor에서 다음 SQL 실행:

```sql
-- Sessions 테이블
CREATE TABLE sessions (
  session_code TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  current_question INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  question1_time_limit INTEGER,
  question2_time_limit INTEGER,
  question1_start_time TIMESTAMPTZ,
  question2_start_time TIMESTAMPTZ
);

-- Participants 테이블
CREATE TABLE participants (
  id BIGSERIAL PRIMARY KEY,
  session_code TEXT REFERENCES sessions(session_code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_code, user_name)
);

-- Results 테이블
CREATE TABLE results (
  id BIGSERIAL PRIMARY KEY,
  session_code TEXT REFERENCES sessions(session_code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  time_taken INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_participants_session ON participants(session_code);
CREATE INDEX idx_results_session ON results(session_code);
CREATE INDEX idx_results_question ON results(session_code, question_number);
```

## 5. 구현 필요 사항

1. `lib/supabase.ts` - Supabase 클라이언트 생성
2. `app/api/session/route.ts` - Supabase에서 세션 조회/생성
3. `app/api/results/route.ts` - Supabase에 결과 저장/조회
4. `app/api/session/join/route.ts` - Supabase에 참가자 추가

## 장점

- ✅ 데이터 영구 저장
- ✅ 서버 재시작 후에도 세션 유지
- ✅ 실시간 업데이트 가능 (Realtime 기능)
- ✅ 사용자별 상태 정확히 추적
- ✅ 확장성 향상

