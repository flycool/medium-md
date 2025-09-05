(async () => {
  try {
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

      divNoteContainer.textContent

      // console.log("divnote", divNoteContainer);

      if (divNoteContainer) {
        const stack = [];
        stack.push(divNoteContainer);
        let count = 0;
        while (stack.length > 0) {
          count++;
          const currentElement = stack.pop();

          const result = await ParseUtils.parseElement(sb, currentElement);

          if (result) continue;

          const children = currentElement.children;
          for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i]);
          }
        }
      }
      return sb.toString();
    }

    NetworkUtils.downloadFile(await parseNote(), "note.md");
  } catch (error) {
    console.error("解析失败:", error);
  }
})();
