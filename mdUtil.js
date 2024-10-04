export class StringBuilder {
  constructor() {
    this.buffer = new Array();
  }

  append(str) {
    this.buffer.push(str);
    return this;
  }

  br() {
    this.buffer.push("\r\n");
    return this;
  }

  clearAndAppend(text) {
    this.buffer.splice(0, this.buffer.length);
    this.buffer.push(text);
    return this;
  }

  toString() {
    return this.buffer.join("");
  }
}

export function h1(text) {
  return `# ${text}`;
}
export function h2(text) {
  return `## ${text}`;
}
export function h3(text) {
  return `### ${text}`;
}

export function code(text) {
  return `\`${text}\``;
}

export function bold(text) {
  return `**${text}**`;
}

export function italic(text) {
  return `_${text}_`;
}

export function a(linkName, href) {
  return `[${linkName}](${href})`;
}

export function img(imgName, src) {
  return `![${imgName}](${src})`;
}

export function li(text) {
  return `- ${text}`;
}

export function formatCode(code, format = "kotlin") {
  return `\`\`\`${format}
${code}
\`\`\``;
}

export function separator() {
  return "---";
}

export function blockquote(text) {
  return `> ${text}`;
}

export function ol(index, text) {
  return `${index}. ${text}`;
}

export const escapeHTML = (str) =>
  str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[tag] || tag)
  );

export const unescapeHTML = (str) =>
  str.replace(
    /&amp;|&lt;|&gt;|&#39;|&quot;/g,
    (tag) =>
      ({
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&#39;": "'",
        "&quot;": '"',
      }[tag] || tag)
  );
