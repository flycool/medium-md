export class NetworkUtils {
  static async getPerformanceMetrics() {
    try {
      const [timing] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return window.performance.timing
            ? {
                loadTime:
                  window.performance.timing.loadEventEnd -
                  window.performance.timing.navigationStart,
                domReady:
                  window.performance.timing.domContentLoadedEventEnd -
                  window.performance.timing.navigationStart,
                redirectCount: window.performance.navigation.redirectCount,
              }
            : null;
        },
      });

      return timing.result;
    } catch (error) {
      return { error: error.message };
    }
  }

  static async downloadFile(content, name) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
