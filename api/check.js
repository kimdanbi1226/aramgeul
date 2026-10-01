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

    const revisedBlocks = Array.isArray(data?.revised_blocks)
      ? data.revised_blocks.map(block => {
          const helpId = block?.revisions?.[0]?.help_id;
          const help = helpId && data?.helps?.[helpId]?.comment
            ? data.helps[helpId].comment
            : '';

          return {
            origin: {
              text: block?.origin?.text || ''
            },
            revised: block?.revised || '',
            help
          };
        })
      : [];

    return res.status(200).json({
      origin: data?.origin || text,
      revised: data?.revised || text,
      revised_blocks: revisedBlocks
    });
  } catch (error) {
    console.error('Check API error:', error);
    return res.status(500).json({
      error: '검사 처리 중 오류가 발생했습니다.'
    });
  }
}
