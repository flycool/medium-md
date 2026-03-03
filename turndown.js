// Minimal HTML to Markdown converter exposing a TurndownService-compatible API.
// This is not the official Turndown implementation but provides a similar
// interface (new TurndownService().turndown(input)) suitable for converting
// typical article-style pages to Markdown inside this extension.

(function (root) {
  function isBlockTag(tagName) {
    if (!tagName) return false;
    const t = tagName.toLowerCase();
    return (
      [
        "address",
        "article",
        "aside",
        "blockquote",
        "canvas",
        "dd",
        "div",
        "dl",
        "dt",
        "fieldset",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "li",
        "main",
        "nav",
        "noscript",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tfoot",
        "ul",
        "button",
        "img",
        "script",
        "picture",
        "iframe",
      ].indexOf(t) !== -1
    );
  }

  const hostname = typeof location !== "undefined" ? location.hostname : null;

  function repeat(str, count) {
    let out = "";
    for (let i = 0; i < count; i++) out += str;
    return out;
  }

  function escapeMarkdown(text) {
    if (!text) return "";
    // Basic escaping for Markdown control characters.
    return text.replace(/([\\`*_{}[\]()#+\-!.>])/g, "\\$1");
  }

  function normalizeText(text) {
    if (!text) return "";
    // Preserve line breaks, but normalize spaces/tabs.
    // - Convert Windows/Mac line endings to \n
    // - Collapse consecutive spaces/tabs to a single space
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t\f\v]+/g, " ");
  }

  function domToMarkdown(root) {
    const state = {
      listDepth: 0,
      orderedListNumberStack: [],
    };

    // Extract text from a node, preserving <br> as "\n".
    // This is important for code blocks where syntax highlighting wraps lines
    // in spans and uses <br> for line breaks (common on blog platforms).
    function extractCode(node) {
      if (!node) return "";

      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || "";
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName.toLowerCase();
      if (tag === "br") {
        return "\n";
      }

      if (tag === "script" || tag === "style" || tag === "noscript") {
        return "";
      }

      let out = "";
      for (const child of Array.from(node.childNodes)) {
        out += extractCode(child);
      }
      return out;
    }

    function processInline(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.nodeValue);
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName.toLowerCase();
      const childText = Array.from(node.childNodes).map(processInline).join("");

      if (tag === "strong" || tag === "b") {
        let restText = childText;
        let isNotation = checkIsNotation(restText);

        let formatted = "";
        if (!isNotation) {
          const strongText = "**" + childText.trim() + "**";
          formatted = handleBlankText(childText, strongText);
        } else {
          formatted = restText;
        }

        return formatted;
      }

      // if (tag === "em" || tag === "i") {
      //   let restText = childText;
      //   let isNotation = checkIsNotation(restText);

      //   let formatted = "";
      //   if (!isNotation) {
      //     const emText = "_" + childText.trim() + "_";
      //     formatted = handleBlankText(childText, emText);
      //   } else {
      //     formatted = restText;
      //   }

      //   return formatted;
      // }

      if (tag === "code") {
        const trimmed = childText.trim();
        const formattedText = "`" + trimmed + "`";
        const formatted = formatHasBlankText(childText, formattedText);
        return formatted;
      }

      if (tag === "a") {
        const domainPrefix = "https://" + hostname;
        const httpPrefix = "https";
        let href = node.getAttribute("href");

        if (href) {
          if (href.startsWith("#")) return "";
          if (!href.includes(httpPrefix)) {
            href = domainPrefix + href;
          }
        }
        const text = childText.trim() || href || "";
        if (!href) {
          return text;
        }
        return "[" + text + "](" + href + ")";
      }

      if (tag === "br") {
        return childText + "\n";
      }

      return childText;
    }

    // Depth-first: process all child nodes as block elements (recurse with processBlock).
    function processBlockChildren(parent, indentLevel) {
      return Array.from(parent.childNodes)
        .map(function (child) {
          return processBlock(child, indentLevel);
        })
        .join("");
    }

    // Depth-first: process each child as block or inline by tag type; used for generic containers.
    function processChildSegments(parent, indentLevel) {
      return Array.from(parent.childNodes)
        .map(function (child) {
          return isBlockTag(child.tagName)
            ? processBlock(child, indentLevel)
            : processInline(child);
        })
        .join("");
    }

    function processBlock(node, indentLevel) {
      indentLevel = indentLevel || 0;

      const classAttr = node.getAttribute("class");
      if (classAttr && classAttr.includes("speechify-ignore")) {
        return "";
      }

      const role = node.getAttribute("role");
      if (role === "separator") {
        return "\n\n---\n\n";
      }

      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.nodeValue);
      }

      if (
        node.nodeType !== Node.ELEMENT_NODE &&
        node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE &&
        node.nodeType !== Node.DOCUMENT_NODE
      ) {
        return "";
      }

      // For document / fragment, depth-first over children as blocks.
      if (
        node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
        node.nodeType === Node.DOCUMENT_NODE
      ) {
        return processBlockChildren(node, indentLevel);
      }

      const tag = node.tagName.toLowerCase();

      if (tag === "script" || tag === "style" || tag === "noscript") {
        return "";
      }

      if (
        tag === "h1" ||
        tag === "h2" ||
        tag === "h3" ||
        tag === "h4" ||
        tag === "h5" ||
        tag === "h6"
      ) {
        const level = parseInt(tag[1], 10) || 1;
        const hashes = repeat("#", Math.min(level, 6));
        const text = Array.from(node.childNodes)
          .map(processInline)
          .join("")
          .trim();
        if (!text) return "";
        const stext = swapMarkers(text);
        return hashes + " " + stext + "\n\n";
      }

      if (tag === "p") {
        const text = Array.from(node.childNodes).map(processInline).join("");
        if (!text) return "";
        const stext = swapMarkers(text);
        return stext + "\n\n";
      }

      if (tag === "br") {
        return "  \n";
      }

      if (tag === "hr") {
        return "\n\n---\n\n";
      }

      if (tag === "img") {
        const alt = node.getAttribute("alt") || "";
        const src = node.getAttribute("src") || "";
        if (!src || !src.includes("http")) return "";
        return "![" + alt + "](" + src + ")";
      }

      const codeStyle = "kotlin";
      if (tag === "pre") {
        const codeNode = node.querySelector("code") || node;
        // Use a special extractor to preserve <br> as newlines.
        let codeText = extractCode(codeNode);
        // Normalize line endings but keep content/spacing intact.
        codeText = codeText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        // Trim leading/trailing newlines without eating inner structure.
        codeText = codeText.replace(/^\n+/, "").replace(/\n+$/, "");
        return "```" + codeStyle + "\n" + codeText + "\n```\n\n";
      }

      if (tag === "iframe") {
        const videoLink = decodeVideoUrl(node);
        if (videoLink) return videoLink;

        const gistCodes = getGistFormatCode(node);
        if (gistCodes.length) {
          return gistCodes
            .map((code) => "```" + codeStyle + "\n" + code + "\n```\n\n")
            .join("");
        }
      }

      if (tag === "blockquote") {
        const inner = processBlockChildren(node, indentLevel).trimEnd();
        if (!inner) return "";
        const quoted = inner
          .split("\n")
          .map(function (line) {
            return line ? "> " + line : ">";
          })
          .join("\n");
        return quoted + "\n\n";
      }

      if (tag === "ul" || tag === "ol") {
        state.listDepth++;
        if (tag === "ol") {
          state.orderedListNumberStack.push(1);
        }
        const lines = [];
        Array.from(node.children).forEach(function (child) {
          if (child.tagName && child.tagName.toLowerCase() === "li") {
            const prefixIndent = repeat("  ", state.listDepth - 1);
            let marker;
            if (tag === "ul") {
              marker = "- ";
            } else {
              const num =
                state.orderedListNumberStack[
                  state.orderedListNumberStack.length - 1
                ];
              marker = num + ". ";
              state.orderedListNumberStack[
                state.orderedListNumberStack.length - 1
              ] = num + 1;
            }

            const liLines = processListItem(child, indentLevel);
            const liSplit = liLines.split("\n");
            liSplit.forEach(function (line, index) {
              if (index === 0) {
                lines.push(prefixIndent + marker + line);
              } else if (line.trim()) {
                lines.push(prefixIndent + "  " + line);
              }
            });
          }
        });
        if (tag === "ol") {
          state.orderedListNumberStack.pop();
        }
        state.listDepth--;
        return lines.join("\n") + "\n\n";
      }

      if (tag === "li") {
        // Handled in UL/OL, but if encountered alone, treat as paragraph.
        return processListItem(node, indentLevel) + "\n";
      }

      // Tables: extremely simplified, treat cells as pipe-separated text.
      if (tag === "table") {
        const rows = Array.from(node.querySelectorAll("tr")).map(function (tr) {
          const cells = Array.from(tr.children).map(function (cell) {
            return Array.from(cell.childNodes)
              .map(processInline)
              .join("")
              .trim();
          });
          return "| " + cells.join(" | ") + " |";
        });
        if (!rows.length) return "";
        // Add a simple header separator if we have at least one row.
        const header = rows[0];
        const colCount = (header.match(/\|/g) || []).length - 1;
        const headerSep = "|" + repeat(" --- |", colCount) + "";
        if (rows.length === 1) {
          return rows[0] + "\n" + headerSep + "\n\n";
        }
        return (
          rows[0] + "\n" + headerSep + "\n" + rows.slice(1).join("\n") + "\n\n"
        );
      }

      // Generic block container: depth-first, each child as block or inline.
      const children = processChildSegments(node, indentLevel);

      if (!children.trim()) {
        return "";
      }

      if (isBlockTag(tag)) {
        return children + "\n\n";
      }

      return children;
    }

    function decodeVideoUrl(e) {
      const src = e.getAttribute("src");
      if (src === null || !src.includes("youtube")) return;

      const encodeUrl = src
        .split("&")
        .filter((target) => {
          return target.includes("url");
        })
        .map((url) => {
          return url.split("=")[1];
        });

      const title = e.getAttribute("title");
      const decodeUrl = decodeURIComponent(encodeUrl);
      // const alink = markdown.a(`video: ${title}`, decodeUrl);
      const alink = `[video: ${title}](${decodeUrl})`;

      return alink + "\n\n";
    }

    // get gist code from iframe
    function getGistFormatCode(e) {
      let iframdom;
      const codeArray = [];
      try {
        iframdom = e.contentWindow && e.contentWindow.document;
      } catch (error) {
        return codeArray;
      }

      if (iframdom) {
        const gistDatas = iframdom.getElementsByClassName("gist-data");
        for (const gitstCode of gistDatas) {
          const tbodyNode = gitstCode.querySelector("tbody");
          if (tbodyNode) {
            const trTags = tbodyNode.childNodes;
            const code = Array.from(trTags)
              .map((tr) => {
                const c = extractCode(tr);
                // removed the first 20 blank chars
                const formatc = c.replace(/\n/g, "").substring(20);
                return formatc;
              })
              .filter((c) => c.trim() !== "")
              .join("\n");

            codeArray.push(code);
          }

          // const codea = gitstCode.textContent.split("\n");
          // const blankLen = codea[1].length;
          // const cmap = [...codea]
          //   .map((c) => {
          //     return c.substring(blankLen, c.length);
          //   })
          //   .filter((c) => {
          //     return c.length > 2;
          //   });
          // const markdown = await this.markdown;
          // const codeSb = markdown.createStringBuffer();

          // cmap.forEach((c, index, map) => {
          //   codeSb.append(c);
          //   if (index !== cmap.length - 1) {
          //     codeSb.br();
          //   }
          // });

          // codeArray.push(codeSb.toString());
        }
      }
      return codeArray;
    }

    function swapMarkers(text) {
      return text.replace(/([`*_]+)(.+?)([`*_]+)/g, "$3$2$1");
    }

    function processListItem(liNode, indentLevel) {
      const parts = [];
      Array.from(liNode.childNodes).forEach(function (child) {
        if (child.nodeType === Node.ELEMENT_NODE && isBlockTag(child.tagName)) {
          parts.push(processBlock(child, indentLevel).trimEnd());
        } else {
          const text = processInline(child);
          const stext = swapMarkers(text);
          parts.push(stext);
        }
      });
      const joined = parts.join("").replace(/\s+\n/g, "\n").trim();
      return joined;
    }

    const result = processBlock(root, 0);
    // Normalize excessive blank lines.
    return result.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function TurndownService(options) {
    this.options = options || {};
  }

  function handleBlankText(text, formatText) {
    const st = isStringBlank(text) ? text : formatText;
    return formatHasBlankText(text, st);
  }

  function checkIsNotation(str) {
    let trimStr = str.trim();
    return trimStr.length === 1 && !isAlphanumberic(trimStr);
  }

  function isAlphanumberic(str) {
    return /^[a-zA-Z0-9]+$/.test(str);
  }

  function isStringBlank(str) {
    if (str === "") return true;
    for (const s of str) {
      if (s !== " ") {
        return false;
      }
    }
    return true;
  }

  function formatHasBlankText(originalText, formatTrimText) {
    const isFirstBlank = originalText.startsWith(" ");
    const isLastBlank = originalText.at(-1) === " ";

    let result = formatTrimText;
    const blank = " ";

    if (isFirstBlank && isLastBlank) {
      result = blank + result + blank;
    } else if (isFirstBlank) {
      result = blank + result;
    } else if (isLastBlank) {
      result += blank;
    }
    return result;
  }

  TurndownService.prototype.turndown = function (input) {
    let root;
    if (typeof document === "undefined") {
      throw new Error("TurndownService in this build requires a browser DOM.");
    }

    if (typeof input === "string") {
      const template = document.createElement("template");
      template.innerHTML = input;
      root = template.content;
    } else if (
      input &&
      (input.nodeType === Node.ELEMENT_NODE ||
        input.nodeType === Node.DOCUMENT_NODE ||
        input.nodeType === Node.DOCUMENT_FRAGMENT_NODE)
    ) {
      root = input;
    } else {
      root = document.body || document.documentElement;
    }

    return domToMarkdown(root);
  };

  // Expose globally.
  root.TurndownService = TurndownService;
})(typeof window !== "undefined" ? window : this);
