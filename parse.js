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

  // return value : true 表示此elelment不处理它的children
  function parseElement(sb, e) {
    const classAttrText = e.getAttribute("class");
    if (classAttrText?.includes("speechify-ignore")) {
      return true;
    }

    const tagName = e.tagName.toLowerCase();
    switch (tagName) {
      case "div":
        const attr = e.getAttribute("role");
        if (attr === "separator") {
          sb.append(separator()).br().br();
          return true;
        }

        const aChild = e.firstElementChild;
        if (aChild && aChild.tagName.toLowerCase() === "a") {
          const atext = aChild.textContent;
          if (
            aChild.getAttribute("data-testid") === "publicationName" ||
            atext === undefined ||
            atext === ""
          ) {
            return false;
          }

          const h2e = e.getElementsByTagName("h2")[0];
          const h2Text = h2e?.textContent;

          let link = aChild.getAttribute("href");
          if (link.includes("post_audio_button")) {
            return false;
          }
          // if (!link.startsWith("https://") || !link.startsWith("http://")) {
          //   link = "https://proandroiddev.com" + link;
          // }
          const a1 = a(h2Text ? h2Text : link, link);
          sb.append(a1).br().br();

          return true;
        }
        break;
      case "h1":
        const hone = h1(e.textContent);
        const honeText = replaceApostrophen(hone);
        sb.append(honeText).br().br();
        break;
      case "h2":
        const htwo = h2(e.textContent);
        const htwoText = replaceApostrophen(htwo);
        sb.append(htwoText).br().br();
        break;
      case "h3":
        const hthree = h3(e.textContent);
        const hthreeText = replaceApostrophen(hthree);
        sb.append(hthreeText).br().br();
        break;
      case "p":
        parseParagraph(sb, e).br().br();
        return true;
      case "code":
        const lang = e.hasAttribute("lang");
        if (lang) {
          const result = parseSpanCode(e.innerHTML);
          sb.append(formatCode(result)).br().br();
          return true;
        }
        break;
      case "span":
        const hasAttr = e.hasAttribute("data-selectable-paragraph");
        if (hasAttr) {
          const result = parseSpanCode(e.innerHTML);
          sb.append(formatCode(result)).br().br();
          return true;
        }
        break;
      case "blockquote":
        const blockquoteChild = e.children;
        if (blockquoteChild) {
          [...blockquoteChild].forEach((bc) => {
            parseParagraph(sb, bc, "> ").br().br();
          });
        }
        return true;
      case "ol":
        [...e.children].forEach((li, index) => {
          const firstItem = `${index + 1}. `;
          parseParagraph(sb, li, firstItem).br().br();
        });
        return true;
      case "ul":
        [...e.children].forEach((liEl) => {
          const firstItem = "- ";
          parseParagraph(sb, liEl, firstItem).br().br();
        });
        return true;
      case "figure":
        const imgElement = e.getElementsByTagName("img")[0];
        const imgUrl = imgElement?.getAttribute("src");
        if (imgUrl && imgUrl !== "") {
          const imgText = img("", imgUrl);
          sb.append(imgText).br();

          sb.append(e.textContent).br().br();
          return true;
        }
        return false;
      case "iframe":
        decodeVideoUrl(e, sb);

        const codes = getGistFormatCode(e);

        codes.forEach((code) => {
          const fcode = formatCode(code);
          sb.append(fcode).br().br();
        });
        return true;
      default:
        break;
    }
    return false;
  }

  function decodeVideoUrl(e, sb) {
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
    const alink = a(`video: ${title}`, decodeUrl);

    sb.append(alink).br().br();
  }

  const parseMedium = function () {
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

    // deep first search
    if (article) {
      const stack = [];
      stack.push(article);
      let count = 0;
      while (stack.length > 0) {
        count++;
        const currentElement = stack.pop();

        const result = parseElement(sb, currentElement);

        if (result) continue;

        const children = currentElement.children;
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push(children[i]);
        }
      }
      // console.log("count==", count);
    }

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

  function isNumberic(value) {
    return !isNaN(parseFloat(value)) && !isNaN(value);
  }

  function formatArray(index, originalText, array, formatCode) {
    for (let i = index; i < array.length; i++) {
      const w = array[i];
      if (originalText === w) {
        array[i] = formatCode;
        return i + 1;
      }
    }
    return 0;
  }

  function parseParagraph(sb, e, firstItem = "") {
    const children = e.children;

    const patternOuterHtml = />(.*?)</g;
    const outerHTML = e.outerHTML;
    // console.log("outerhtml==", outerHTML);

    let orgWordArray = outerHTML.match(patternOuterHtml);

    if (orgWordArray !== null) {
      orgWordArray = orgWordArray
        .map((s) => {
          const i = s.lastIndexOf(">");
          return s.slice(i + 1, -1);
        })
        .filter((s) => s !== "");
    }

    // console.log("orgWordArray:=", orgWordArray);

    let loopIndex = 0;

    for (child of children) {
      const tName = child.tagName.toLowerCase();
      const originalText = child.textContent;
      let formatCode = originalText;

      if (tName === "code") {
        const codeText = code(originalText);
        formatCode = codeText;

        const strongTag = child.getElementsByTagName("strong")[0];
        if (strongTag !== undefined) {
          const codeStrongText = formatHasBlankText(codeText, bold(codeText));
          formatCode = codeStrongText;
        }

        const aTag = child.getElementsByTagName("a")[0];
        if (aTag !== undefined) {
          const link = aTag.getAttribute("href");
          const alink = a(codeText, link);
          formatCode = alink;
        }
      
        loopIndex = formatArray(loopIndex, originalText, orgWordArray, formatCode);
      } else if (tName === "strong") {
        let restText = originalText;
        const strongText = handleStrongBlankText(originalText);
        formatCode = strongText;

        const emTag = child.getElementsByTagName("em")[0];
        if(emTag !== undefined) {
          const emText = emTag.textContent;
          const emStrongText = handleStrongBlankText(emText);
          formatCode = italic(emStrongText);
          loopIndex = formatArray(loopIndex, emText, orgWordArray, formatCode);

          restText = originalText.substring(emText.length);
          formatCode = handleStrongBlankText(restText);
        }

        const atag = child.getElementsByTagName("a")[0];
        if (atag !== undefined) {
          const link = atag.getAttribute("href");
          const alink = a(strongText, link);
          formatCode = alink;
        }

        loopIndex = formatArray(loopIndex, restText, orgWordArray, formatCode);
      } else if (tName === "a") {
        const link = child.getAttribute("href");
        const a1 = a(originalText, link);
        formatCode = a1;

        loopIndex = formatArray(loopIndex, originalText, orgWordArray, formatCode);
      } else if (tName === "br") {
        orgWordArray.splice(loopIndex + 1, 0, "\r\n");
      }
    }

    if (firstItem !== "") {
      orgWordArray.unshift(firstItem);
    }

    orgWordArray = orgWordArray.map((s) => {
      return replaceApostrophen(s);
    });

    // console.log("orgWordArray2:=", orgWordArray);

    sb.append(orgWordArray.join(""));

    return sb;
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

  function handleStrongBlankText(text) {
    const st = isStringBlank(text)
          ? text
          : bold(text.trim());
    return formatHasBlankText(text, st);
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
