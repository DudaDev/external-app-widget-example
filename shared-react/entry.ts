import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';

// The one real React copy every app's "shared" bundle borrows via registerReactShims() in
// custom-widget-builder.js. react-dom and react-dom/client merge onto one object.
declare global {
  interface Window {
    __dudaSharedReact: typeof React;
    __dudaSharedReactDOM: typeof ReactDOM & typeof ReactDOMClient;
  }
}

window.__dudaSharedReact = React;
window.__dudaSharedReactDOM = { ...ReactDOM, ...ReactDOMClient };
