const REQUIRED_MODEL_FILES = Object.freeze([
  'sj.morph',
  'default.dict',
  'dialect.dict',
  'multi.dict',
  'typo.dict',
  'combiningRule.txt',
  'cong.mdl',
  'extract.mdl',
  'nounchr.mdl'
]);

function validateModelFiles(modelFiles) {
  if (!modelFiles || typeof modelFiles !== 'object') {
    throw new TypeError('Kiwi 모델 파일 목록이 필요합니다.');
  }

  for (const name of REQUIRED_MODEL_FILES) {
    const value = modelFiles[name];

    if (!(typeof value === 'string' || ArrayBuffer.isView(value))) {
      throw new TypeError(`Kiwi 모델 파일이 없습니다: ${name}`);
    }
  }
}

function validateWasmPath(wasmPath) {
  if (typeof wasmPath !== 'string' || wasmPath.trim() === '') {
    throw new TypeError('Kiwi WASM 파일 경로가 필요합니다.');
  }
}

/**
 * kiwi-nlp의 공식 WASM 런타임을 초기화한다.
 *
 * WASM 파일과 모델 파일은 애플리케이션이 별도로 공급한다.
 * 모델 파일을 저장소에 포함하지 않는 것이 기본 원칙이다.
 */
export async function createKiwiRuntime({
  wasmPath,
  modelFiles,
  buildOptions = {}
}) {
  validateWasmPath(wasmPath);
  validateModelFiles(modelFiles);

  const { KiwiBuilder, Match } = await import('kiwi-nlp');
  const builder = await KiwiBuilder.create(wasmPath);
  const kiwi = await builder.build({
    modelFiles,
    modelType: 'cong',
    ...buildOptions
  });

  if (!kiwi || typeof kiwi.tokenize !== 'function') {
    throw new Error('Kiwi 런타임이 형태소 분석 기능을 제공하지 않습니다.');
  }

  if (typeof kiwi.ready === 'function' && !kiwi.ready()) {
    throw new Error('Kiwi 모델이 준비되지 않았습니다.');
  }

  return {
    kiwi,
    version: typeof builder.version === 'function' ? builder.version() : null,
    match: Match
  };
}

export { REQUIRED_MODEL_FILES, validateModelFiles, validateWasmPath };
