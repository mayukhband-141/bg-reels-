// content.js
// Keeps Instagram reels playing in background and provides robust next/prev navigation.

// 1) Best-effort to allow background playback
try {
  Object.defineProperty(document, "hidden", { get: () => false });
  Object.defineProperty(document, "visibilityState", { get: () => "visible" });
  document.addEventListener("visibilitychange", e => e.stopImmediatePropagation());
} catch (e) { /* ignore */ }

// 2) IntersectionObserver: single active video
let currentVideo = null;
const seenVideos = new WeakSet();

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const v = entry.target;
    if (entry.isIntersecting) {
      if (currentVideo && currentVideo !== v) {
        try { currentVideo.pause(); } catch (_) {}
      }
      currentVideo = v;
      try { v.play().catch(()=>{}); } catch (_) {}
    } else {
      if (currentVideo !== v) {
        try { v.pause(); } catch (_) {}
      }
    }
  });
}, { threshold: 0.6 });

function observeAllVideos() {
  document.querySelectorAll("video").forEach(v => {
    if (!seenVideos.has(v)) {
      seenVideos.add(v);
      try { io.observe(v); } catch (_) {}
    }
  });
}
observeAllVideos();
new MutationObserver(observeAllVideos).observe(document, { childList: true, subtree: true });

// 3) Helpers to find next/prev reel URLs (multiple fallbacks)
function absoluteFromPath(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const origin = location.origin;
  return origin + (path.startsWith("/") ? path : "/" + path);
}

function getCurrentReelCode() {
  const m = location.pathname.match(/\/reel\/([^\/?#]+)/);
  return m ? m[1] : null;
}

function parseNextDataScript() {
  const s = document.querySelector('script#__NEXT_DATA__') || document.querySelector('script[type="application/json"]#__NEXT_DATA__');
  if (!s) return null;
  try { return JSON.parse(s.textContent); } catch (e) { return null; }
}

function urlsFromNextData() {
  const data = parseNextDataScript();
  if (!data) return null;

  // try common shapes
  try {
    const items = data?.props?.pageProps?.media?.items;
    if (Array.isArray(items) && items.length > 0) {
      const codes = items.map(it => it?.code).filter(Boolean);
      const cur = getCurrentReelCode();
      if (cur) {
        const idx = codes.indexOf(cur);
        if (idx !== -1) {
          return { next: codes[idx+1] ? `/reel/${codes[idx+1]}/` : null, prev: codes[idx-1] ? `/reel/${codes[idx-1]}/` : null };
        }
      } else if (codes.length >= 2) {
        return { next: `/reel/${codes[1]}/`, prev: `/reel/${codes[0]}/` };
      }
    }
  } catch(e) {}

  try {
    const media = data?.props?.pageProps?.reels?.items || data?.props?.pageProps?.items || null;
    if (Array.isArray(media)) {
      const codes = media.map(it => it?.shortcode || it?.code).filter(Boolean);
      const cur = getCurrentReelCode();
      if (cur) {
        const idx = codes.indexOf(cur);
        if (idx !== -1) {
          return { next: codes[idx+1] ? `/reel/${codes[idx+1]}/` : null, prev: codes[idx-1] ? `/reel/${codes[idx-1]}/` : null };
        }
      } else if (codes.length >= 2) {
        return { next: `/reel/${codes[1]}/`, prev: `/reel/${codes[0]}/` };
      }
    }
  } catch(e) {}

  return null;
}

function urlsFromAnchors() {
  const anchors = Array.from(document.querySelectorAll('a[href*="/reel/"]'));
  if (!anchors.length) return null;
  const hrefs = [];
  const seen = new Set();
  anchors.forEach(a => {
    let h = a.getAttribute("href");
    if (!h) return;
    h = h.split(/[?#]/)[0];
    const m = h.match(/\/reel\/[^\/?#]+/);
    if (!m) return;
    h = m[0];
    if (!seen.has(h)) { seen.add(h); hrefs.push(h); }
  });
  if (!hrefs.length) return null;
  const cur = getCurrentReelCode();
  if (!cur) return { next: hrefs[1] ? hrefs[1] : null, prev: hrefs[0] ? hrefs[0] : null };
  const idx = hrefs.findIndex(h => h.includes(`/reel/${cur}`));
  if (idx !== -1) return { next: hrefs[idx+1] ? hrefs[idx+1] : null, prev: hrefs[idx-1] ? hrefs[idx-1] : null };
  return { next: hrefs[1] ? hrefs[1] : null, prev: hrefs[0] ? hrefs[0] : null };
}

function findNextPrevURLs() {
  const jf = urlsFromNextData();
  if (jf && (jf.next || jf.prev)) return { next: absoluteFromPath(jf.next), prev: absoluteFromPath(jf.prev) };
  const ja = urlsFromAnchors();
  if (ja && (ja.next || ja.prev)) return { next: absoluteFromPath(ja.next), prev: absoluteFromPath(ja.prev) };
  try {
    const html = document.documentElement.innerHTML;
    const matches = Array.from(new Set((html.match(/\/reel\/[A-Za-z0-9_-]{6,}/g) || [])));
    if (matches.length) {
      const cur = getCurrentReelCode();
      if (!cur) return { next: absoluteFromPath(matches[1] || matches[0]), prev: absoluteFromPath(matches[0]) };
      const idx = matches.findIndex(m => m.includes(`/reel/${cur}`));
      if (idx !== -1) return { next: absoluteFromPath(matches[idx+1] || null), prev: absoluteFromPath(matches[idx-1] || null) };
      return { next: absoluteFromPath(matches[1] || matches[0]), prev: absoluteFromPath(matches[0]) };
    }
  } catch(e) {}
  return { next: null, prev: null };
}

// 4) Message listener from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.action) return;

  if (msg.action === "toggle_play") {
    if (currentVideo) {
      try {
        if (currentVideo.paused) currentVideo.play().catch(()=>{});
        else currentVideo.pause();
        sendResponse({ ok: true });
      } catch (e) { sendResponse({ ok: false, reason: "play_error" }); }
    } else sendResponse({ ok: false, reason: "no_video" });
    return true;
  }

  if (msg.action === "next_reel" || msg.action === "prev_reel") {
    const urls = findNextPrevURLs();
    const target = msg.action === "next_reel" ? urls.next : urls.prev;
    if (target) {
      try { location.assign(target); sendResponse({ ok: true, url: target }); }
      catch (e) {
        try { location.href = target; sendResponse({ ok: true, url: target }); }
        catch (err) { sendResponse({ ok: false, reason: "nav_failed" }); }
      }
    } else sendResponse({ ok: false, reason: "no_target_url" });
    return true;
  }

  sendResponse({ ok: false, reason: "unknown_action" });
});
