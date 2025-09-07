(async () => {
  try {
    const { DomUtils } = await import(
      chrome.runtime.getURL("/modules/DomUtils.js")
    );
    const { ParseUtils } = await import(
      chrome.runtime.getURL("/modules/ParseUtils.js")
    );
    const { NetworkUtils } = await import(
      chrome.runtime.getURL("/modules/NetworkUtils.js")
    );
    const markdown = await ParseUtils.markdown;
    const sb = markdown.createStringBuffer();

    let fileName = "";
    let publishTime = "";
    let orgUrl = "";

    async function parseNote() {
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

      const content = document.getElementsByClassName("content-wrap")[0];

      await DomUtils.deepSearchForElement(content, async (currentElement) => {
        // ignore these tag
        const classAttrText = currentElement.getAttribute("class");
        if (
          classAttrText?.includes("icon-sidebar") ||
          classAttrText?.includes("blog-label-container") ||
          classAttrText?.includes("blog-pager pagination")
        ) {
          return true;
        }

        return await ParseUtils.parseElement(sb, currentElement);
      });

      return sb.toString();
    }

    NetworkUtils.downloadFile(await parseNote(), fileName);
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
