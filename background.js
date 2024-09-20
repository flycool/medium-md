
const proandroiddev = "https://proandroiddev.com/";
const medium = "https://medium.com/androiddevelopers";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith(proandroiddev) || tab.url.startsWith(medium)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["parse.js"],
    });
  }
});
