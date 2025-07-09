(() => {
  class StringBuilder {
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

  function h1(text) {
    return `# ${text}`;
  }
  function h2(text) {
    return `## ${text}`;
  }
  function h3(text) {
    return `### ${text}`;
  }

  function code(text) {
    return `\`${text}\``;
  }

  function bold(text) {
    return `**${text}**`;
  }

  function italic(text) {
    return `_${text}_`;
  }

  function a(linkName, href) {
    return `[${linkName}](${href})`;
  }

  function img(imgName, src) {
    return `![${imgName}](${src})`;
  }

  function li(text) {
    return `- ${text}`;
  }

  function formatCode(code, format = "kotlin") {
    return `\`\`\`${format}
${code}
\`\`\``;
  }

  function separator() {
    return "---";
  }

  function br() {
    return "\r\n";
  }

  function blockquote(text) {
    return `> ${text}`;
  }

  function ol(index, text) {
    return `${index}. ${text}`;
  }

  const downloadFile = function (content, name) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  //   window.addEventListener("load", (e) => {
  //     console.log("page fully load");
  //     downloadFile(parseMedium(""), fileName);
  //   });

  // (async () => {
  //   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //     console.log("message", message);

  //     if(message.type === 'onclick') {
  //       downloadFile(parseMedium(""), fileName);
  //     }
  //   })
  // })();

  let fileName = "";
  let publishTime = "";
  let orgUrl = "";

  const parseMedium = function () {
    const hSet = new Set();
    hSet.add("Follow");
    hSet.add("ProAndroidDev");
    hSet.add("Listen");
    hSet.add("Share");
    hSet.add("More");

    const sb = new StringBuilder();

    // get the file name
    const metaTags = document.getElementsByTagName("meta");
    for (meta of metaTags) {
      const property = meta.getAttribute("property");
      if (property === "og:title") {
        const title = meta.getAttribute("content");
        fileName = `${publishTime} ${title}.md`;
      } else if (property === "article:published_time") {
        const ptime = meta.getAttribute("content");
        const ptimeString = ptime.split("T")[0];
        publishTime = ptimeString;
      } else if (property === "og:url") {
        const url = meta.getAttribute("content");
        orgUrl = url;
        sb.append(orgUrl).br().br();
        break;
      }
    }

    const article = document.getElementsByTagName("article")[0];
    const articleAllElements = article.getElementsByTagName("*");

    [...articleAllElements].forEach((e) => {
      const tagName = e.tagName.toLowerCase();

      switch (tagName) {
        case "button":
          hSet.add(e.textCotent);
          break;
        case "div":
          const attr = e.getAttribute("role");
          if (attr === "separator") {
            sb.append(separator()).br().br();
            return;
          }

          const aChild = e.firstElementChild;
          if (aChild && aChild.tagName.toLowerCase() === "a") {
            const atext = aChild.textContent;
            if (
              aChild.getAttribute("data-testid") === "publicationName" ||
              atext === undefined ||
              atext === ""
            ) {
              return;
            }

            const h2e = e.getElementsByTagName("h2")[0];
            const h2Text = h2e?.textContent;

            let link = aChild.getAttribute("href");
            if (link.includes("post_audio_button")) {
              return;
            }
            if (!link.startsWith("https://")) {
              link = "https://proandroiddev.com" + link;
            }
            const a1 = a(h2Text ? h2Text : link, link);
            sb.append(a1).br().br();

            hSet.add(h2Text ? h2Text : "");

            const h3e = e.getElementsByTagName("h3")[0];
            hSet.add(h3e?.textContent);

            const pe = e.getElementsByTagName("p")[0];
            hSet.add(pe?.textContent);
          }
          break;
        case "h1":
          const hone = h1(e.textContent);
          const honeText = replaceApostrophen(hone);
          sb.append(honeText).br().br();
          break;
        case "h2":
          if (hSet.has(e.textContent)) {
            return;
          }
          const htwo = h2(e.textContent);
          const htwoText = replaceApostrophen(htwo);
          sb.append(htwoText).br().br();
          break;
        case "h3":
          if (hSet.has(e.textContent)) {
            return;
          }
          const hthree = h3(e.textContent);
          const hthreeText = replaceApostrophen(hthree);
          sb.append(hthreeText).br().br();
          break;
        case "p":
          const pe = e.firstElementChild;
          if (pe && pe.tagName.toLowerCase() === "button") {
            return;
          }
          if (
            e.parentElement.tagName.toLowerCase() === "blockquote" ||
            hSet.has(e.textContent)
          ) {
            return;
          }

          parseParagraph(sb, e, e.textContent).br().br();
          break;
        // case "pre":
        //   const firstSpan = e.firstElementChild;
        //   const codeSnippet = firstSpan?.innerHTML;

        //   const codeFrags = codeSnippet.split("<br>");
        //   const codeSb = new StringBuilder();

        //   codeFrags.forEach((c) => {
        //     codeSb.append(c).br();
        //   });

        //   sb.append(formatCode(codeSb.toString())).br().br();
        //   break;
        case "span":
          const hasAttr = e.hasAttribute("data-selectable-paragraph");
          if (hasAttr) {
            const result = parseSpanCode(e.innerHTML);
            sb.append(formatCode(result)).br().br();
          }
          break;
        case "blockquote":
          sb.append(blockquote(e.textContent)).br().br();
          break;
        case "ol":
          [...e.children].forEach((li, index) => {
            const litext = li.textContent;
            const mdliString = ol(index + 1, litext);
            parseParagraph(sb, li, mdliString).br().br();
          });
          break;
        case "ul":
          [...e.children].forEach((liEl) => {
            const litext = liEl.textContent;
            const mdliString = li(litext);
            parseParagraph(sb, liEl, mdliString).br().br();
          });
          break;
        case "figure":
          const imgElement = e.getElementsByTagName("img")[0];
          const imgUrl = imgElement?.getAttribute("src");
          if (imgUrl && imgUrl !== "") {
            const imgText = img("", imgUrl);
            sb.append(imgText).br();

            sb.append(e.textContent).br().br();
          }
          break;
        case "iframe":
          const codes = getGistFormatCode(e);

          codes.forEach((code) => {
            const fcode = formatCode(code);
            sb.append(fcode).br().br();
          });
          break;

        default:
          break;
      }
    });

    // console.log("sb==== ", sb.toString());

    return sb.toString();
  };

  function isStringBlank(str) {
    if (str === "") return true;
    for (s of str) {
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

  // not use
  function getformatText(e) {
    let node = e;
    let formatText = "";
    while (node.firstElementChild != null) {
      const child = node.firstElementChild;
      const tName = child.tagName.toLowerCase();
      const originalText = child.textContent;

      if (tName === "code") {
        formatText = code(formatText === "" ? originalText : formatText);
      } else if (tName === "strong") {
        formatText = bold(formatText === "" ? originalText : formatText);
      } else if (tName === "a") {
        const aTag = child.getElementsByTagName("a")[0];
        const link = aTag.getAttribute("href");
        formatText = a((formatText === "" ? originalText : formatText), link);
      }
      node = e.firstElementChild;
    }
    return formatText;
  }

  function parseParagraph(sb, e, c) {
    const children = e.children;
    if (children.length === 0) {
      return sb.append(replaceApostrophen(c));
    }

    const codeSb = new StringBuilder();
    let content2 = c;

    for (child of children) {
      const tName = child.tagName.toLowerCase();
      const originalText = child.textContent;

      if (tName === "code") {
        const codeText = code(originalText);
        content2 = composeString(codeSb, content2, originalText, codeText);

        const strongTag = child.getElementsByTagName("strong")[0];
        if (strongTag !== undefined) {
          const codeStrongText = formatHasBlankText(codeText, bold(codeText));
          const s = codeSb.toString().replace(codeText, codeStrongText);
          codeSb.clearAndAppend(s);
        }

        const aTag = child.getElementsByTagName("a")[0];
        if (aTag !== undefined) {
          const link = aTag.getAttribute("href");
          const alink = a(codeText, link);
          const s = codeSb.toString().replace(codeText, alink);
          codeSb.clearAndAppend(s);
        }
      } else if (tName === "strong") {
        const st = isStringBlank(originalText)
          ? originalText
          : bold(originalText.trim());
        const strongText = formatHasBlankText(originalText, st);

        content2 = composeString(codeSb, content2, originalText, strongText);

        const atag = child.getElementsByTagName("a")[0];
        if (atag !== undefined) {
          const link = atag.getAttribute("href");
          const alink = a(strongText, link);
          const s = codeSb.toString().replace(strongText, alink);
          codeSb.clearAndAppend(s);
        }
      } else if (tName === "a") {
        const link = child.getAttribute("href");
        const a1 = a(originalText, link);
        content2 = composeString(codeSb, content2, originalText, a1);
      }
    }

    sb.append(replaceApostrophen(codeSb.toString()));
    return sb.append(replaceApostrophen(content2));
  }

  function composeString(codeSb, content, originalText, formatText) {
    const index = content.indexOf(originalText);
    const preString = content.substring(0, index);
    codeSb.append(preString).append(formatText);

    return content.substring(index + originalText.length);
  }

  // get gist code from iframe
  function getGistFormatCode(e) {
    let iframdom;
    const codeArray = new Array();
    try {
      iframdom = e.contentWindow.document;
    } catch (error) {
      return codeArray;
    }
    if (iframdom) {
      const gistDatas = iframdom.getElementsByClassName("gist-data");
      for (gitstCode of gistDatas) {
        const codea = gitstCode.textContent.split("\n");
        const blankLen = codea[1].length;
        const cmap = [...codea]
          .map((c) => {
            return c.substring(blankLen, c.length);
          })
          .filter((c) => {
            return c.length > 2;
          });
        const codeSb = new StringBuilder();

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

  // 将 ‘（中文）改成 '(英文的)
  function replaceApostrophen(content) {
    return content.replace(/’/g, "'");
  }

  const escapeHTML = (str) =>
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

  const unescapeHTML = (str) =>
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

  function parseSpanCode(html) {
    const spanList = html.split("<br>");
    const sb = new StringBuilder();
    [...spanList].forEach((s, index) => {
      s.split("</span>").forEach((ss) => {
        const code = unescapeHTML(removeSpan(ss));
        sb.append(code);
      });
      if (index !== spanList.length - 1) {
        sb.br();
      }
    });
    return sb.toString();
  }

  function removeSpan(s) {
    const arrayIndex = new Array();
    let indexArray = new Array(2).fill(-1);
    [...s].forEach((c, index) => {
      if (c === "<") {
        indexArray = new Array(2).fill(-1);
        indexArray[0] = index;
      } else if (c === ">") {
        indexArray[1] = index + 1;
        arrayIndex.push(indexArray);
      }
    });
    let result = s;
    arrayIndex.forEach((intArray) => {
      const slice = s.slice(intArray[0], intArray[1]);
      //   console.log("slice: = ", slice);
      result = result.replace(slice, "");
    });
    return result;
  }

  // parseMedium();
  downloadFile(parseMedium(), fileName);
})();
