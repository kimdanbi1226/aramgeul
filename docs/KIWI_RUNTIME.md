# Kiwi 런타임 구성

아람글은 `kiwi-nlp@0.23.0`의 JavaScript/WASM 바인딩을 형태소 분석 어댑터에 연결한다.

## 초기화 순서

1. `kiwi-wasm.wasm` 경로를 애플리케이션에서 공급한다.
2. `KiwiBuilder.create(wasmPath)`로 WASM 런타임을 초기화한다.
3. v0.23.0 CoNg 모델 파일을 `modelFiles`로 공급한다.
4. `builder.build({ modelFiles, modelType: 'cong' })`로 분석기를 생성한다.
5. 생성된 Kiwi 인스턴스를 `createKiwiAdapter()`에 주입한다.

## v0.23.0 CoNg 모델

공식 v0.23.0 릴리스의 `kiwi_model_v0.23.0_base.tgz`를 실제 GitHub Actions 환경에서 다운로드하여 압축파일 내부를 확인했다.

확인된 필수 CoNg 모델 파일은 총 9개다.

- `sj.morph`
- `default.dict`
- `dialect.dict`
- `multi.dict`
- `typo.dict`
- `combiningRule.txt`
- `cong.mdl`
- `extract.mdl`
- `nounchr.mdl`

모델 파일은 아람글 저장소에 포함하지 않는다. CI 또는 운영 환경에서 공식 릴리스로부터 별도로 공급한다.

## 런타임 모듈

`lib/morphology/kiwi-runtime.js`는 다음 책임만 가진다.

- WASM 경로 검증
- 필수 모델 파일 검증
- KiwiBuilder 초기화
- CoNg 모델 빌드
- 런타임 준비 상태 확인

형태소 결과의 공통 변환은 `lib/morphology/kiwi.js`의 Adapter가 담당한다.

## 실제 런타임 검증

GitHub Actions의 Ubuntu 24.04 + Node.js 22 환경에서 다음 항목을 실제로 검증했다.

- `kiwi-nlp@0.23.0` 설치
- 공식 v0.23.0 CoNg 모델 다운로드
- 9개 모델 파일 로딩
- `kiwi-wasm.wasm` 실제 로딩
- Kiwi 버전 `0.23.0` 확인
- 실제 문장 형태소 분석 및 아람글 규칙 파이프라인 연결

검증 문장:

- `할 수 있다.`
- `안 돼요.`
- `생각해 보자.`
- `할 만큼 했다.`
- `공부가 잘 안돼요.`
- `해야 돼요.`

실제 결과에서 `수/NNB`, `보/VX`, `안/MAG` 등의 형태소·품사가 확인되었으며, 테스트 마지막에 `Kiwi real runtime test: PASS (version=0.23.0)`가 출력되었다.

검증 Workflow run: `36887478151`

통합 파이프라인 결과:

- `할수있다` → `할 수 있다` (`CORRECTION`)
- `생각해보자` → `생각해 보자` (`CORRECTION`)
- `안돼요` → `안 돼요` (`CORRECTION`)
- `나만큼` → `나만큼` (`VALID`)

## 모델 운영 원칙

- 모델 바이너리와 대용량 모델 파일은 Git 저장소에 커밋하지 않는다.
- 버전이 바뀌면 모델 파일 구성과 런타임 호환성을 다시 검증한다.
- 모델 파일의 정확한 구성은 추정하지 않고 공식 릴리스 아카이브를 기준으로 확인한다.
