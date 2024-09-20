// chrome.runtime.onInstalled.addListener(() => {
//   chrome.action.setBadgeText({
//     text: "ON",
//   });
// });

const proandroiddev = "https://proandroiddev.com/";
const medium = "https://medium.com/androiddevelopers";

chrome.action.onClicked.addListener(async (tab) => {
  //   const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
  //   const nextState = prevState === "ON" ? "OFF" : "ON";

  //   await chrome.action.setBadgeText({
  //     tabId: tab.id,
  //     text: nextState,
  //   });
  if (tab.url.startsWith(proandroiddev) || tab.url.startsWith(medium)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["parse.js"],
    });
  }
});
