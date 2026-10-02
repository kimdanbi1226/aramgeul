# 아람글 규칙 데이터 스키마

> 목적: 규칙을 코드에 직접 흩어 놓지 않고, 규칙의 근거·적용 조건·예외·예상 결과를 추적 가능한 데이터로 관리한다.

## 1. 기본 단위

하나의 규칙은 하나의 `rule_id`를 가진다.

예:
- `SPACING-041`: 조사 띄어쓰기
- `SPACING-042`: 의존 명사 띄어쓰기
- `SPACING-047`: 보조 용언 띄어쓰기
- `ORTHO-...`: 철자/형태 관련 규칙

규칙 ID는 규칙 번호와 구현 세부 규칙을 구분한다. 한 규정 조항에서 여러 문맥 규칙이 파생될 수 있으므로 조항 번호 자체를 유일한 ID로 사용하지 않는다.

## 2. 권장 필드

| 필드 | 필수 | 설명 |
|---|---|---|
| rule_id | O | 아람글 내부 고유 규칙 ID |
| category | O | spelling / spacing / expression / register 등 |
| title | O | 규칙의 짧은 이름 |
| description | O | 사람이 읽을 수 있는 규칙 설명 |
| decision_type | O | ERROR / CORRECTION / VALID / AMBIGUOUS 등 |
| conditions | O | 규칙이 적용되는 형태·문맥 조건 |
| exceptions | △ | 예외 또는 허용 조건 |
| examples | △ | 자동 교정이 확정되는 대표 예시 |
| allowed_examples | △ | 원칙형과 함께 허용되는 표기 예시 |
| deferred_examples | △ | 문맥 부족으로 자동 판정을 보류하는 예시 |
| source_type | O | norm / dictionary / engine / term 등 |
| source_name | O | 출처명 |
| source_url | O | 1차 공식 근거 URL(규범 원문 등) |
| source_detail_url | △ | 해당 표현을 직접 설명하는 공식 Q&A·해설 URL |
| source_detail_label | △ | 상세 근거 링크에 표시할 설명 |
| source_reference | △ | 규범 조항, 사전 항목 등 구체적 근거 |
| source_version | △ | 확인한 데이터/문서 버전 |
| priority | O | RULE_PRIORITY에 따른 적용 우선순위 |
| confidence | O | high / medium / low |
| notes | △ | 구현상 주의사항 |
| updated_at | O | 마지막 검토일 |

## 3. 중요한 설계 원칙

### 3.1 규칙과 예시는 분리

예문 자체를 규칙으로 취급하지 않는다.

예:
`나만큼`과 `할 만큼`은 모두 '만큼' 관련 예시지만, 실제 규칙은 해당 형태의 품사/문법적 기능을 판단하는 것이다.

### 3.2 조건을 명시

다음처럼 단순 문자열 치환 규칙을 만들지 않는다.

잘못된 방식:

`"할만큼" → "할 만큼"`

올바른 방식:

`용언의 관형사형 + 의존 명사 '만큼' → 띄어 씀`

### 3.3 허용 표기는 별도로 보존

규범상 원칙과 허용이 함께 존재하는 경우 하나만 정답으로 저장하지 않는다.

예:
- 원칙: `살아 있는`
- 허용: `살아있는`

이 경우 결과 데이터에 `preferred`, `allowed` 등의 구분이 필요하다.

### 3.4 원칙·허용·보류를 구분

규범상 원칙이 존재하더라도 붙여 쓰기가 허용되는 경우에는 자동 교정 대상으로 취급하지 않는다.

- `examples`: 현재 조건에서 교정이 확정되는 사례
- `allowed_examples`: 원칙형과 함께 허용되는 사례
- `deferred_examples`: 의미·문맥·어휘 정보가 부족하여 자동 판정을 보류하는 사례

예를 들어 `먹어 보았다`가 원칙이더라도 `먹어보았다`가 허용되는 경우에는 두 표기를 동일한 오류로 처리하지 않는다.

### 3.5 문맥 의존 규칙은 형태소 정보와 연결

`뿐`, `만큼`, `지`, `데`, `밖에`처럼 품사와 문법적 기능에 따라 띄어쓰기가 달라지는 항목은 단순 사전 검색만으로 판정하지 않는다.

## 4. 예시 JSON

```json
{
  "rule_id": "SPACING-042-DEPENDENT-NOUN",
  "category": "spacing",
  "title": "의존 명사 띄어쓰기",
  "description": "의존 명사는 앞말과 띄어 쓴다.",
  "decision_type": "CORRECTION",
  "conditions": [
    "target is a dependent noun",
    "target follows a modifier"
  ],
  "exceptions": [],
  "examples": [
    {
      "input": "할수있다",
      "expected": "할 수 있다"
    }
  ],
  "allowed_examples": [],
  "deferred_examples": [],
  "source_type": "norm",
  "source_name": "국립국어원",
  "source_url": "https://www.korean.go.kr/",
  "source_detail_url": null,
  "source_detail_label": null,
  "source_reference": "한글 맞춤법 제42항",
  "priority": 1,
  "confidence": "high",
  "updated_at": "2026-10-01"
}
```

## 5.1 현재 띄어쓰기 규칙 범위

현재 엔진은 한글 맞춤법 제41~48항을 한꺼번에 자동화하지 않고, **자동 판정 가능성**에 따라 단계적으로 적용한다.

| 규정 | 아람글 상태 | 기본 검사 원칙 |
|---|---|---|
| 제41항 | 구현 | 조사 붙여쓰기 오류는 자동 교정 |
| 제42항 | 구현 | 확정적인 의존 명사 띄어쓰기만 자동 교정 |
| 제43항 | 구현 | 단위 명사의 원칙형은 교정하되 숫자와 어울리는 허용 붙여쓰기는 보존 |
| 제44항 | 별도 확장 예정 | 수의 만 단위 띄어쓰기는 숫자 구조 분석 계층에서 처리 |
| 제45항 | 구현 | 겸·내지·대·및·등류의 독립적인 연결·열거 용법만 자동 교정 |
| 제46항 | 데이터화 | 허용되는 붙여쓰기를 오류로 교정하지 않음 |
| 제47항 | 부분 구현 | 허용 붙여쓰기와 충돌하지 않는 확정 사례만 자동 교정 |
| 제48항 | 보류 | 성명·호·호칭·관직명은 고유명사/사전 정보가 필요하므로 자동 문자열 규칙으로 처리하지 않음 |

특히 allowed_examples에 기록된 허용 표기는 기본 맞춤법 검사에서 CORRECTION으로 바꾸지 않는다.
자기소개서·지원서·공식 문서 등에서 원칙형을 권장하는 기능은 향후 register/문서 유형 계층에서 별도로 처리한다.

## 5. 판정과 설명을 분리

규칙 데이터의 `decision`은 엔진의 판정을 위한 값이고, 사용자에게 보여 주는 설명 문장은 별도 계층에서 생성한다.

즉:

규칙
→ 판정
→ 근거
→ 사용자 설명

의 순서로 처리한다.

## 6. 버전 관리

규칙을 수정할 때 기존 규칙을 덮어쓰기만 하지 않는다.

- rule_id 유지
- 변경일 기록
- source_version 갱신
- Golden Test Set 재실행
- 변경 사유 기록

규칙의 의미가 달라지는 경우에는 새 rule_id를 발급할 수 있다.
