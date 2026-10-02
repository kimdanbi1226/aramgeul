import { createBareunResult, integrateCheckResults } from '../lib/pipeline/integrate.js';
import { findRuleForExample, toRuleEvidence } from '../lib/rules/rules.v0.1.js';
import { checkText } from '../lib/pipeline/check.js';
import { buildRuleFallbackBlocks } from '../lib/pipeline/rule-blocks.js';

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
      const { analyze: analyzeMecab } = await import('../lib/morphology/mecab-ko.js');
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
     * 아람글 로컬 규칙 엔진은 별도의 형태소 런타임/모델 자산 공급 방식이
     * 확정된 뒤 ruleResult로 주입한다.
     *
     * 따라서 이 단계에서는 Bareun 결과를 별도 evidence로 보존하면서
     * 향후 규칙 엔진 결과와 충돌 없이 통합할 수 있는 구조를 먼저 만든다.
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

    return res.status(200).json({
      // 기존 프론트엔드 호환 필드
      origin: bareunData?.origin || text,
      revised: integrated.revised,
      revised_blocks: mergedRevisedBlocks,
      engines: {
        aramgeul_rule: Boolean(ruleResult),
        bareun: Boolean(bareunResult)
      },
      engine_warning: bareunError
        ? 'Bareun 검사 엔진에 연결되지 않아 아람글 규칙 엔진 기준으로 검사했습니다.'
        : (!apiKey ? 'Bareun API 인증 정보가 없어 아람글 규칙 엔진 기준으로 검사했습니다.' : null),
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
      candidates: integrated.candidates || []
    });
  } catch (error) {
    console.error('Check API error:', error);
    return res.status(500).json({
      error: '검사 처리 중 오류가 발생했습니다.'
    });
  }
}
