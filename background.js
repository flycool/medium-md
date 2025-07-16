
//const proandroiddev = "https://proandroiddev.com/";
//const medium = "https://medium.com/androiddevelopers/";
//const kotlin_academy = "https://blog.kotlin-academy.com/";
//const clean_android = "https://medium.com/clean-android-dev/";
const proandroiddev = "proandroiddev.com";
const medium = "medium.com";
const victorbrandalise = "victorbrandalise.com";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.includes(proandroiddev) || tab.url.includes(medium) || tab.url.includes(victorbrandalise)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["parse.js"],
    });
  }
});
