(async () => {
  try {
    const { NetworkUtils } = await import(
      chrome.runtime.getURL("/modules/NetworkUtils.js")
    );

    // ── TurndownService (inlined from turndown.js) ──────────────

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

    const hostname = location.hostname;

    function repeat(str, count) {
      let out = "";
      for (let i = 0; i < count; i++) out += str;
      return out;
    }

    function normalizeText(text) {
      if (!text) return "";
      return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t\f\v]+/g, " ");
    }

    function isStringBlank(str) {
      if (str === "") return true;
      for (const s of str) {
        if (s !== " ") return false;
      }
      return true;
    }

    function isAlphanumberic(str) {
      return /^[a-zA-Z0-9]+$/.test(str);
    }

    function checkIsNotation(str) {
      const trimStr = str.trim();
      return trimStr.length === 1 && !isAlphanumberic(trimStr);
    }

    function formatHasBlankText(originalText, formatTrimText) {
      const isFirstBlank = originalText.startsWith(" ");
      const isLastBlank = originalText.at(-1) === " ";
      let result = formatTrimText;
      if (isFirstBlank && isLastBlank) {
        result = " " + result + " ";
      } else if (isFirstBlank) {
        result = " " + result;
      } else if (isLastBlank) {
        result += " ";
      }
      return result;
    }

    function handleBlankText(text, formatText) {
      return formatHasBlankText(text, isStringBlank(text) ? text : formatText);
    }

    function swapMarkers(text) {
      return text.replace(/([`*]+)(.+?)([`*]+)/g, "$3$2$1");
    }

    function extractCode(node) {
      if (!node) return "";
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName.toLowerCase();
      if (tag === "br") return "\n";
      if (tag === "script" || tag === "style" || tag === "noscript") return "";

      let out = "";
      for (const child of Array.from(node.childNodes)) {
        out += extractCode(child);
      }
      return out;
    }

    function extractMarkdownLinks(input) {
      if (!input) return [];
      const regex = /\[(.*?)\]\((.*?)\)/g;
      const results = [];
      let match;
      while ((match = regex.exec(input)) !== null) {
        results.push({ text: match[1], url: match[2] });
      }
      return results;
    }

    function decodeVideoUrl(e) {
      const src = e.getAttribute("src");
      if (!src || !src.includes("youtube")) return null;
      const encodeUrl = src
        .split("&")
        .filter((target) => target.includes("url"))
        .map((url) => url.split("=")[1]);
      return `[video: ${e.getAttribute("title")}](${decodeURIComponent(encodeUrl)})\n\n`;
    }

    function getGistFormatCode(e) {
      let iframeDoc;
      const codeArray = [];
      try {
        iframeDoc = e.contentWindow && e.contentWindow.document;
      } catch (error) {
        return codeArray;
      }
      if (!iframeDoc) return codeArray;

      const gistDatas = iframeDoc.getElementsByClassName("gist-data");
      for (const gistCode of gistDatas) {
        const tbodyNode = gistCode.querySelector("tbody");
        if (tbodyNode) {
          const code = Array.from(tbodyNode.childNodes)
            .map((tr) => extractCode(tr).replace(/\n/g, "").substring(20))
            .filter((c) => c.trim() !== "")
            .join("\n");
          codeArray.push(code);
        }
      }
      return codeArray;
    }

    const codeStyle = "kotlin";

    function domToMarkdown(root) {
      const state = { listDepth: 0, orderedListNumberStack: [] };

      function processInline(node) {
        if (node.nodeType === Node.TEXT_NODE)
          return normalizeText(node.nodeValue);
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tag = node.tagName.toLowerCase();
        const childText = Array.from(node.childNodes)
          .map(processInline)
          .join("");

        if (tag === "strong" || tag === "b") {
          let formatted;
          if (!checkIsNotation(childText)) {
            formatted = handleBlankText(
              childText,
              "**" + childText.trim() + "**",
            );
          } else {
            formatted = "**" + childText.trim() + "**";
          }
          if (childText.includes("\n")) formatted += "\n";
          return formatted;
        }

        if (tag === "code") {
          const trimmed = childText.trim();
          let formattedText = "`" + trimmed + "`";
          if (trimmed.includes("[")) {
            const fullContext = extractMarkdownLinks(trimmed);
            if (fullContext.length) {
              formattedText =
                "[`" + fullContext[0].text + "`](" + fullContext[0].url + ")";
            }
          }
          return formatHasBlankText(childText, formattedText);
        }

        if (tag === "a") {
          const domainPrefix = "https://" + hostname;
          let href = node.getAttribute("href");
          if (href) {
            if (href.startsWith("#")) return "";
            if (!href.includes("https")) href = domainPrefix + href;
          }
          const text = childText.trim() || href || "";
          if (!href) return text;
          return "[" + text + "](" + href + ")";
        }

        if (tag === "br") return childText + "\n";
        return childText;
      }

      function processBlockChildren(parent, indentLevel) {
        return Array.from(parent.childNodes)
          .map((child) => processBlock(child, indentLevel))
          .join("");
      }

      function processChildSegments(parent, indentLevel) {
        return Array.from(parent.childNodes)
          .map((child) =>
            isBlockTag(child.tagName)
              ? processBlock(child, indentLevel)
              : processInline(child),
          )
          .join("");
      }

      function processListItem(liNode, indentLevel) {
        const parts = [];
        Array.from(liNode.childNodes).forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            isBlockTag(child.tagName)
          ) {
            parts.push(processBlock(child, indentLevel).trimEnd());
          } else {
            parts.push(swapMarkers(processInline(child)));
          }
        });
        return parts.join("").replace(/\s+\n/g, "\n").trim();
      }

      function processBlock(node, indentLevel) {
        indentLevel = indentLevel || 0;

        if (node.nodeType === Node.TEXT_NODE)
          return normalizeText(node.nodeValue);

        if (
          node.nodeType !== Node.ELEMENT_NODE &&
          node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE &&
          node.nodeType !== Node.DOCUMENT_NODE
        ) {
          return "";
        }

        if (
          node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
          node.nodeType === Node.DOCUMENT_NODE
        ) {
          return processBlockChildren(node, indentLevel);
        }

        const classAttr = node.getAttribute("class");
        if (classAttr && classAttr.includes("speechify-ignore")) return "";

        const role = node.getAttribute("role");
        if (role === "separator") return "\n\n---\n\n";

        const tag = node.tagName.toLowerCase();

        if (tag === "script" || tag === "style" || tag === "noscript")
          return "";

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
          return hashes + " " + swapMarkers(text) + "\n\n";
        }

        if (tag === "p") {
          const text = Array.from(node.childNodes).map(processInline).join("");
          if (!text) return "";
          return swapMarkers(text) + "\n\n";
        }

        if (tag === "br") return "  \n";
        if (tag === "hr") return "\n\n---\n\n";

        if (tag === "img") {
          const alt = node.getAttribute("alt") || "";
          const src = node.getAttribute("src") || "";
          if (!src || !src.includes("http")) return "";
          return "![" + alt + "](" + src + ")";
        }

        if (tag === "picture") {
          const source = node.querySelector("source");
          const srcset = source.getAttribute("srcset");
          const srcUrl = srcset ? srcset.split(",")[1].trim() : null;
          if (srcUrl) {
            const alt = node.getAttribute("alt") || "";
            return "![" + alt + "](" + srcUrl + ")";
          }
        }

        if (tag === "pre") {
          const codeNode = node.querySelector("code") || node;
          let codeText = extractCode(codeNode);
          codeText = codeText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
            .map((line) => (line ? "> " + line : ">"))
            .join("\n");
          return quoted + "\n\n";
        }

        if (tag === "ul" || tag === "ol") {
          state.listDepth++;
          if (tag === "ol") state.orderedListNumberStack.push(1);
          const lines = [];
          Array.from(node.children).forEach((child) => {
            if (child.tagName && child.tagName.toLowerCase() === "li") {
              const prefixIndent = repeat("  ", state.listDepth - 1);
              const marker =
                tag === "ul"
                  ? "- "
                  : state.orderedListNumberStack[
                      state.orderedListNumberStack.length - 1
                    ] + ". ";
              if (tag === "ol") {
                state.orderedListNumberStack[
                  state.orderedListNumberStack.length - 1
                ]++;
              }
              const liLines = processListItem(child, indentLevel);
              const liSplit = liLines.split("\n");
              liSplit.forEach((line, index) => {
                if (index === 0) {
                  lines.push(prefixIndent + marker + line);
                } else if (line.trim()) {
                  lines.push(prefixIndent + "  " + line);
                }
              });
            }
          });
          if (tag === "ol") state.orderedListNumberStack.pop();
          state.listDepth--;
          return lines.join("\n") + "\n\n";
        }

        if (tag === "li") return processListItem(node, indentLevel) + "\n";

        if (tag === "table") {
          const rows = Array.from(node.querySelectorAll("tr")).map((tr) => {
            const cells = Array.from(tr.children).map((cell) =>
              Array.from(cell.childNodes).map(processInline).join("").trim(),
            );
            return "| " + cells.join(" | ") + " |";
          });
          if (!rows.length) return "";
          const colCount = (rows[0].match(/\|/g) || []).length - 1;
          const headerSep = "|" + repeat(" --- |", colCount) + "";
          if (rows.length === 1) return rows[0] + "\n" + headerSep + "\n\n";
          return (
            rows[0] +
            "\n" +
            headerSep +
            "\n" +
            rows.slice(1).join("\n") +
            "\n\n"
          );
        }

        const children = processChildSegments(node, indentLevel);
        if (!children.trim()) return "";
        if (isBlockTag(tag)) return children + "\n\n";
        return children;
      }

      const result = processBlock(root, 0);
      return result.replace(/\n{3,}/g, "\n\n").trim() + "\n";
    }

    function TurndownService(options) {
      this.options = options || {};
    }
    TurndownService.prototype.turndown = function (input) {
      let root;
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

    // ── Page processing ──────────────────────────────────────────

    let fileName = "";
    let publishTime = "";
    let orgUrl = "";

    function getFileInfo() {
      const metaTags = document.getElementsByTagName("meta");
      for (const meta of metaTags) {
        const property = meta.getAttribute("property");
        if (property === "og:title") {
          fileName = `${publishTime} ${meta.getAttribute("content")}.md`;
        } else if (property === "article:published_time") {
          publishTime = meta.getAttribute("content").split("T")[0];
        } else if (property === "og:url") {
          orgUrl = meta.getAttribute("content");
          break;
        }
      }
      return [fileName, "[" + orgUrl + "](" + orgUrl + ")"];
    }

    function getContentRoot() {
      const article = document.querySelector("article");
      if (article) return article;
      const main = document.querySelector("main");
      if (main) return main;
      return document.body || document.documentElement;
    }

    async function convertPageToMarkdown() {
      const contentRoot = getContentRoot();
      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        emDelimiter: "_",
      });

      const markdown = turndownService.turndown(contentRoot);
      const [fname, orgUrl] = getFileInfo();
      const markdownPlusUrl = orgUrl + "\n\n" + markdown;
      NetworkUtils.downloadFile(markdownPlusUrl, fname);
    }

    convertPageToMarkdown();
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
