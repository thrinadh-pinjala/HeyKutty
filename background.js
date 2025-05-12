chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "voice-command") {
      const command = message.command;
  
      if (command.includes("open youtube")) {
        chrome.tabs.create({ url: "https://www.youtube.com" });
      } else if (command.includes("open chatgpt")) {
        chrome.tabs.create({ url: "https://chat.openai.com" });
      } else {
        console.log("Unrecognized command:", command);
      }
    }
  });
  