// popup.js

function sendToInstagramTab(message) {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: "*://www.instagram.com/*" }, (tabs) => {
      if (!tabs || tabs.length === 0)
        return resolve({ ok: false, reason: "no_instagram_tab" });

      // pick the most recently used IG tab
      let best = tabs[0];
      for (const t of tabs) {
        if (t.lastAccessed > best.lastAccessed) best = t;
      }

      chrome.tabs.sendMessage(best.id, message, (response) => {
        if (chrome.runtime.lastError)
          return resolve({ ok: false, reason: chrome.runtime.lastError.message });

        resolve(response || { ok: false, reason: "no_response" });
      });
    });
  });
}

async function run(action) {
  const res = await sendToInstagramTab({ action });
  const status = document.getElementById("status");

  if (!res.ok) {
    status.textContent = `Failed: ${res.reason}`;
    status.style.color = "tomato";
    setTimeout(() => {
      status.textContent = "Ready";
      status.style.color = "";
    }, 1500);
  } else {
    status.textContent = "OK";
    status.style.color = "#d4d4d8";
    setTimeout(() => { status.textContent = "Ready"; }, 900);
  }
}

document.getElementById("play").addEventListener("click", () => run("toggle_play"));
