// DomUtils.js
export class DomUtils {
  
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
