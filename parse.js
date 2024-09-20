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

  function formatCode(code, format) {
    return `
        \`\`\`${format}
        ${code}
        \`\`\`
        `;
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

  let fileName = "";

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

  const parseMedium = function () {
    const hSet = new Set();
    hSet.add("Follow");
    hSet.add("ProAndroidDev");

    const sb = new StringBuilder();

    const allElements = document.getElementsByTagName("*");
    [...allElements].forEach((e) => {
      const tagName = e.tagName;

      if (tagName === "TITLE") {
        fileName = e.textContent;
        const dot = fileName.indexOf(".");
        const cutIndex = dot === -1 ? fileName.length : dot;
        fileName = fileName.slice(0, cutIndex);
      } else if (tagName === "META") {
        const publishTime = e.getAttribute("property");
        if (publishTime == "article:published_time") {
          const ptime = e.getAttribute("content");
          const ptimeString = ptime.split("T")[0];
          const title = fileName;
          fileName = ptimeString + " " + title + ".md";
        }
      } else if (tagName === "BUTTON") {
        hSet.add(e.textCotent);
      } else if (tagName === "DIV") {
        const attr = e.getAttribute("role");
        if (attr === "separator") {
          sb.append(separator()).br().br();
          return;
        }

        const aChild = e.firstElementChild;
        if (aChild && aChild.tagName === "A") {
          const atext = aChild.textContent;
          if (
            aChild.getAttribute("data-testid") === "publicationName" ||
            atext === undefined ||
            atext === ""
          ) {
            return;
          }

          const h2e = e.getElementsByTagName("H2")[0];
          const h2Text = h2e?.textContent;

          let link = aChild.getAttribute("href");
          if (!link.startsWith("https://")) {
            link = "https://proandroiddev.com" + link;
          }
          const a1 = a(h2Text ? h2Text : link, link);
          sb.append(a1).br().br();

          hSet.add(h2Text ? h2Text : "");

          const h3e = e.getElementsByTagName("H3")[0];
          hSet.add(h3e?.textContent);

          const pe = e.getElementsByTagName("P")[0];
          hSet.add(pe?.textContent);
        }
      } else if (tagName === "H1") {
        const hone = h1(e.textContent);
        sb.append(hone).br().br();
      } else if (tagName === "H2") {
        if (hSet.has(e.textContent)) {
          return;
        }
        const htwo = h2(e.textContent);
        sb.append(htwo).br().br();
      } else if (tagName === "H3") {
        if (hSet.has(e.textContent)) {
          return;
        }
        const hthree = h3(e.textContent);
        sb.append(hthree).br().br();
      } else if (tagName === "P") {
        const pe = e.firstElementChild;
        if (pe && pe.tagName === "BUTTON") {
          return;
        }
        if (
          e.parentElement.tagName === "blockquote".toUpperCase() ||
          hSet.has(e.textContent)
        ) {
          return;
        }
        parseParagraph(sb, e, e.textContent).br().br();
      } else if (tagName === "SPAN") {
        const hasAttr = e.hasAttribute("data-selectable-paragraph");
        if (hasAttr) {
          const result = parseSpanCode(e.html());
          sb.append(formatCode(result)).br().br();
        }
      } else if (tagName === "blockquote".toUpperCase()) {
        const quoteText = e.textContent;
        sb.append(blockquote(quoteText)).br().br();
      } else if (tagName === "OL") {
        [...e.children].forEach((li, index) => {
          const litext = li.textContent;
          const mdliString = ol(index + 1, litext);
          parseParagraph(sb, li, mdliString).br().br();
        });
      } else if (tagName === "UL") {
        [...e.children].forEach((liEl) => {
          const litext = liEl.textContent;
          const mdliString = li(litext);
          parseParagraph(sb, liEl, mdliString).br().br();
        });
      } else if (tagName === "figure".toUpperCase()) {
        const imgElement = e.getElementsByTagName("IMG")[0];
        const imgUrl = imgElement.getAttribute("src");
        if (imgUrl !== "") {
          const imgText = img("", imgUrl);
          sb.append(imgText).br();

          sb.append(e.textContent).br().br();
        }
      } else if (tagName === "iframe".toUpperCase()) {
        const frameSrc = e.getAttribute("src");
        if (
          frameSrc !== "" /*&&
            (frameSrc.contains("proandroiddev.com") || frameSrc.contains("medium.com"))*/
        ) {
          const codes = getGistFormatCode(frameSrc);
          codes.forEach((code) => {
            const formatCode = formatCode(code);
            sb.append(formatCode).br().br();
          });
        }
      }
    });

    //console.log("sb==== ", sb.toString());

    return sb.toString();
  };

  function parseParagraph(sb, e, content) {
    let content2 = content;
    const codeSb = new StringBuilder();

    const children = e.children;
    for (child of children) {
      const tName = child.tagName;
      const originalText = child.textContent;
      if (tName === "CODE") {
        const codeText = code(originalText);
        content2 = composeString(codeSb, content2, originalText, codeText);

        const strongTag = child.getElementsByTagName("STRONG")[0];
        let strongText = null;
        if (strongTag !== undefined) {
          const text = strongTag.textContent;
          if (text !== "") {
            strongText = bold(codeText);
            const s = codeSb.toString().replace(codeText, strongText);
            codeSb.clearAndAppend();
          }
        }
      } else if (tName === "STRONG") {
        const strongText = bold(originalText);
        content2 = composeString(codeSb, content2, originalText, strongText);

        const atag = child.getElementsByTagName("A")[0];
        if (atag != null) {
          const text = atag.textContent;
          if (text !== "") {
            const link = atag.getAttribute("href");
            const alink = a(strongText, link);
            const s = codeSb.toString().replace(strongText, alink);
            codeSb.clearAndAppend(s);
          }
        }
      } else if (tName === "A") {
        const link = child.getAttribute("href");
        const a1 = a(originalText, link);
        content2 = composeString(codeSb, content2, originalText, a1);
      }
    }
    sb.append(codeSb.toString());
    return sb.append(content2);
  }

  function composeString(codeSb, content, originalText, formatText) {
    const index = content.indexOf(originalText);
    const preString = content.substring(0, index);
    codeSb.append(preString).append(formatText);

    return content.substring(index + originalText.length);
  }

  // TODO
  function getGistFormatCode(frameSrc) {
    const gistData = document.getElementsByClassName("gist-data");
    return [];
  }

  function parseSpanCode(html) {
    const spanList = html.split("<br>");
    const sb = StringBuilder();
    spanList.forEachIndexed((s, index) => {
      s.split("</span>").forEach((ss) => {
        //const code = StringEscapeUtils.unescapeHtml4(removeSpan(ss));
        sb.append(removeSpan(ss));
      });
      if (index != spanList.size - 1) {
        sb.br();
      }
    });
    return sb.toString();
  }

  function removeSpan(s) {
    const arrayIndex = new Array();
    let indexArray = new Array(2).fill(-1);
    s.forEach((c, index) => {
      if (c === "<") {
        //indexArray = new Array(2).fill(-1)
        indexArray[0] = index;
      } else if (c === ">") {
        indexArray[1] = index;
        arrayIndex.push(indexArray);
      }
    });
    let result = s;
    arrayIndex.forEach((intArray) => {
      const slice = s.slice(intArray[0], intArray[1]);
      //console.log("slice: = ", slice);
      result = result.replace(slice, "");
    });
    return result;
  }

  downloadFile(parseMedium(), fileName);
})();
