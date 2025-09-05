(async () => {
  try {
    let fileName = "";
    let publishTime = "";
    let orgUrl = "";

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


      await DomUtils.deepSearchForElement(
        article,
        async (currentElement) => {
          return await ParseUtils.parseElement(sb, currentElement);
        }
      );

      // deep first search
      // if (article) {
      //   const stack = [];
      //   stack.push(article);
      //   let count = 0;
      //   while (stack.length > 0) {
      //     count++;
      //     const currentElement = stack.pop();

      //     const result = await ParseUtils.parseElement(sb, currentElement);

      //     if (result) continue;

      //     const children = currentElement.children;
      //     for (let i = children.length - 1; i >= 0; i--) {
      //       stack.push(children[i]);
      //     }
      //   }
      // }

      // console.log("sb==== ", sb.toString());

      return sb.toString();
    };

    NetworkUtils.downloadFile(await parseMedium(), fileName);
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
