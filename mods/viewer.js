/* global navigate */
import css from './chrome.css';

var lastNonce = -1;
var lastAppliedUrl = '';

function apiOrigin() {
  return window.location.origin;
}

function getIframe() {
  return document.getElementById('tvframe');
}

function setIframeUrl(url) {
  var iframe = getIframe();
  if (!iframe) return;
  if (url) {
    iframe.src = url;
  } else {
    iframe.src = 'about:blank';
  }
}

function reloadIframe() {
  var iframe = getIframe();
  if (!iframe || !iframe.src || iframe.src === 'about:blank') return;
  var u = iframe.src;
  iframe.src = u;
}

function clearRemoteState() {
  return fetch(apiOrigin() + '/api/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).catch(function () {});
}

function mountChrome() {
  if (document.getElementById('tvframe')) return;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  document.body.classList.add('tizenviewer-navigation-mode');
  document.body.innerHTML = '';

  var chrome = document.createElement('div');
  chrome.id = 'tizenviewer-chrome';

  var btnReload = document.createElement('button');
  btnReload.type = 'button';
  btnReload.id = 'tizenviewer-reload';
  btnReload.textContent = 'Rafraîchir';

  var btnClear = document.createElement('button');
  btnClear.type = 'button';
  btnClear.id = 'tizenviewer-clear';
  btnClear.textContent = 'Effacer';

  chrome.appendChild(btnReload);
  chrome.appendChild(btnClear);

  var iframe = document.createElement('iframe');
  iframe.id = 'tvframe';
  iframe.title = 'Contenu';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');

  document.body.appendChild(iframe);
  document.body.appendChild(chrome);

  btnReload.addEventListener('click', function () {
    reloadIframe();
  });

  btnClear.addEventListener('click', function () {
    lastAppliedUrl = '';
    clearRemoteState();
    setIframeUrl('');
    focusChromeFirst();
  });

  btnReload.addEventListener('focus', function () {
    stripFocusClass();
    btnReload.classList.add('tizenviewer-focused');
  });
  btnClear.addEventListener('focus', function () {
    stripFocusClass();
    btnClear.classList.add('tizenviewer-focused');
  });
  btnReload.addEventListener('blur', function () {
    btnReload.classList.remove('tizenviewer-focused');
  });
  btnClear.addEventListener('blur', function () {
    btnClear.classList.remove('tizenviewer-focused');
  });
}

function stripFocusClass() {
  document.querySelectorAll('.tizenviewer-focused').forEach(function (el) {
    el.classList.remove('tizenviewer-focused');
  });
}

function focusChromeFirst() {
  var btn = document.getElementById('tizenviewer-reload');
  if (btn) {
    stripFocusClass();
    btn.classList.add('tizenviewer-focused');
    btn.focus();
  }
}

function pollOnce() {
  fetch(apiOrigin() + '/api/state', { cache: 'no-store' })
    .then(function (r) {
      return r.json();
    })
    .then(function (s) {
      if (!s || typeof s.nonce !== 'number') return;
      if (s.nonce === lastNonce) return;
      lastNonce = s.nonce;

      if (s.targetUrl) {
        if (s.targetUrl !== lastAppliedUrl) {
          lastAppliedUrl = s.targetUrl;
          setIframeUrl(s.targetUrl);
        }
      } else if (lastAppliedUrl !== '') {
        lastAppliedUrl = '';
        setIframeUrl('');
      }
    })
    .catch(function () {});
}

function setupPoll() {
  pollOnce();
  setInterval(pollOnce, 900);
}

function tryMediaOnIframe(key) {
  var iframe = getIframe();
  if (!iframe || !iframe.contentWindow) return;
  try {
    var doc = iframe.contentDocument;
    if (!doc) return;
    var v = doc.querySelector('video');
    if (!v) return;
    if (key === 'MediaPlayPause') {
      if (v.paused) v.play().catch(function () {});
      else v.pause();
    } else if (key === 'MediaPlay') {
      v.play().catch(function () {});
    } else if (key === 'MediaPause') {
      v.pause();
    } else if (key === 'MediaStop') {
      v.pause();
      try {
        v.currentTime = 0;
      } catch (e) {}
    } else if (key === 'MediaTrackNext') {
      v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
    } else if (key === 'MediaTrackPrevious') {
      v.currentTime = Math.max(0, v.currentTime - 10);
    }
  } catch (e) {
    /* cross-origin */
  }
}

function setupMediaKeys() {
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'MediaPlayPause':
      case 'MediaPlay':
      case 'MediaPause':
      case 'MediaStop':
      case 'MediaFastForward':
      case 'MediaRewind':
      case 'MediaTrackNext':
      case 'MediaTrackPrevious':
        tryMediaOnIframe(e.key);
        break;
      case 'Back':
      case 'XF86Back':
        e.preventDefault();
        lastAppliedUrl = '';
        clearRemoteState();
        setIframeUrl('');
        focusChromeFirst();
        break;
      case 'Enter':
        if (document.activeElement === getIframe()) {
          e.preventDefault();
          focusChromeFirst();
        }
        break;
      default:
        break;
    }
  });
}

function start() {
  mountChrome();
  setupPoll();
  setupMediaKeys();
  focusChromeFirst();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
