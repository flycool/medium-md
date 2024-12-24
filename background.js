
const proandroiddev = "https://proandroiddev.com/";
const medium = "https://medium.com/androiddevelopers/";
const kotlin_academy = "https://blog.kotlin-academy.com/";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith(proandroiddev) || tab.url.startsWith(medium) ||
	  tab.url.startsWith(kotlin_academy)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["parse.js"],
    });
  }
});
