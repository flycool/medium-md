export class MarkdownUtils {
  static h1(text) {
    return `# ${text}`;
  }
  static h2(text) {
    return `## ${text}`;
  }
  static h3(text) {
    return `### ${text}`;
  }

  static code(text) {
    return `\`${text}\``;
  }

  static bold(text) {
    return `**${text}**`;
  }

  static italic(text) {
    return `_${text}_`;
  }

  static a(linkName, href) {
    return `[${linkName}](${href})`;
  }

  static img(imgName, src) {
    return `![${imgName}](${src})`;
  }

  static li(text) {
    return `- ${text}`;
  }

  static formatCode(code, format = "kotlin") {
    return `\`\`\`${format}
    ${code}
    \`\`\``;
  }

  static separator() {
    return "---";
  }

  static br() {
    return "\r\n";
  }

  static blockquote(text) {
    return `> ${text}`;
  }

  static ol(index, text) {
    return `${index}. ${text}`;
  }

  // 创建 StringBuffer 实例的工厂方法
  static createStringBuffer(initialValue = "") {
    return new this.StringBuffer(initialValue);
  }
}

// 在 Utils 类内部定义 StringBuffer 类
MarkdownUtils.StringBuffer = class StringBuffer {
  constructor(initialValue = "") {
    this.buffer = initialValue;
  }

  // 追加字符串
  append(str) {
    this.buffer += str;
    return this; // 支持链式调用
  }

  // 追加字符串并换行
  appendLine(str) {
    this.buffer += str + "\n";
    return this;
  }

  br() {
    this.buffer += "\r\n";
    return this;
  }

  // 清空缓冲区
  clear() {
    this.buffer = "";
    return this;
  }

  // 获取当前内容
  toString() {
    return this.buffer;
  }

  // 获取内容长度
  get length() {
    return this.buffer.length;
  }

  // 判断是否为空
  isEmpty() {
    return this.buffer.length === 0;
  }

  // 转换为大写
  toUpperCase() {
    this.buffer = this.buffer.toUpperCase();
    return this;
  }

  // 转换为小写
  toLowerCase() {
    this.buffer = this.buffer.toLowerCase();
    return this;
  }

  // 去除首尾空格
  trim() {
    this.buffer = this.buffer.trim();
    return this;
  }

  // 替换内容
  replace(searchValue, replaceValue) {
    this.buffer = this.buffer.replace(searchValue, replaceValue);
    return this;
  }

  // 插入字符串
  insert(index, str) {
    if (index >= 0 && index <= this.buffer.length) {
      this.buffer =
        this.buffer.slice(0, index) + str + this.buffer.slice(index);
    }
    return this;
  }

  // 删除指定范围的字符
  delete(start, end) {
    if (start >= 0 && start <= this.buffer.length) {
      const endIndex =
        end !== undefined
          ? Math.min(end, this.buffer.length)
          : this.buffer.length;
      this.buffer = this.buffer.slice(0, start) + this.buffer.slice(endIndex);
    }
    return this;
  }
};
