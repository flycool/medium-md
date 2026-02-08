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
    const memberUrl = "https://medium.com/plans";

    const parseMedium = async function () {
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

      const regex = DomUtils.regexTags("speechify-ignore");

      // 深度搜索文章内容，解析文本并忽略特定标签
      await DomUtils.deepSearchForElement(article, async (currentElement) => {
        const isIgnore = DomUtils.ignoreTags(currentElement, regex);
        if (isIgnore) return true;
        if (
          currentElement.tagName.toLowerCase() === "a" &&
          currentElement.getAttribute("href").includes(memberUrl)
        ) {
          return true;
        }

        return await ParseUtils.parseElement(sb, currentElement);
      });

      return sb.toString();
    };

    NetworkUtils.downloadFile(await parseMedium(), fileName);
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
