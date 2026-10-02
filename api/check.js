import { createBareunResult, integrateCheckResults } from '../lib/pipeline/integrate.js';
import { findRuleForExample, toRuleEvidence } from '../lib/rules/rules.v0.1.js';
import { checkText } from '../lib/pipeline/check.js';
import { analyze as analyzeMecab } from '../lib/morphology/mecab-ko.js';
import { buildRuleFallbackBlocks } from '../lib/pipeline/rule-blocks.js';
import {
  createDictionaryService,
  createStandardDictionaryProvider,
  createUrimalsaemProvider
} from '../lib/dictionary/index.js';
import { collectDictionaryEvidence } from '../lib/dictionary/evidence.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const apiKey = process.env.BAREUN_API_KEY;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return res.status(400).json({ error: '검사할 문장을 입력해 주세요.' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: '검사할 문장은 5,000자 이내로 입력해 주세요.' });
    }

    let bareunData = null;
    let bareunError = null;

    if (apiKey) {
      try {
        const response = await fetch(
          'https://api.bareun.ai/bareun.RevisionService/CorrectError',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey
            },
            body: JSON.stringify({
              document: {
                content: text,
                language: 'ko_KR'
              },
              encoding_type: 'UTF8'
            })
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(`Bareun API HTTP ${response.status}`);
        }

        bareunData = data;
      } catch (error) {
        bareunError = error instanceof Error ? error.message : String(error);
        console.error('Bareun API error; continuing with Aramgeul rule engine:', error);
      }
    }

    let ruleResult = null;
    let ruleEngineError = null;
    try {
      const rulePipeline = await checkText(text, {
        analyze: analyzeMecab
      });
      ruleResult = {
        ...rulePipeline.result,
        sources: rulePipeline.result.edits
          .map(edit => edit.rule)
          .filter(Boolean)
          .map(rule => ({
            source: rule.source_name,
            source_type: rule.source_type,
            source_url: rule.source_url,
            source_reference: rule.source_reference,
            rule_id: rule.rule_id
          }))
      };
    } catch (ruleError) {
      ruleEngineError = ruleError instanceof Error ? ruleError.message : String(ruleError);
      console.error('Aramgeul rule engine error:', ruleError);
    }

    let dictionaryEvidence = {
      enabled: false,
      queries: [],
      matches: [],
      rule_evidence: []
    };
    let dictionaryError = null;

    const hasDictionaryKey = Boolean(
      process.env.STANDARD_DICTIONARY_API_KEY ||
      process.env.URIMALSAEM_API_KEY
    );

    if (hasDictionaryKey) {
      try {
        const standard = process.env.STANDARD_DICTIONARY_API_KEY
          ? createStandardDictionaryProvider()
          : null;
        const urimal = process.env.URIMALSAEM_API_KEY
          ? createUrimalsaemProvider()
          : null;

        const dictionaryService = createDictionaryService(
          { standard, urimal },
          {
            retries: 2,
            baseDelayMs: 150,
            ttlMs: 60_000,
            maxEntries: 500
          }
        );

        dictionaryEvidence = await collectDictionaryEvidence({
          text,
          ruleResult,
          dictionaryService
        });
      } catch (error) {
        dictionaryError = error instanceof Error ? error.message : String(error);
        console.error('Dictionary evidence error; continuing without dictionary evidence:', error);
      }
    }

    const revisedBlocks = Array.isArray(bareunData?.revised_blocks)
      ? bareunData.revised_blocks.map(block => {
          const originText = block?.origin?.text || '';
          const revisedText = block?.revised || '';
          const helpId = block?.revisions?.[0]?.help_id;
          const help = helpId && bareunData?.helps?.[helpId]?.comment
            ? bareunData.helps[helpId].comment
            : '';

          const matchedRule = findRuleForExample(originText, revisedText);
          const ruleMatches = (ruleResult?.edits || [])
            .map(edit => edit.rule)
            .filter(Boolean)
            .filter(rule =>
              (rule.examples || []).some(example =>
                originText.includes(example?.input || '\u0000') ||
                revisedText.includes(example?.expected || '\u0000')
              )
            );

          const rules = [
            ...(matchedRule ? [toRuleEvidence(matchedRule)] : []),
            ...ruleMatches
          ].filter((rule, index, all) =>
            all.findIndex(item => item.rule_id === rule.rule_id) === index
          );

          return {
            origin: { text: originText },
            revised: revisedText,
            help,
            rules,
            rule: rules[0] || null
          };
        })
      : [];

    const ruleFallbackBlocks = ruleResult?.edits?.length
      ? buildRuleFallbackBlocks(text, ruleResult.edits)
      : [];

    const representedRuleCounts = revisedBlocks.reduce((counts, block) => {
      const rules = Array.isArray(block?.rules)
        ? block.rules
        : (block?.rule ? [block.rule] : []);

      rules.forEach(rule => {
        if (rule?.rule_id) {
          counts[rule.rule_id] = (counts[rule.rule_id] || 0) + 1;
        }
      });

      return counts;
    }, {});

    const fallbackRuleCounts = {};
    const additionalRuleBlocks = ruleFallbackBlocks.filter(block => {
      const ruleId = block?.rule?.rule_id;
      if (!ruleId) return false;

      fallbackRuleCounts[ruleId] = (fallbackRuleCounts[ruleId] || 0) + 1;
      return fallbackRuleCounts[ruleId] > (representedRuleCounts[ruleId] || 0);
    });

    const mergedRevisedBlocks = [
      ...revisedBlocks,
      ...additionalRuleBlocks
    ];

    /*
     * Bareun이 교정 블록을 반환한 경우에는 Bareun 블록을 우선 사용하되,
     * 아람글 규칙 엔진이 독립적으로 확인한 교정은 fallback 블록으로
     * 보존한다. 이렇게 해야 특정 예문에 등록되지 않은 새 문장도
     * 규칙 근거와 정확한 수정 위치를 잃지 않는다.
     *
     * 아람글 규칙 엔진은 checkText() 내부에서 kuromoji-ko 형태소 분석 결과를
     * 받아 실제 ruleEngine.evaluate()를 수행한다. 따라서 이 단계에서는
     * 별도의 ruleResult 주입이나 외부 모델 런타임을 전제로 하지 않는다.
     * Bareun 결과는 별도 evidence로 보존하면서 규칙 엔진 결과와 충돌 없이
     * 통합한다.
     */
    const bareunResult = bareunData
      ? createBareunResult(
          {
            revised: bareunData?.revised || text,
            revised_blocks: revisedBlocks
          },
          text
        )
      : null;

    const integrated = integrateCheckResults(text, {
      ruleResult,
      bareunResult
    });

    // Bareun이 특정 교정을 블록으로 돌려주지 않더라도
    // 아람글 규칙 엔진의 판정과 근거가 사라지지 않도록 보존한다.
    const ruleEdits = (ruleResult?.edits || [])
      .map(edit => ({
        rule_id: edit.rule_id,
        rule: edit.rule,
        start: edit.start,
        end: edit.end,
        replacement: edit.replacement,
        revised_start: Number.isInteger(edit.start) ? edit.start : null,
        revised_end: Number.isInteger(edit.start) ? edit.start + edit.replacement.length : null
      }))
      .filter(edit => edit.rule);

    const buildVersion =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      'local';

    return res.status(200).json({
      // 배포된 서버 코드 버전을 확인하기 위한 진단 필드
      build_version: buildVersion,

      // 기존 프론트엔드 호환 필드
      origin: bareunData?.origin || text,
      revised: integrated.revised,
      revised_blocks: mergedRevisedBlocks,
      engines: {
        aramgeul_rule: Boolean(ruleResult),
        bareun: Boolean(bareunResult)
      },
      engine_warning: ruleEngineError
        ? `아람글 규칙 엔진을 초기화하지 못했습니다: ${ruleEngineError}`
        : (bareunError
          ? 'Bareun 보조 엔진에 연결되지 않아 현재 아람글 규칙 엔진으로 검사했습니다.'
          : (!apiKey ? 'Bareun 보조 엔진 인증 정보가 없어 현재 아람글 규칙 엔진으로 검사했습니다.' : null)),
      diagnostics: process.env.NODE_ENV === 'production'
        ? undefined
        : {
            bareun_error: bareunError,
            rule_engine_error: ruleEngineError
          },
      rule_edits: ruleEdits,

      // 아람글 통합 판정
      decision: integrated.decision,
      edits: integrated.edits,
      sources: integrated.sources,
      evidence: integrated.evidence,
      candidates: integrated.candidates || [],

      // 사전은 문맥 의존 규칙의 어휘적 증거만 제공하며
      // 현재 단계에서는 최종 교정문을 직접 변경하지 않는다.
      dictionary_evidence: dictionaryEvidence,
      dictionary_warning: dictionaryError
        ? `사전 증거 계층을 초기화하지 못했습니다: ${dictionaryError}`
        : (!hasDictionaryKey
          ? '사전 API 인증 정보가 없어 사전 증거 계층을 실행하지 않았습니다.'
          : null)
    });
  } catch (error) {
    console.error('Check API error:', error);
    return res.status(500).json({
      error: '검사 처리 중 오류가 발생했습니다.'
    });
  }
}
