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

  const groups = [];

  for (const edit of sorted) {
    const previous = groups[groups.length - 1];
    if (
      previous &&
      previous.rule.rule_id === edit.rule.rule_id &&
      edit.start <= previous.end + 1
    ) {
      previous.edits.push(edit);
      previous.end = Math.max(previous.end, edit.end);
    } else {
      groups.push({
        rule: edit.rule,
        start: edit.start,
        end: edit.end,
        edits: [edit]
      });
    }
  }

  return groups.map((group, index) => {
    const contextStart = Math.max(0, source.lastIndexOf(' ', Math.max(0, group.start - 1)) + 1);
    const nextSpace = source.indexOf(' ', group.end);
    const contextEnd = nextSpace >= 0 ? nextSpace : Math.min(source.length, group.end + 8);

    const originText = source.slice(contextStart, contextEnd);
    const revisedContext = applyRuleEditsToText(
      originText,
      group.edits.map(candidate => ({
        ...candidate,
        start: candidate.start - contextStart,
        end: candidate.end - contextStart
      }))
    );

    const deltaBefore = sorted
      .filter(candidate => candidate.start < group.start)
      .reduce(
        (sum, candidate) =>
          sum + candidate.replacement.length - (candidate.end - candidate.start),
        0
      );

    const groupDelta = group.edits.reduce(
      (sum, candidate) =>
        sum + candidate.replacement.length - (candidate.end - candidate.start),
      0
    );

    const displayStart = Math.max(0, group.start + deltaBefore - 1);
    const displayEnd = group.end + deltaBefore + groupDelta;

    return {
      id: 'rule-' + index + '-' + group.rule.rule_id,
      origin: {
        text: originText,
        start: contextStart,
        end: contextEnd
      },
      revised: revisedContext,
      revised_start: displayStart,
      revised_end: displayEnd,
      rule: group.rule,
      rules: [group.rule],
      help: group.rule.description || '',
      source: 'aramgeul-rule',
      rule_edit: {
        start: group.start,
        end: group.end,
        replacement: group.edits.map(edit => edit.replacement).join('')
      },
      rule_edits: group.edits.map(edit => ({
        start: edit.start,
        end: edit.end,
        replacement: edit.replacement
      }))
    };
  });
}
