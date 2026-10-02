# 아람글 검사 엔진 아키텍처 v1

## 1. 목표

아람글의 검사 결과는 단순 문자열 치환이 아니라 다음 정보를 함께 반환한다.

1. 입력 문장
2. 형태소/문장 분석
3. 적용된 검사 규칙
4. 수정 후보와 정확한 위치
5. 판정 상태
6. 규칙의 공식 근거
7. 문맥 부족으로 확정하지 못한 후보

핵심 원칙은 **근거가 충분하지 않으면 수정하지 않는 것**이다.

---

## 2. 전체 처리 흐름

```text
사용자 입력
  ↓
입력 정규화
  ↓
형태소/문장 분석
  ↓
규칙 엔진
  ├─ 맞춤법(spelling)
  ├─ 띄어쓰기(spacing)
  ├─ 문법(grammar)
  └─ 표현(expression)
  ↓
후보 생성
  ↓
후보 검증/충돌 해소
  ↓
통합 판정
  ├─ CORRECTION
  ├─ VALID
  ├─ AMBIGUOUS
  ├─ DEFERRED
  └─ NO_DECISION
  ↓
수정문 + 수정 위치 + 규칙 + 근거
  ↓
UI 설명 카드
```

현재 구현된 실제 검사기는 **spacing**이며, 다른 범주는 동일한 evaluator 계약으로 추가한다.

---

## 3. 판정 상태

| 상태 | 의미 | 자동 수정 |
|---|---|---|
| CORRECTION | 근거가 충분하고 수정이 확정됨 | O |
| VALID | 현재 검사 범위에서 수정 필요 없음 | X |
| AMBIGUOUS | 독립 검사 계층이 서로 다른 후보를 제시함 | X |
| DEFERRED | 문맥/어휘 정보가 부족하여 판단을 보류함 | X |
| NO_DECISION | 사용할 수 있는 검사 결과가 없음 | X |

### 중요 원칙

- AMBIGUOUS를 임의로 한 후보로 축약하지 않는다.
- DEFERRED를 오류로 취급하지 않는다.
- VALID는 **현재 활성화된 검사 범위 안에서** 수정이 발견되지 않았다는 의미로 사용한다.
- 외부 엔진 장애 때문에 판단할 수 없는 경우에도 정상 문장으로 가장하지 않는다.

---

## 4. 규칙 데이터 계약

각 규칙은 다음 정보를 가진다.

- `rule_id`
- `category`
- `title`
- `description`
- `conditions`
- `exceptions`
- `examples`
- `allowed_examples`
- `deferred_examples`
- `source_type`
- `source_name`
- `source_url`
- `source_detail_url`
- `source_reference`
- `priority`
- `confidence`
- `notes`
- `updated_at`

규칙 ID는 국립국어원 조항 번호와 동일하게 만들지 않는다. 하나의 조항에서 여러 문맥 규칙이 파생될 수 있기 때문이다.

---

## 5. 검사기 계약

각 category evaluator는 다음 형태를 목표로 한다.

```js
evaluate(analysis) => {
  input,
  revised,
  edits,
  decision,
  deferred,
  candidates
}
```

- `edits`: 확정된 수정만 포함
- `deferred`: 판단 보류 후보
- `candidates`: 서로 다른 수정 후보
- `decision`: 해당 evaluator의 판정

현재 spacing evaluator는 기존 호환성을 위해 `input/revised/edits/decision`을 유지하며, 이후 범주 확장 시 나머지 필드를 추가한다.

---

## 6. 결과 통합 원칙

아람글 자체 규칙 엔진과 Bareun 같은 외부 교정 엔진을 통합할 때:

### 동일 후보

```text
아람글 → A
Bareun → A
       ↓
CORRECTION
```

### 한쪽만 후보

```text
아람글 → A
Bareun → 원문
       ↓
CORRECTION
```

### 서로 다른 후보

```text
아람글 → A
Bareun → B
       ↓
AMBIGUOUS
```

서로 다른 후보가 존재하는데 임의로 하나를 선택하지 않는다.

---

## 7. 외부 데이터 소스의 역할

### 국립국어원 어문 규범

규칙의 **1차 근거**다.

현재 규칙 데이터의 `source_url`로 사용한다.

### 국립국어원 온라인가나다

특정 표현이나 경계 사례를 설명하는 **보조 근거**다.

현재 `source_detail_url`로 사용한다.

### Bareun

아람글 자체 규칙을 보완하는 **외부 교정 엔진**이다.

### 표준국어대사전 / 우리말샘

향후 추가할 **어휘·사전 데이터 레이어**다.

사전 API를 맞춤법 규칙 엔진 자체로 사용하지 않는다.

---

## 8. 구현 순서

### Phase 1 — 엔진 기반
- [x] 형태소 분석 adapter
- [x] 규칙 데이터 schema
- [x] spacing evaluator
- [x] 결과 통합
- [x] 수정 위치/설명 연결
- [x] 공식 근거 연결

### Phase 2 — 규칙 범위 확대
1. 띄어쓰기
2. 맞춤법/철자
3. 활용·어미
4. 조사/문법
5. 표현
6. 문맥 판단

각 규칙은 구현 전에 다음을 확정한다.

```text
규칙 정의
→ 적용 조건
→ 예외
→ 자동 수정 가능 여부
→ 공식 근거
→ golden test
```

### Phase 3 — 외부 데이터
1. Bareun 실인증 연결 및 충돌 테스트
2. 표준국어대사전 API
3. 우리말샘 API

사전 API는 규칙 엔진의 핵심 기능이 안정된 후 연결한다.

### Phase 4 — 검증
- golden tests
- 복합 오류
- 반복 오류
- 경계 사례
- 허용 표기
- 문맥 의존 사례
- 외부 엔진 장애
- 5,000자 입력
- 성능/타임아웃

### Phase 5 — UI/브랜딩
엔진 판정과 데이터 계약이 안정된 후 상세 UI와 브랜드 시스템을 확정한다.

---

## 9. 현재 구현 범위

현재 자동 교정 규칙:

- SPACING-042-DEPENDENT-NOUN
- SPACING-047-AUXILIARY-VERB
- SPACING-JOSA-ATTACH

현재 자동 보류 영역:

- SPACING-NEGATIVE-ADVERB의 안/못 계열처럼 의미·문맥에 따라 판정이 달라지는 표현

보류 영역은 충분한 문맥 분석 계층이 생기기 전까지 자동 수정하지 않는다.

---

## 10. 품질 기준

새 규칙을 추가할 때 다음 조건을 모두 만족해야 한다.

1. 공식 근거가 확인되어야 한다.
2. 적용 조건이 문자열 예문보다 일반화되어 있어야 한다.
3. 예외/허용 표기를 별도로 정의해야 한다.
4. 자동 수정 가능한 범위를 명확히 제한해야 한다.
5. 수정 위치를 계산할 수 있어야 한다.
6. 설명 카드에 근거를 표시할 수 있어야 한다.
7. 정상 문장을 잘못 수정하지 않는 golden test가 있어야 한다.
8. 다른 규칙과 충돌할 경우 우선순위 또는 AMBIGUOUS 정책이 정의되어야 한다.

**근거가 부족한 규칙은 구현하지 않는다.**
