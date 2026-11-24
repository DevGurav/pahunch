/**
 * Parses one line of Playwright's aria snapshot, e.g. `- heading "Passport Seva" [level=1]`,
 * `- textbox`, `- text: Continue`, `- paragraph: Login ID *`. Property lines such as
 * `- /url: /home` return undefined.
 */
export interface AriaLine {
  indent: number;
  role: string;
  name: string;
  attrs: string[];
  /** Text written after the colon, e.g. "Continue" in `- text: Continue`. */
  inline: string;
}

const LINE = /^(\s*)- (.*)$/;
const NODE = /^([a-z][\w-]*)(?: "((?:[^"\\]|\\.)*)")?((?: \[[^\]]*\])*)(?::(?: (.*))?)?$/;

function unquote(value: string): string {
  const t = value.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    try {
      return JSON.parse(t) as string;
    } catch {
      return t.slice(1, -1);
    }
  }
  return t;
}

export function parseAriaLine(line: string): AriaLine | undefined {
  const m = LINE.exec(line);
  if (!m) return undefined;
  const indent = m[1]!.length;
  const rest = m[2]!;
  if (rest.startsWith('/')) return undefined;
  if (rest.startsWith('text:')) return { indent, role: 'text', name: '', attrs: [], inline: unquote(rest.slice(5)) };

  const n = NODE.exec(rest);
  if (!n) return undefined;
  let name = '';
  if (n[2] !== undefined) {
    try {
      name = JSON.parse(`"${n[2]}"`) as string;
    } catch {
      name = n[2];
    }
  }
  const attrs = (n[3] ?? '').match(/\[[^\]]*\]/g)?.map((a) => a.slice(1, -1)) ?? [];
  return { indent, role: n[1]!, name, attrs, inline: n[4] !== undefined ? unquote(n[4]) : '' };
}
