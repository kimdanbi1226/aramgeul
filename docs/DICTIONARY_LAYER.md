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
- provider별 rate limit 정책을 실제 운영 한도에 맞게 세분화
- 사전 결과를 자동 교정으로 직접 승격

사전 조회 실패나 충돌은 오류로 가장하지 않고 DEFERRED/AMBIGUOUS로 유지한다.

## 다음 단계

1. 실제 Open API 이용 신청/인증 정보 확보 및 서버 환경변수 등록
2. 인증키를 사용한 실 API smoke test
3. provider별 rate limit/캐시 정책을 실제 운영 한도에 맞게 검증
4. 사전 결정 신호를 최종 교정 파이프라인에 연결할지 별도 검증


## 2026-10-02 dictionary evidence integration

The dictionary layer is now connected to `api/check.js` as an evidence-only layer.

- Standard Korean Language Dictionary and Urimalsaem providers are enabled when their server-side API keys exist.
- Dictionary lookups use the existing timeout, TTL cache, and retry wrapper.
- `lib/dictionary/evidence.js` collects lexical evidence for the context-dependent rule groups:
  - `SPACING-048-NAME-APPELLATION`
  - `SPACING-049-PROPER-NOUN`
  - `SPACING-050-TECHNICAL-TERM`
  - `ORTHO-057-DISTINGUISHING-WORDS`
- Dictionary evidence is returned as `dictionary_evidence` in the check API response.
- Dictionary evidence does not directly modify `revised`, `decision`, or `edits`.
- Missing API keys, API failures, and empty dictionary results do not fail the spelling/spacing check.

This is intentionally a non-breaking integration step. The next layer is to add rule-specific dictionary decision logic and golden tests before allowing dictionary evidence to change a correction decision.


## 2026-10-02 conservative dictionary decision layer

The dictionary evidence is now converted into a separate dictionary_decisions signal.

- SPACING-050-TECHNICAL-TERM: returns SUPPORTS only when a normalized dictionary entry explicitly has technical_term=true.
- SPACING-048-NAME-APPELLATION: returns SUPPORTS only when a normalized entry explicitly has person_name=true **and** the registered name/appellation context identifies the name segment.
- SPACING-049-PROPER-NOUN: uses a three-stage decision: `SUPPORTS` when every registered candidate unit is confirmed by `proper_noun=true`, `BOUNDARY_REQUIRED` when only part of the candidate structure is confirmed, and `INSUFFICIENT` when no proper-noun evidence is available.
- ORTHO-057-DISTINGUISHING-WORDS: never promotes dictionary presence alone to an automatic correction; when competing lexical candidates are both present, it returns CONTEXT_REQUIRED.
- These decisions are advisory evidence and do not directly alter revised, decision, or edits. `BOUNDARY_REQUIRED` is intentionally conservative: partial dictionary evidence is not enough to assert the remaining spacing boundary.
- Added tests/dictionary-decision.test.js and registered test:dictionary-decision.

The normalized person/proper-noun/technical-term flags are populated from verified official API fields. The 048/049 decisions now require both lexical evidence and registered context, and decision tests cover context-present/context-absent cases. Live-key smoke tests remain separate because credentials are not stored in the repository.


## 2026-10-02 integration gating update

Dictionary decisions are now connected to the Aramgeul rule candidate at the integration boundary.

- SPACING-048-NAME-APPELLATION: BOUNDARY_REQUIRED blocks the affected Aramgeul rule edits.
- SPACING-049-PROPER-NOUN: BOUNDARY_REQUIRED blocks the affected Aramgeul rule edits.
- ORTHO-057-DISTINGUISHING-WORDS: CONTEXT_REQUIRED blocks the affected Aramgeul rule edits because competing lexical candidates require semantic/contextual judgment.
- SPACING-050-TECHNICAL-TERM: SUPPORTS confirms dictionary evidence but does not introduce a new blocking state; INSUFFICIENT leaves the existing rule result unchanged.
- INSUFFICIENT and EVIDENCE_ONLY remain non-blocking for the corresponding rule candidate.
- The gating applies to the Aramgeul rule candidate only. An independent Bareun correction is still evaluated as a separate evidence source by the existing integration policy.

This keeps the dictionary layer conservative: dictionary evidence can prevent an unsafe automatic rule correction when the decision explicitly says that a boundary or context is required, but absence of evidence does not silently disable the core rule engine.
