# Kiwi 런타임 구성

아람글은 `kiwi-nlp@0.23.0`의 JavaScript/WASM 바인딩을 형태소 분석 어댑터에 연결한다.

## 초기화 순서

1. `kiwi-wasm.wasm` 경로를 애플리케이션에서 공급한다.
2. `KiwiBuilder.create(wasmPath)`로 WASM 런타임을 초기화한다.
3. v0.23.0 CoNg 모델 파일을 `modelFiles`로 공급한다.
4. `builder.build({ modelFiles, modelType: 'cong' })`로 분석기를 생성한다.
5. 생성된 Kiwi 인스턴스를 `createKiwiAdapter()`에 주입한다.

## v0.23.0 CoNg 모델

공식 v0.23.0 릴리스의 `kiwi_model_v0.23.0_base.tgz`를 기준으로 한다.

검증 대상 파일은 다음 5개다.

- `combiningRule.txt`
- `cong.mdl`
- `extract.mdl`
- `nounchr.mdl`
- `sj.morph`

공식 릴리스 아카이브 SHA-256:

`355a006ab0bd4dec171cdca8e0b0d951e82bd5bc5993265421d8961876f20430`

모델 파일은 아람글 저장소에 포함하지 않는다. 운영 환경에서 별도로 공급하고, 배포 전에 공식 릴리스의 파일과 해시를 확인한다.

## 런타임 모듈

`lib/morphology/kiwi-runtime.js`는 다음 책임만 가진다.

- WASM 경로 검증
- 필수 모델 파일 검증
- KiwiBuilder 초기화
- CoNg 모델 빌드
- 런타임 준비 상태 확인

형태소 결과의 공통 변환은 `lib/morphology/kiwi.js`의 Adapter가 담당한다.

## 검증 범위

`tests/kiwi-runtime.test.js`는 실제 모델을 저장소에 넣지 않고 구성 검증을 수행한다.

실제 형태소 분석 검증은 운영에 사용할 WASM과 v0.23.0 모델 파일을 별도로 준비한 환경에서 수행해야 한다.
