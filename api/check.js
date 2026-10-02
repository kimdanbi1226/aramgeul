import { createBareunResult, integrateCheckResults } from '../lib/pipeline/integrate.js';
import { findRuleForExample, toRuleEvidence } from '../lib/rules/rules.v0.1.js';
import { checkText } from '../lib/pipeline/check.js';
import { analyze as analyzeMecab } from '../lib/morphology/mecab-ko.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const apiKey = process.env.BAREUN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: '검사 서버의 API 인증 정보가 설정되지 않았습니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return res.status(400).json({ error: '검사할 문장을 입력해 주세요.' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: '검사할 문장은 5,000자 이내로 입력해 주세요.' });
    }

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
      console.error('Bareun API error:', response.status, data);
      return res.status(502).json({
        error: '검사용 API에서 정상적인 응답을 받지 못했습니다.'
      });
    }

    let ruleResult = null;
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
      console.error('Aramgeul rule engine error:', ruleError);
    }

    function applyRuleEditsToText(source, edits) {
      return [...edits]
        .sort((a, b) => b.start - a.start)
        .reduce(
          (current, edit) =>
            current.slice(0, edit.start) +
            edit.replacement +
            current.slice(edit.end),
          source
        );
    }

    function buildRuleFallbackBlocks(source, edits) {
      const sorted = [...edits]
        .filter(edit =>
          edit &&
          Number.isInteger(edit.start) &&
          Number.isInteger(edit.end) &&
          typeof edit.replacement === 'string' &&
          edit.rule
        )
        .sort((a, b) => a.start - b.start);

      return sorted.map((edit, index) => {
        const contextStart = Math.max(0, edit.start - 8);
        const contextEnd = Math.min(source.length, Math.max(edit.end, edit.start) + 8);
        const relevantEdits = sorted.filter(candidate =>
          candidate.start >= contextStart && candidate.end <= contextEnd
        );

        const originText = source.slice(contextStart, contextEnd);
        const revisedContext = applyRuleEditsToText(
          originText,
          relevantEdits.map(candidate => ({
            ...candidate,
            start: candidate.start - contextStart,
            end: candidate.end - contextStart
          }))
        );

        const deltaBefore = sorted
          .filter(candidate => candidate.start < edit.start)
          .reduce(
            (sum, candidate) => sum + candidate.replacement.length - (candidate.end - candidate.start),
            0
          );

        const revisedStart = edit.start + deltaBefore;
        const revisedEnd = revisedStart + edit.replacement.length;
        const revisedContextStart = contextStart + sorted
          .filter(candidate => candidate.start < contextStart)
          .reduce(
            (sum, candidate) => sum + candidate.replacement.length - (candidate.end - candidate.start),
            0
          );

        return {
          id: 'rule-' + index + '-' + edit.rule.rule_id,
          origin: {
            text: originText,
            start: contextStart,
            end: contextEnd
          },
          revised: revisedContext,
          revised_start: revisedStart,
          revised_end: revisedEnd,
          rule: edit.rule,
          rules: [edit.rule],
          help: edit.rule.description || '',
          source: 'aramgeul-rule',
          rule_edit: {
            start: edit.start,
            end: edit.end,
            replacement: edit.replacement
          },
          context_revised_start: revisedContextStart,
          context_revised_end: revisedContextStart + revisedContext.length
        };
      });
    }

    const revisedBlocks = Array.isArray(data?.revised_blocks)
      ? data.revised_blocks.map(block => {
          const originText = block?.origin?.text || '';
          const revisedText = block?.revised || '';
          const helpId = block?.revisions?.[0]?.help_id;
          const help = helpId && data?.helps?.[helpId]?.comment
            ? data.helps[helpId].comment
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
    const bareunResult = createBareunResult(
      {
        revised: data?.revised || text,
        revised_blocks: mergedRevisedBlocks
      },
      text
    );

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
      origin: data?.origin || text,
      revised: integrated.revised,
      revised_blocks: revisedBlocks,
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
