// DomUtils.js
export class DomUtils {
  static async deepSearchForElement(element, parseFunc) {
    if (element) {
      const stack = [];
      stack.push(element);
      let count = 0;
      while (stack.length > 0) {
        count++;
        const currentElement = stack.pop();

        const result = await parseFunc(currentElement);

        if (result) continue;

        const children = currentElement.children;
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push(children[i]);
        }
      }
    }
  }

  static regexTags(...tags) {
    const regex = new RegExp(
      `\\b(?:${tags.map((tag) => this.escapeRegExp(tag)).join("|")})\\b`
    );
    return regex;
  }

  static ignoreTags(e, regex) {
    const classAttrText = e.getAttribute("class");
    if (!classAttrText) return false;
    return regex.test(classAttrText);
  }

  // 辅助函数：转义正则特殊字符
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static extractMainContent() {
    // 尝试获取主要内容区域
    const selectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      ".main-content",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanText(element.textContent);
      }
    }

    // 回退到body内容
    return this.cleanText(document.body.textContent);
  }

  static extractMetadata() {
    const metadata = {};
    const metaTags = document.querySelectorAll("meta");

    metaTags.forEach((tag) => {
      const name =
        tag.getAttribute("name") ||
        tag.getAttribute("property") ||
        tag.getAttribute("itemprop");
      const content = tag.getAttribute("content");

      if (name && content) {
        metadata[name] = content;
      }
    });

    return metadata;
  }

  static extractLinks() {
    return Array.from(document.querySelectorAll("a"))
      .map((link) => ({
        href: link.href,
        text: this.cleanText(link.textContent),
        title: link.title,
      }))
      .filter((link) => link.href && !link.href.startsWith("javascript:"));
  }

  static cleanText(text) {
    return text ? text.replace(/\s+/g, " ").trim() : "";
  }
}
