/**
  Custom Form Widget Builder Integration

  A self-hosted contact form, not Duda's native Form widget. Posts to your own
  backend, which relays to form-capture-backend. Duda never sees this data.

  Copy each section below into the matching tab in the Widget Builder.
  React mode is controlled from https://YOUR_WORKER_DOMAIN/, per app.

  shared: smaller bundle, needs React already on the page.
  standalone: bigger bundle, self-contained.
*/


// HTML TAB
// Paste this into the HTML tab of the Widget Builder:

<div id="custom-form-root"></div>



// JAVASCRIPT TAB
// DM wraps your code in a function automatically, paste ONLY the lines below
// (do NOT include a wrapping function(...) { } yourself):

  var sharedReactSrc = 'https://YOUR_WORKER_DOMAIN/bundles/shared/duda-widgets.js';

  var props = {
    apiBaseUrl:        data.config.apiBaseUrl,
    submitButtonLabel: data.config.submitButtonLabel,
    successMessage:    data.config.successMessage,
  };

  function __dudaPreconnect(url) {
    window.__dudaPreconnected = window.__dudaPreconnected || {};
    var origin = url.split('/').slice(0, 3).join('/');
    if (window.__dudaPreconnected[origin]) return;
    window.__dudaPreconnected[origin] = true;
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);
  }

  // Duda calls this more than once per widget instance. Caching by url avoids
  // duplicate anonymous-module loads breaking RequireJS.
  function __dudaLoadBlobUrl(url) {
    window.__dudaBlobUrlCache = window.__dudaBlobUrlCache || {};
    if (!window.__dudaBlobUrlCache[url]) {
      window.__dudaBlobUrlCache[url] = fetch(url, { headers: { 'ngrok-skip-browser-warning': '1' } })
        .then(function (res) { return res.blob(); })
        .then(function (blob) { return URL.createObjectURL(blob); });
    }
    return window.__dudaBlobUrlCache[url];
  }

  function registerReactShims() {
    if (typeof window.define !== 'function' || !window.define.amd || !window.__dudaSharedReact || !window.__dudaSharedReactDOM) {
      return;
    }
    // Idempotent: harmless if called again after the interval is already cleared.
    function stopReactShimPolling() {
      if (window.__dudaReactShimInterval) {
        clearInterval(window.__dudaReactShimInterval);
        window.__dudaReactShimInterval = null;
      }
    }
    if (typeof window.require.defined === 'function' && window.require.defined('react')) {
      stopReactShimPolling();
      return;
    }
    function __dudaLiveProxy(getTarget) {
      return new Proxy({}, {
        get: function (_t, prop) { return getTarget()[prop]; },
        has: function (_t, prop) { return prop in getTarget(); },
        ownKeys: function () { return Reflect.ownKeys(getTarget()); },
        getOwnPropertyDescriptor: function (_t, prop) {
          var desc = Object.getOwnPropertyDescriptor(getTarget(), prop);
          if (desc) desc.configurable = true;
          return desc;
        }
      });
    }
    var reactProxy = __dudaLiveProxy(function () { return window.__dudaSharedReact; });
    var reactDomProxy = __dudaLiveProxy(function () { return window.__dudaSharedReactDOM; });
    window.define('react', [], function () { return reactProxy; });
    window.define('react-dom', [], function () { return reactDomProxy; });
    window.define('react-dom/client', [], function () { return reactDomProxy; });
    stopReactShimPolling();
  }

  function loadSharedReact(callback) {
    if (window.__dudaSharedReact && window.__dudaSharedReactDOM) {
      registerReactShims();
      return callback();
    }
    if (!window.__dudaSharedReactPromise) {
      window.__dudaSharedReactPromise = __dudaLoadBlobUrl(sharedReactSrc).then(function (blobUrl) {
        return new Promise(function (resolve, reject) {
          if (typeof window.require === 'function') {
            window.require([blobUrl], function () { resolve(); });
          } else {
            var s = document.createElement('script');
            s.src = blobUrl;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          }
        });
      });
    }
    window.__dudaSharedReactPromise.then(function () {
      registerReactShims();
      callback();
    }, function (err) {
      console.error('[shared-react] failed to load', err);
    });
  }

  fetch('https://YOUR_WORKER_DOMAIN/react-mode?app=custom-form')
    .then(function (res) { return res.json(); })
    .catch(function () { return { mode: 'shared' }; })
    .then(function (settings) {
      var reactMode = settings && settings.mode === 'standalone' ? 'standalone' : 'shared';
      var scriptSrc = reactMode === 'standalone'
        ? 'https://YOUR_WORKER_DOMAIN/bundles/custom-form/dm-widget.standalone.js'
        : 'https://YOUR_WORKER_DOMAIN/bundles/custom-form/dm-widget.js';

      __dudaPreconnect(scriptSrc);

      if (reactMode === 'standalone') {
        __dudaLoadBlobUrl(scriptSrc).then(function (blobUrl) {
          api.scripts.renderExternalApp(blobUrl, element, props, { name: 'dmWidget' });
        });
      } else {
        __dudaPreconnect(sharedReactSrc);
        if (!window.__dudaReactShimInterval) {
          window.__dudaReactShimInterval = setInterval(registerReactShims, 20);
        }
        __dudaLoadBlobUrl(sharedReactSrc);
        var widgetBlobPromise = __dudaLoadBlobUrl(scriptSrc);
        loadSharedReact(function () {
          widgetBlobPromise.then(function (blobUrl) {
            api.scripts.renderExternalApp(blobUrl, element, props, { name: 'dmWidget' });
          });
        });
      }
    });



// CSS TAB
// The widget bundle already injects its own CSS. Paste this into the CSS tab:

#custom-form-root {
  width: 100%;
}



// CONTENT EDITOR FIELDS
// Create the following fields in the Content Editor tab
// Field Name         │ Type  │ Default value
// ───────────────────|───────|──────────────────────────────────────────────────────
// apiBaseUrl         │ Text  │ https://YOUR_BACKEND_DOMAIN
// submitButtonLabel  │ Text  │ Send
// successMessage     │ Text  │ Thanks, we got your message.
//
// No reactMode field here. That's a global setting at
// https://YOUR_WORKER_DOMAIN/, not per widget.
