/**
  Collection Search Widget Builder Integration

  Copy each section below into the matching tab in the Widget Builder.
  React mode is controlled from https://YOUR_WORKER_DOMAIN/, per app.

  shared: smaller bundle, needs React already on the page.
  standalone: bigger bundle, self-contained.

  Field mapping (titleField, descField, etc.) auto-detects from the
  collection schema. Only set these to override the auto-detection.
 */


// HTML TAB
// Paste this into the HTML tab of the DM Widget Builder:

<div id="collection-search-root"></div>



// JAVASCRIPT TAB
// Duda wraps your code in a function automatically. Paste ONLY the lines below
// (do NOT include a wrapping function(...) { } yourself):

  var sharedReactSrc = 'https://YOUR_WORKER_DOMAIN/bundles/shared/duda-widgets.js';

  var props = {
    // Text & Labels
    searchTitle:       data.config.searchTitle,
    searchSubtitle:    data.config.searchSubtitle,
    searchPlaceholder: data.config.searchPlaceholder,
    searchButtonText:  data.config.searchButtonText,
    noResultsText:     data.config.noResultsText,
    noResultsSubtext:  data.config.noResultsSubtext,
    initialStateText:  data.config.initialStateText,
    readMoreText:      data.config.readMoreText,
    loadingText:       data.config.loadingText,
    prevText:          data.config.prevText,
    nextText:          data.config.nextText,

    // Data Source
    collectionName:    data.config.collectionName,

    // Field Mapping Overrides (optional, leave blank to auto-detect)
    titleField:        data.config.titleField,
    descField:         data.config.descField,
    imageField:        data.config.imageField,
    linkField:         data.config.linkField,
    categoryField:     data.config.categoryField,
    metaField:         data.config.metaField,

    // Layout
    pageSize:          data.config.pageSize,
    resultColumns:     data.config.resultColumns,
    dynamicPageBase:   data.config.dynamicPageBase,
    cardBorderRadius:  data.config.cardBorderRadius,

    // Design panel fields (Color Picker, not Content "Color")
    accentColor:       data.config.accentColor,
    bgColor:           data.config.bgColor,
    borderColor:       data.config.borderColor,
    textColor:         data.config.textColor,
    textMutedColor:    data.config.textMutedColor,
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

  fetch('https://YOUR_WORKER_DOMAIN/react-mode?app=collection-search')
    .then(function (res) { return res.json(); })
    .catch(function () { return { mode: 'shared' }; })
    .then(function (settings) {
      var reactMode = settings && settings.mode === 'standalone' ? 'standalone' : 'shared';
      var scriptSrc = reactMode === 'standalone'
        ? 'https://YOUR_WORKER_DOMAIN/bundles/collection-search/dm-widget.standalone.js'
        : 'https://YOUR_WORKER_DOMAIN/bundles/collection-search/dm-widget.js';

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

// The widget bundle already injects its own CSS. Paste this into the CSS tab, it only ensures the widget fills its container:

#collection-search-root {
   width: 100%;
 }


// CONTENT EDITOR FIELDS

// Create the following fields in the Content Editor tab.
// Field Name               │ Type      │ Default value
// ─────────────────────────┼───────────┼────────────────────────────────────────

// TEXT & LABELS
// searchTitle              │ Text      │ Search
// searchSubtitle           │ Text      │ (empty, hides when blank)
// searchPlaceholder        │ Text      │ Search...
// searchButtonText         │ Text      │ Search
// noResultsText            │ Text      │ No results found
// noResultsSubtext         │ Text      │ Try a different search term
// initialStateText         │ Text      │ Enter a search term to get started
// readMoreText             │ Text      │ Read more ->
// loadingText              │ Text      │ Searching...
// prevText                 │ Text      │ Prev
// nextText                 │ Text      │ Next

// DATA SOURCE
// collectionName           │ Text      │ (empty) <- collection name in site CMS

// FIELD MAPPING OVERRIDES: all optional, leave blank to auto-detect
// titleField               │ Text      │ (empty)
// descField                │ Text      │ (empty)
// imageField               │ Text      │ (empty)
// linkField                │ Text      │ (empty)
// categoryField            │ Text      │ (empty, hides category chip when blank)
// metaField                │ Text      │ (empty, hides meta line when blank)

// FILTERS & SORT
// filterFields             │ Text      │ (empty) <- comma-separated field names to show as filter dropdowns, auto-detected if blank
// multiSelectFields        │ Text      │ (empty) <- comma-separated subset of filterFields to render as multi-select checkboxes
// sortFields               │ Text      │ (empty) <- comma-separated field names to offer in sort dropdown, all schema fields if blank

// LAYOUT
// Duda's Content panel has no plain "Number" type, use Slider instead.
// pageSize                 │ Slider    │ 9
// resultColumns            │ Slider    │ 3
// dynamicPageBase          │ Text      │ (empty) <- e.g. /articles
// cardBorderRadius         │ Text      │ 12px

// No reactMode field here. That's a global setting at
// https://YOUR_WORKER_DOMAIN/, not per widget.


// DESIGN PANEL FIELDS
// Colors belong in the Design tab, not Content. Use the "Color Picker"
// Design field type, not the Content panel's "Color" type.
// Field Name               │ Type          │ Default value
// ─────────────────────────┼───────────────┼────────────────────────
// accentColor              │ Color Picker  │ #3B82F6
// bgColor                  │ Color Picker  │ #ffffff
// borderColor              │ Color Picker  │ #E5E7EB
// textColor                │ Color Picker  │ #111827
// textMutedColor           │ Color Picker  │ #6B7280
