import { createBareunResult, integrateCheckResults } from '../lib/pipeline/integrate.js';
import { findRuleForExample, toRuleEvidence, getRuleById } from '../lib/rules/rules.v0.1.js';
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
              originText.includes(rule.examples?.[0]?.input || '\u0000') ||
              revisedText.includes(rule.examples?.[0]?.expected || '\u0000')
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

    /*
     * 현재 배포 API에서는 Bareun 결과만 실제로 연결한다.
     * 아람글 로컬 규칙 엔진은 별도의 형태소 런타임/모델 자산 공급 방식이
     * 확정된 뒤 ruleResult로 주입한다.
     *
     * 따라서 이 단계에서는 Bareun 결과를 별도 evidence로 보존하면서
     * 향후 규칙 엔진 결과와 충돌 없이 통합할 수 있는 구조를 먼저 만든다.
     */
    const bareunResult = createBareunResult(
      {
        revised: data?.revised || text,
        revised_blocks: revisedBlocks
      },
      text
    );

    const integrated = integrateCheckResults(text, {
      ruleResult,
      bareunResult
    });

    return res.status(200).json({
      // 기존 프론트엔드 호환 필드
      origin: data?.origin || text,
      revised: integrated.revised,
      revised_blocks: revisedBlocks,

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
