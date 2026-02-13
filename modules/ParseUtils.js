export class ParseUtils {
  // 使用立即执行函数进行一次性初始化
  static markdown = (async () => {
    const { MarkdownUtils } = await import(
      chrome.runtime.getURL("/modules/MarkdownUtils.js")
    );
    return MarkdownUtils;
  })();

  // return value : true 表示此elelment不处理它的children
  static async parseElement(sb, node) {
    // 直接使用已初始化的模块（如果还在加载中会等待）
    const markdown = await this.markdown;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      sb.append(text);
      return true;
    }

    if (
      node.nodeType !== Node.ELEMENT_NODE &&
      node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE &&
      node.nodeType !== Node.DOCUMENT_NODE
    ) {
      return "";
    }

    const tag = node.tagName.toLowerCase();

    if (
      tag === "h1" ||
      tag === "h2" ||
      tag === "h3" ||
      tag === "h4" ||
      tag === "h5" ||
      tag === "h6"
    ) {
      const level = parseInt(tag[1], 10) || 1;
      const hashes = this.repeat("#", Math.min(level, 6));
      const text = Array.from(node.childNodes)
        .map((n) => {
          const re = this.processInline(n);
          return this.swapMarkers(re);
        })
        .join("");
      sb.append(hashes + " " + text)
        .br()
        .br();
      return true;
    }

    if (tag === "p") {
      const text = Array.from(node.childNodes)
        .map((n) => {
          const re = this.processInline(n);
          return this.swapMarkers(re);
        })
        .join("");
      sb.append(text).br().br();
      return true;
    }

    if (tag === "blockquote") {
      const inner = Array.from(node.childNodes)
        .map((n) => this.processBlockChildren(n))
        .join("\n");

      if (!inner) return "";
      const quoted = inner
        .split("\n")
        .map(function (line) {
          return line ? "> " + line : ">";
        })
        .join("\n");
      sb.append(quoted).br().br();
      return true;
    }

    if (tag === "div") {
      const attr = node.getAttribute("role");
      if (attr === "separator") {
        sb.append(markdown.separator()).br().br();
        return true;
      }
    }

    if (tag === "a") {
      const h2Node = node.querySelector("h2");
      const h2Text = h2Node?.textContent;

      let link = node.getAttribute("href");
      if (link && link.includes("post_audio_button")) {
        return false;
      }
      const a1 = markdown.a(h2Text ? h2Text : link, link);
      sb.append(a1).br().br();
      return true;
    }

    if (tag === "pre") {
      const codeText = this.extractCode(node);
      sb.append(markdown.formatCode(codeText)).br().br();
      return true;
    }

    if (tag === "code") {
      const lang = node.hasAttribute("lang");
      if (lang) {
        const result = this.extractCode(node);
        sb.append(markdown.formatCode(result)).br().br();
        return true;
      }
    }
    if (tag === "span") {
      const hasAttr = node.hasAttribute("data-selectable-paragraph");
      if (hasAttr) {
        const result = this.extractCode(node);
        sb.append(markdown.formatCode(result)).br().br();
        return true;
      }
    }

    if (tag === "iframe") {
      this.decodeVideoUrl(node, sb, markdown);

      const codes = await this.getGistFormatCode(node);

      codes.forEach((code) => {
        const fcode = markdown.formatCode(code);
        sb.append(fcode).br().br();
      });
      return true;
    }

    if (tag === "img") {
      let imglink = node?.getAttribute("src");
      if (imglink) {
        if (!imglink.includes("https")) {
          imglink = "https:" + imglink;
        }
        const imgText = markdown.img("", imglink);
        sb.append(imgText).br();
        sb.br().br();
      }
      return true;
    }

    if (tag === "figure") {
      const imgElement = node.getElementsByTagName("img")[0];
      const figcaptionElement = node.getElementsByTagName("figcaption")[0];
      const imgUrl = imgElement?.getAttribute("src");
      if (imgUrl && imgUrl !== "") {
        const imgText = markdown.img("", imgUrl);
        sb.append(imgText).br();

        if (figcaptionElement) {
          sb.append(figcaptionElement.textContent);
        }
        sb.br().br();
        return true;
      }
    }

    if (tag === "ol") {
      [...node.children].forEach((li, index) => {
        const firstItem = `${index + 1}. `;
        const childText = Array.from(li.childNodes)
          .map((n) => {
            const re = this.processInline(n);
            return this.swapMarkers(re);
          })
          .join("");
        const text = firstItem + childText;
        sb.append(text).br().br();
      });
      return true;
    }

    if (tag === "ul") {
      if (node.firstElementChild?.tagName.toLowerCase() === "ul") {
        // don't handle the first ul element if exist
        return false;
      }
      [...node.children].forEach((el) => {
        const elTagName = el.tagName.toLowerCase();
        let firstItem = "";
        if (elTagName === "li") {
          firstItem = "- ";
          const childText = Array.from(el.childNodes)
            .map((n) => {
              const re = this.processInline(n);
              return this.swapMarkers(re);
            })
            .join("");
          const text = firstItem + childText;
          sb.append(text).br().br();
        } else if (elTagName === "div") {
          const imgEl = el.firstElementChild;
          if (imgEl) {
            const firsTagName = imgEl.tagName.toLowerCase();
            if (firsTagName === "img") {
              const inImgLink = imgEl.getAttribute("src");
              const imgText = markdown.img("", inImgLink);
              sb.append(imgText).br();
            }
          }
        } else if (elTagName === "imgcaption") {
          const imgdes = el.textContent;
          sb.append(imgdes).br().br();
        }
      });
      return true;
    }

    return false;
  }

  static processBlockChildren(parent) {
    if (!parent.childNodes) {
      return "";
    }
    const text = Array.from(parent.childNodes)
      .map((n) => {
        const re = this.processInline(n);
        return this.swapMarkers(re);
      })
      .join("");

    return text;
  }

  static swapMarkers(text) {
    return text.replace(/^([`*_]+)(.+?)([`*_]+)$/, "$3$2$1");
  }

  static processInline(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = node.tagName?.toLowerCase();

    const childText = Array.from(node.childNodes)
      .map((n) => this.processInline(n))
      .join("");

    if (tag === "strong" || tag === "b") {
      let restText = childText;
      let isNotation = this.checkIsNotation(restText);

      let formatted = ""
      if(!isNotation) {
        const strongText = "**" + childText.trim() + "**";
        formatted = this.handleBlankText(childText, strongText);
      } else {
        formatted = restText;
      }
      
      return formatted;
    }

    if (tag === "em" || tag === "i") {
      let restText = childText;
      let isNotation = this.checkIsNotation(restText);

      let formatted = ""
      if(!isNotation) {
        const emText = "_" + childText.trim() + "_";
        formatted = this.handleBlankText(childText, emText);
      } else {
        formatted = restText;
      }
      
      return formatted;
    }

    if (tag === "code") {
      const trimmed = childText.trim();
      const formattedText = "`" + trimmed + "`";
      const formatted = this.formatHasBlankText(childText, formattedText);
      return formatted;
    }

    if (tag === "a") {
      const href = node.getAttribute("href");
      const text2 = childText.trim() || href || "";
      if (!href) {
        return text2;
      }
      return "[" + text2 + "](" + href + ")";
    }

    if (tag === "img") {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src") || "";
      if (!src) return "";
      return "![" + alt + "](" + src + ")";
    }

    if (tag === "br") {
      return childText + "\n";
    }

    // Fallback: inline children
    return childText;
  }

  // static parseParagraph(sb, e, firstItem = "", markdown) {
  //   const patternOuterHtml = />([^<]+)</g; // 排除 >< 空字符

  //   const outerHTML = e.outerHTML;
  //   // console.log("outerhtml==", outerHTML);

  //   let orgWordArray = [];
  //   let brArray = outerHTML.split("<br>");

  //   if (brArray.length > 1) {
  //     for (let tag of brArray) {
  //       let brHtml = ">" + tag + "<"; // to fit patternOuterHtml
  //       let tagArray = this.formatHtmlToArray(brHtml, patternOuterHtml);

  //       tagArray.push("\r\n");
  //       orgWordArray.push(...tagArray);
  //     }

  //     orgWordArray.pop(); // remove the last br
  //   } else {
  //     orgWordArray = this.formatHtmlToArray(outerHTML, patternOuterHtml);
  //   }

  //   // console.log("orgWordArray:=", orgWordArray);

  //   let loopIndex = 0;

  //   const children = e.children;
  //   for (const child of children) {
  //     const tName = child.tagName.toLowerCase();
  //     const originalText = child.textContent;
  //     let formatCode = originalText;

  //     if (tName === "code" || tName === "span") {
  //       const codeText = markdown.code(originalText);
  //       formatCode = codeText;

  //       const strongTag = child.getElementsByTagName("strong")[0];
  //       if (strongTag !== undefined) {
  //         const codeStrongText = this.formatHasBlankText(
  //           codeText,
  //           markdown.bold(codeText),
  //         );
  //         formatCode = codeStrongText;
  //       }

  //       const aTag = child.getElementsByTagName("a")[0];
  //       if (aTag !== undefined) {
  //         const link = aTag.getAttribute("href");
  //         const alink = markdown.a(codeText, link);
  //         formatCode = alink;
  //       }

  //       loopIndex = this.formatArray(
  //         loopIndex,
  //         originalText,
  //         orgWordArray,
  //         formatCode,
  //       );
  //     } else if (tName === "strong" || tName === "b") {
  //       let restText = originalText;
  //       let isNotation = this.checkIsNotation(restText);

  //       if (!isNotation) {
  //         const strongText = this.handleStrongBlankText(originalText, markdown);
  //         formatCode = strongText;
  //       } else {
  //         formatCode = restText;
  //       }

  //       const atag = child.getElementsByTagName("a")[0];
  //       if (atag !== undefined) {
  //         const aText = atag.textContent;
  //         const aStrongText = markdown.bold(aText);
  //         const link = atag.getAttribute("href");
  //         const alink = markdown.a(aStrongText, link);
  //         formatCode = alink;
  //         restText = aText;
  //       }

  //       if (restText !== "") {
  //         loopIndex = this.formatArray(
  //           loopIndex,
  //           restText,
  //           orgWordArray,
  //           formatCode,
  //         );
  //       }
  //     } else if (tName === "a") {
  //       const link = child.getAttribute("href");
  //       const a1 = markdown.a(originalText, link);
  //       formatCode = a1;

  //       loopIndex = this.formatArray(
  //         loopIndex,
  //         originalText,
  //         orgWordArray,
  //         formatCode,
  //       );
  //     }
  //   }

  //   if (firstItem !== "") {
  //     orgWordArray.unshift(firstItem);
  //   }

  //   orgWordArray = orgWordArray.map((s) => {
  //     return this.replaceApostrophen(s);
  //   });

  //   // console.log("orgWordArray2:=", orgWordArray);

  //   sb.append(orgWordArray.join(""));

  //   return sb;
  // }

  ///////////////////////////////////////////////

  // get gist code from iframe
  static async getGistFormatCode(e) {
    let iframdom;
    const codeArray = new Array();
    try {
      iframdom = e.contentWindow.document;
    } catch (error) {
      return codeArray;
    }
    if (iframdom) {
      const gistDatas = iframdom.getElementsByClassName("gist-data");
      for (const gitstCode of gistDatas) {
        const codea = gitstCode.textContent.split("\n");
        const blankLen = codea[1].length;
        const cmap = [...codea]
          .map((c) => {
            return c.substring(blankLen, c.length);
          })
          .filter((c) => {
            return c.length > 2;
          });
        const markdown = await this.markdown;
        const codeSb = markdown.createStringBuffer();

        cmap.forEach((c, index, map) => {
          codeSb.append(c);
          if (index !== cmap.length - 1) {
            codeSb.br();
          }
        });

        codeArray.push(codeSb.toString());
      }
    }
    return codeArray;
  }

  static extractCode(node) {
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
      out += this.extractCode(child);
    }
    return out;
  }

  static decodeVideoUrl(e, sb, markdown) {
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
    const alink = markdown.a(`video: ${title}`, decodeUrl);

    sb.append(alink).br().br();
  }

  static formatHasBlankText(originalText, formatTrimText) {
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

  static repeat(str, count) {
    return new Array(count + 1).join(str);
  }

  static checkIsNotation(str) {
    let trimStr = str.trim();
    return trimStr.length === 1 && !this.isAlphanumberic(trimStr);
  }

  static isAlphanumberic(str) {
    return /^[a-zA-Z0-9]+$/.test(str);
  }

  static isStringBlank(str) {
    if (str === "") return true;
    for (const s of str) {
      if (s !== " ") {
        return false;
      }
    }
    return true;
  }

  static handleBlankText(text, formatText) {
    const st = this.isStringBlank(text) ? text : formatText;
    return this.formatHasBlankText(text, st);
  }

  // 将 ’（中文）改成 '(英文的)
  // static replaceApostrophen(content) {
  //   return content.replace(/’/g, "'");
  // }

  // static formatArray(index, originalText, array, formatCode) {
  //   for (let i = index; i < array.length; i++) {
  //     const w = array[i];
  //     if (originalText === w) {
  //       array[i] = formatCode;
  //       return i + 1;
  //     }
  //   }
  //   return 0;
  // }

  // static formatHtmlToArray(html, pattern) {
  //   return Array.from(html.matchAll(pattern), (m) => m[1]).map((s) => {
  //     return this.unescapeHTML(s);
  //   });
  // }

  // static escapeHTML = (str) =>
  //   str.replace(
  //     /[&<>'"]/g,
  //     (tag) =>
  //       ({
  //         "&": "&amp;",
  //         "<": "&lt;",
  //         ">": "&gt;",
  //         "'": "&#39;",
  //         '"': "&quot;",
  //       })[tag] || tag,
  //   );

  // static unescapeHTML = (str) =>
  //   str.replace(
  //     /&amp;|&lt;|&gt;|&#39;|&quot;/g,
  //     (tag) =>
  //       ({
  //         "&amp;": "&",
  //         "&lt;": "<",
  //         "&gt;": ">",
  //         "&#39;": "'",
  //         "&quot;": '"',
  //       })[tag] || tag,
  //   );
}
