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

      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        emDelimiter: "_",
      });

      // Optional: add some basic rules if needed (kept minimal here).

      const markdown = turndownService.turndown(contentRoot);

      const [fileName, orgUrl] = getFileInfo();

      const markdownPlusUrl = orgUrl + "\n\n" + markdown;

      NetworkUtils.downloadFile(markdownPlusUrl, fileName);
    }

    convertPageToMarkdown();
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
