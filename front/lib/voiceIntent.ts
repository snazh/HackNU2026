/**
 * Decide Diagram vs Brainstorm from spoken / pasted text.
 * Default: brainstorm with the full text when no diagram cue is found.
 */
export function parseVoiceIntent(raw: string): {
  kind: "diagram" | "brainstorm";
  prompt: string;
} | null {
  const text = raw.trim();
  if (!text) return null;

  const diagramLead =
    /^(diagram|flowchart|agent|агент|схема|диаграмм[а-яё]*)\s*[:\-]?\s*/i;
  const brainstormLead = /^(brainstorm|брейншторм|ideas|идеи)\s*[:\-]?\s*/i;

  if (diagramLead.test(text)) {
    const prompt = text.replace(diagramLead, "").trim() || text;
    return { kind: "diagram", prompt };
  }
  if (brainstormLead.test(text)) {
    const prompt = text.replace(brainstormLead, "").trim() || text;
    return { kind: "brainstorm", prompt };
  }

  const diagramWord = /\b(diagram|flowchart|диаграмм[а-яё]*|agent|агент)\b/i.exec(
    text
  );
  const brainstormWord = /\b(brainstorm|брейншторм)\b/i.exec(text);

  if (diagramWord && (!brainstormWord || diagramWord.index <= brainstormWord.index)) {
    const after = text.slice(diagramWord.index + diagramWord[0].length).trim();
    return { kind: "diagram", prompt: after || text };
  }
  if (brainstormWord) {
    const after = text.slice(brainstormWord.index + brainstormWord[0].length).trim();
    return { kind: "brainstorm", prompt: after || text };
  }

  return { kind: "brainstorm", prompt: text };
}
