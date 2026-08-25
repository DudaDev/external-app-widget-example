import { APPS, APP_INFO, type AppName, type ReactMode } from './types';

export function rootPage(modes: Record<AppName, ReactMode>): string {
  const standaloneCount = APPS.filter((app) => modes[app] === 'standalone').length;

  const settingsRows = APP_INFO.map(({ name, note }) => `
    <div class="setting-row">
      <div class="setting-row-label">
        <span class="app-name">${name}</span>
        ${note ? `<span class="note">${note}</span>` : ''}
      </div>
      <select name="${name}" id="mode-${name}">
        <option value="shared" ${modes[name] === 'shared' ? 'selected' : ''}>shared, smaller, needs duda-shared-widgets on the page</option>
        <option value="standalone" ${modes[name] === 'standalone' ? 'selected' : ''}>standalone, larger, self-contained</option>
      </select>
    </div>`).join('\n');

  const overviewRows = APP_INFO.map(({ name, note, adminUrl }) => `
    <tr>
      <td><span class="app-name">${name}</span>${note ? `<br><span class="note">${note}</span>` : ''}</td>
      <td><span class="badge ${modes[name] === 'standalone' ? 'warn' : 'ok'}">${modes[name]}</span></td>
      <td>
        <a href="/${name}.html">Open preview</a>
        ${adminUrl ? `<a href="${adminUrl}" target="_blank" rel="noopener">Admin dashboard ↗</a>` : ''}
      </td>
    </tr>`).join('\n');

  const previewCards = APP_INFO.map(({ name, adminUrl }) => `
    <article>
      <div class="card-title-row">
        <h2>${name}</h2>
        <span class="badge ${modes[name] === 'standalone' ? 'warn' : 'ok'}">${modes[name]}</span>
      </div>
      <div class="card-body">
        <div class="links">
          <a href="/${name}.html">Open preview</a>
          <a href="/bundles/${name}/dm-widget.js">Bundle (shared)</a>
          <a href="/bundles/${name}/dm-widget.standalone.js">Bundle (standalone)</a>
          ${adminUrl ? `<a href="${adminUrl}" target="_blank" rel="noopener">Admin dashboard ↗</a>` : ''}
        </div>
      </div>
    </article>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Widget Bundles</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
<style>
  :root { --pico-font-size: 100% !important; }
  :root {
    --pico-spacing: 0.7rem;
    --pico-form-element-spacing-vertical: 0.5rem;
    --pico-form-element-spacing-horizontal: 0.75rem;
    --pico-line-height: 1.3;
    --pico-primary: #4f46e5;
    --pico-primary-background: #4f46e5;
    --pico-primary-hover: #4338ca;
    --pico-primary-hover-background: #4338ca;
    --pico-primary-underline: rgba(79,70,229,0.5);
    --pico-primary-focus: rgba(79,70,229,0.3);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body { margin: 0; }
  h1 { font-size: 1.4rem; margin: 0 0 0.5rem; }
  h2 { font-size: 1.05rem; margin-bottom: 0.4rem; font-family: monospace; }
  article { padding: 1rem 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  table { font-size: 0.9rem; }
  table th, table td { padding: 0.4rem 0.6rem; }

  html, body { overflow: hidden; }
  .app-shell { display: flex; height: 100vh; align-items: stretch; }
  .sidebar {
    width: 210px; flex-shrink: 0; background: #16232f; color: #b9c6d0;
    padding: 1.1rem 0.65rem; height: 100vh; overflow-y: auto;
  }
  .sidebar .brand {
    color: #fff; font-weight: 600; font-size: 0.9rem; letter-spacing: 0.02em;
    padding: 0 0.5rem 1.1rem; display: block; text-decoration: none;
  }
  .sidebar nav { display: flex; flex-direction: column; gap: 0.15rem; }
  .sidebar nav button {
    color: #b9c6d0; text-decoration: none; padding: 0.5rem 0.75rem; border-radius: 6px;
    font-size: 0.85rem; display: flex; align-items: center; gap: 0.55rem;
    background: none; border: none; width: 100%; text-align: left; cursor: pointer; font-family: inherit;
  }
  .sidebar nav button .icon { font-size: 0.95rem; width: 1.1em; text-align: center; }
  .sidebar nav button:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .sidebar nav button.active { background: var(--pico-primary); color: #fff; }

  .content-outer { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100vh; }
  .content-header { padding: 1.1rem 1.5rem 0.5rem; flex-shrink: 0; }
  .content { flex: 1; min-height: 0; overflow-y: auto; padding: 0 1.5rem 1.5rem; }
  .intro { color: var(--pico-muted-color); font-size: 0.82rem; max-width: 620px; margin: 0; }

  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
  .stat-card { padding: 1rem 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: none; border-left: 3px solid var(--pico-primary); margin: 0; }
  .stat-card .stat-value { font-size: 1.8rem; font-weight: 600; line-height: 1.1; }
  .stat-card .stat-label { font-size: 0.8rem; color: var(--pico-muted-color); text-transform: uppercase; letter-spacing: 0.03em; }
  .stat-card.warn { border-left-color: #d97706; }

  .view { display: none; }
  .view.active { display: block; }

  .badge { padding: 0.1rem 0.5rem; border-radius: 3px; font-size: 0.75rem; white-space: nowrap; }
  .badge.ok { background: #d4f7d4; color: #14532d; }
  .badge.warn { background: #fdecd4; color: #7c4a03; }

  .card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
  .card-title-row h2 { margin: 0; }

  .links a { color: var(--pico-primary); text-decoration: none; margin-right: 16px; font-size: 0.85rem; }
  .links a:hover { text-decoration: underline; }

  .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--pico-muted-border-color); flex-wrap: wrap; }
  .setting-row:last-of-type { border-bottom: none; }
  .setting-row-label { display: flex; flex-direction: column; gap: 0.15rem; min-width: 160px; }
  .app-name { font-family: monospace; font-weight: 600; }
  .note { font-size: 0.78rem; color: var(--pico-muted-color); }
  .setting-row select { margin: 0; width: auto; min-width: 280px; }

  form.settings-form button[type="submit"] { width: auto; margin-top: 1rem; }

  @media (max-width: 900px) {
    html, body { overflow: auto; height: auto; }
    .app-shell { flex-direction: column; height: auto; }
    .sidebar { width: 100%; height: auto; padding: 0.6rem; }
    .sidebar .brand { padding: 0 0.5rem 0.5rem; }
    .sidebar nav { flex-direction: row; overflow-x: auto; gap: 0.3rem; }
    .sidebar nav button { flex-shrink: 0; width: auto; white-space: nowrap; }
    .content-outer { height: auto; }
    .content { overflow-y: visible; }
    .setting-row select { min-width: 0; width: 100%; }
  }
</style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" data-view="overview">Widget Bundles</a>
      <nav>
        <button type="button" data-view="overview" class="active"><span class="icon">&#9679;</span> Overview</button>
        <button type="button" data-view="settings"><span class="icon">&#9881;</span> Settings</button>
        <button type="button" data-view="previews"><span class="icon">&#9638;</span> Previews</button>
      </nav>
    </aside>

    <div class="content-outer">
      <div class="content-header">
        <h1>external-app-widget-example</h1>
        <p class="intro">Hosts the ${APPS.length} apps' widget bundles and controls which React-loading mode each one uses.</p>
      </div>

      <main class="content">
        <section class="view active" id="view-overview">
          <div class="stat-grid">
            <article class="stat-card">
              <div class="stat-value">${APPS.length}</div>
              <div class="stat-label">Apps hosted</div>
            </article>
            <article class="stat-card ${standaloneCount > 0 ? 'warn' : ''}">
              <div class="stat-value">${standaloneCount}</div>
              <div class="stat-label">In standalone mode</div>
            </article>
          </div>
          <article>
            <div class="card-title-row"><h2 style="font-family: inherit;">Apps</h2></div>
            <table>
              <thead><tr><th>App</th><th>React mode</th><th></th></tr></thead>
              <tbody>${overviewRows}</tbody>
            </table>
          </article>
          <article>
            <h2 style="font-family: inherit;">Quick actions</h2>
            <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
              <button type="button" class="secondary" data-view="settings" style="width:auto;">Change React mode</button>
              <button type="button" class="secondary" data-view="previews" style="width:auto;">Open a preview</button>
            </div>
          </article>
        </section>

        <section class="view" id="view-settings">
          <article>
            <div class="card-title-row"><h2 style="font-family: inherit;">React mode, per app</h2></div>
            <p><small>Each app is independent. Saving updates all of them at once, but only changes what you've edited (untouched dropdowns keep their current value).</small></p>
            <form class="settings-form" method="POST" action="/admin/react-mode">
              ${settingsRows}
              <button type="submit">Save all</button>
            </form>
          </article>
        </section>

        <section class="view" id="view-previews">
          ${previewCards}
        </section>
      </main>
    </div>
  </div>

  <script>
    function showView(name) {
      document.querySelectorAll('.view').forEach(function (el) {
        el.classList.toggle('active', el.id === 'view-' + name);
      });
      document.querySelectorAll('.sidebar nav button').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.view === name);
      });
    }
    document.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        showView(el.dataset.view);
      });
    });
  </script>
</body>
</html>`;
}
