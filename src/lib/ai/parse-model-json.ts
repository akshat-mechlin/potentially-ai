/**
 * Parse JSON from LLM responses. Gemini sometimes emits raw newlines inside strings.
 */
export function parseModelJson<T>(text: string): T {
  const candidates = collectJsonCandidates(text);

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
      try {
        return JSON.parse(repairJsonText(candidate)) as T;
      } catch (repairError) {
        lastError = repairError;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to parse model JSON");
}

function collectJsonCandidates(text: string): string[] {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const candidates = new Set<string>();
  candidates.add(withoutFence);

  const objectStart = withoutFence.indexOf("{");
  const objectEnd = withoutFence.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.add(withoutFence.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = withoutFence.indexOf("[");
  const arrayEnd = withoutFence.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.add(withoutFence.slice(arrayStart, arrayEnd + 1));
  }

  return [...candidates];
}

function repairJsonText(json: string): string {
  let repaired = json
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'");

  repaired = escapeControlCharsInJsonStrings(repaired);
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");
  return repaired;
}

function escapeControlCharsInJsonStrings(json: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        result += "\\n";
        continue;
      }
      if (char === "\r") {
        if (json[i + 1] === "\n") i++;
        result += "\\n";
        continue;
      }
      if (char === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
}
