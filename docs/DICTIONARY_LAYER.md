# 아람글 사전 데이터 레이어 v1

## 목적

사전은 맞춤법 규칙 자체가 아니라 **어휘·개체·전문용어에 대한 증거를 제공하는 데이터 계층**으로 사용한다.

현재 구현은 provider와 adapter의 계약을 먼저 확정했다. 인증 정보가 없는 환경에서 외부 API를 가짜로 호출하거나 응답 형식을 추정하지 않는다.

## 구조

국립국어원 사전 → provider → Dictionary Adapter → Aramgeul DictionaryEntry → 문맥/규칙 evaluator

규칙 엔진은 특정 사전의 원시 JSON/XML 구조를 직접 의존하지 않는다.

## 공통 레코드

normalizeDictionaryEntry()는 외부 응답을 다음 형태로 정규화한다.

- word: 표제어
- source: 데이터 출처
- entry_id: 사전 항목 식별자
- pos: 품사
- senses: 의미 목록
- categories: 분야/전문어 등 범주
- labels: 사전 표지
- variants: 이형태·관련 표기
- standard: 표준어 여부
- proper_noun: 고유 명사 여부
- technical_term: 전문 용어 여부
- person_name: 인명 여부
- metadata: 필요한 원본 부가 정보

## 출처 원칙

표준국어대사전과 우리말샘은 국립국어원의 공식 사전 서비스다. 표준국어대사전은 표준어·품사·뜻 등 기본 어휘 근거에 사용하고, 우리말샘은 전문어·분야별 어휘와 추가 어휘 근거를 보완하는 방향으로 설계한다.

실제 Open API 연동 시에는 최신 공식 API 문서와 이용 조건을 확인한 뒤 provider를 구현한다. API 키와 인증정보는 저장소에 커밋하지 않는다.

## 현재 구현 범위

완료:
- provider 계약
- 공통 DictionaryEntry schema
- 응답 정규화
- local provider
- malformed response 방어
- 단위 테스트

구현 완료:
- 표준국어대사전 공식 Open API 검색 URL/요청 변수/JSON 응답 구조에 맞춘 provider
- 우리말샘 공식 Open API 검색 URL/요청 변수/JSON 응답 구조에 맞춘 provider
- API key는 서버 환경변수로만 주입
- 공통 timeout 처리
- TTL 캐시
- 429/5xx/timeout 재시도와 exponential backoff

아직 하지 않은 것:
- 실제 인증키를 환경변수에 등록하고 실 API 호출 검증
- 사전 결과를 SPACING-048/049/050/057 evaluator에 연결
- dictionary-backed golden tests 추가
- provider별 rate limit 정책을 실제 운영 한도에 맞게 세분화
- 사전 결과를 자동 교정으로 직접 승격

사전 조회 실패나 충돌은 오류로 가장하지 않고 DEFERRED/AMBIGUOUS로 유지한다.

## 다음 단계

1. 실제 Open API 이용 신청/인증 정보 확보 및 서버 환경변수 등록
2. 인증키를 사용한 실 API smoke test
3. 사전 증거를 SPACING-048/049/050/057 evaluator에 연결
4. dictionary-backed golden tests 추가
5. 운영 rate limit/캐시 정책 검증
