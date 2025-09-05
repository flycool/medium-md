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

    async function parseNote() {
      const divNoteContainer = document.getElementsByClassName(
        "editor-innter ql-container ql-snow"
      )[0];

      await DomUtils.deepSearchForElement(
        divNoteContainer,
        async (currentElement) => {
          return await ParseUtils.parseElement(sb, currentElement);
        }
      );

      return sb.toString();
    }

    NetworkUtils.downloadFile(await parseNote(), "note.md");
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
