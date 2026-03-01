(async () => {
  try {
    const { NetworkUtils } = await import(
      chrome.runtime.getURL("/modules/NetworkUtils.js")
    );

    let fileName = "";
    let publishTime = "";
    let orgUrl = "";

    function getFileInfo() {
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
          break;
        }
      }
      const aurl = "[" + orgUrl + "](" + orgUrl + ")";
      return [fileName, aurl];
    }

    function getContentRoot() {
      const article = document.querySelector("article");
      if (article) return article;

      const main = document.querySelector("main");
      if (main) return main;

      return document.body || document.documentElement;
    }

    function getGistFormatCodeFromIframe(iframe) {
      const result = [];
      let iframeDoc;
      try {
        iframeDoc = iframe.contentWindow && iframe.contentWindow.document;
      } catch (e) {
        return result; // 跨域或不可访问，直接跳过
      }
      if (!iframeDoc) return result;

      const gistDatas = iframeDoc.getElementsByClassName("gist-data");
      for (const gist of gistDatas) {
        const codeLines = gist.textContent.split("\n");
        if (codeLines.length < 2) continue;

        const blankLen = codeLines[1].length;
        const cmap = codeLines
          .map((c) => c.substring(blankLen))
          .filter((c) => c.length > 2);

        if (!cmap.length) continue;
        result.push(cmap.join("\n"));
      }
      return result;
    }

    /**
     * Sanitize a string for use as a filename on common desktop platforms.
     */
    function sanitizeFilename(name) {
      if (!name || typeof name !== "string") {
        return "page";
      }

      // Replace illegal characters: / \ ? % * : | " < >
      const illegalRe = /[\/\\\?\%\*\:\|\"<>\.]+/g;
      let safe = name.replace(illegalRe, " ");

      // Collapse whitespace and trim.
      safe = safe.replace(/\s+/g, " ").trim();

      if (!safe) {
        safe = "page";
      }

      return safe;
    }

    /**
     * Convert the page to Markdown and download it.
     */
    async function convertPageToMarkdown() {
      if (typeof TurndownService === "undefined") {
        console.error(
          "TurndownService is not available. Ensure turndown.js is loaded as a content script before contentScript.js.",
        );
        return;
      }

      const contentRoot = getContentRoot();
      // Work on a detached clone so we don't modify the live page DOM.
      const workingRoot = contentRoot.cloneNode(true);

      // Additionally, handle gist blocks that live inside same-origin iframes
      // (e.g. proandroiddev embeds). We read code from the live iframe document
      // using getGistFormatCodeFromIframe, then replace the corresponding
      // iframe node in the cloned tree with a <pre><code> block containing
      // the extracted code.

      const origIframes = Array.from(contentRoot.querySelectorAll("iframe"));
      const clonedIframes = Array.from(workingRoot.querySelectorAll("iframe"));

      origIframes.forEach((iframe, index) => {
        const codes = getGistFormatCodeFromIframe(iframe);
        if (!codes || !codes.length) return;

        const target = clonedIframes[index];
        if (!target) return;

        const pre = document.createElement("pre");
        codes.forEach((code) => {
          const codeEl = document.createElement("code");
          codeEl.textContent = code;
          pre.appendChild(codeEl);
          pre.appendChild(document.createTextNode("\n\n"));
        });

        target.replaceWith(pre);
      });

      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        emDelimiter: "_",
      });

      // Optional: add some basic rules if needed (kept minimal here).

      const markdown = turndownService.turndown(workingRoot);

      const [fileName, orgUrl] = getFileInfo();

      const markdownPlusUrl = orgUrl + "\n\n" + markdown;

      NetworkUtils.downloadFile(markdownPlusUrl, fileName);
    }

    convertPageToMarkdown();
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
