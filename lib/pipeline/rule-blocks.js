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

export function buildRuleFallbackBlocks(source, edits) {
  if (typeof source !== 'string' || !Array.isArray(edits)) return [];

  const sorted = [...edits]
    .filter(edit =>
      edit &&
      Number.isInteger(edit.start) &&
      Number.isInteger(edit.end) &&
      edit.start >= 0 &&
      edit.end >= edit.start &&
      typeof edit.replacement === 'string' &&
      edit.rule
    )
    .sort((a, b) => a.start - b.start);

  return sorted.map((edit, index) => {
    const contextStart = Math.max(0, edit.start - 8);
    const contextEnd = Math.min(
      source.length,
      Math.max(edit.end, edit.start) + 8
    );

    const relevantEdits = sorted.filter(candidate =>
      candidate.start >= contextStart &&
      candidate.end <= contextEnd
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
        (sum, candidate) =>
          sum + candidate.replacement.length - (candidate.end - candidate.start),
        0
      );

    const revisedStart = edit.start + deltaBefore;
    const revisedEnd = revisedStart + edit.replacement.length;

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
      }
    };
  });
}
