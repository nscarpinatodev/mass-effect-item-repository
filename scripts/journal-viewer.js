// ============================================================
// MASS EFFECT JOURNAL VIEWER — Foundry VTT v13 (ApplicationV2)
// A datapad-styled reader for Journal entries.
// ============================================================
(() => {
'use strict';

const MOD    = 'mass-effect-sf2e-conversion';
const SOCKET = `module.${MOD}`;
const ASSET  = p => `modules/${MOD}/assets/journal-viewer/${p}`;

// assigned once the ApplicationV2 class is defined inside the init hook, so
// the socket handler (registered at ready) can reach it.
let Viewer = null;

// ── DATAPAD GEOMETRY (ME2) ──────────────────────────────────────────────────
// Viewport/button values are % of the datapad image, so they scale with the
// window. Tuned against me2-journal-viewer.png (1086 x 1448).
const TEMPLATE = {
  img: 'me2-journal-viewer.png',
  aspect: 1086 / 1448,
  vp:  { left: 10.22, top: 10.50, width: 80.02, height: 39.0, pad: 1.6 },
  // width 30 buttons. Solo Close is centred; with Back present the pair is
  // centred symmetrically about the datapad mid-line (Back 18–48, Close 52–82).
  btn: { top: 52.0, width: 30.0, soloRight: 35.0, pairRight: 18.0, backRight: 52.0 },
};

const padStyle = t => [
  `background-image:url('${ASSET(t.img)}')`,
  `--vp-left:${t.vp.left}%`,   `--vp-top:${t.vp.top}%`,
  `--vp-width:${t.vp.width}%`, `--vp-height:${t.vp.height}%`,
  `--vp-pad:${t.vp.pad}%`,
  `--btn-top:${t.btn.top}%`, `--btn-width:${t.btn.width}%`,
  `--btn-solo-right:${t.btn.soloRight}%`, `--btn-pair-right:${t.btn.pairRight}%`,
  `--btn-back-right:${t.btn.backRight}%`,
].join(';');

// ── HELPERS ─────────────────────────────────────────────────────────────────
async function enrich(html) {
  const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
  try { return await TE.enrichHTML(html ?? '', { secrets: game.user.isGM }); }
  catch (err) { console.warn('ME Journal Viewer | enrichHTML failed', err); return html ?? ''; }
}

function canRead(doc) { return doc.testUserPermission(game.user, 'OBSERVER'); }

// ── GM → PLAYERS PUSH ───────────────────────────────────────────────────────
// Broadcast a "open this entry in the datapad" instruction to other clients.
// Each client only honours it if its user can actually read the entry.
function showToPlayers(entryId) {
  const entry = game.journal.get(entryId);
  if (!entry) return;
  game.socket.emit(SOCKET, { action: 'open', entryId });
  ui.notifications?.info(`Showing "${entry.name}" to players in the datapad.`);
}

function onSocket(data) {
  if (!data || data.action !== 'open') return;
  const entry = game.journal.get(data.entryId);
  if (!entry || !canRead(entry) || !Viewer) return;
  Viewer.open(data.entryId);
}

async function entryPagesHTML(entry) {
  const pages = entry.pages.contents.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const parts = [];
  for (const p of pages) {
    if (!canRead(p)) continue;
    const title = `<h2 class="me-jv-page-title">${foundry.utils.escapeHTML?.(p.name) ?? p.name}</h2>`;
    if (p.type === 'text' && p.text?.content) {
      parts.push(`<section class="me-jv-page">${title}${await enrich(p.text.content)}</section>`);
    } else if (p.type === 'image' && p.src) {
      const cap = p.image?.caption ? `<p class="me-jv-cap">${p.image.caption}</p>` : '';
      parts.push(`<section class="me-jv-page">${title}<img class="me-jv-page-img" src="${p.src}" alt="${p.name}">${cap}</section>`);
    }
  }
  return parts.join('') || '<p class="me-jv-empty">This entry has no readable pages.</p>';
}

// ── STYLES ──────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('me-jv-styles')) return;
  const style = document.createElement('style');
  style.id = 'me-jv-styles';
  style.textContent = `
    /* strip the Foundry window chrome — the datapad IS the frame */
    #me-journal-viewer { background: transparent !important; border: none !important; box-shadow: none !important; }
    #me-journal-viewer .window-header { display: none; }
    #me-journal-viewer .window-content { padding: 0; background: transparent; overflow: hidden; }

    .me-jv-pad {
      position: relative; width: 100%; height: 100%;
      background-repeat: no-repeat; background-position: center; background-size: 100% 100%;
      font-family: "Titillium Web", "Signika", system-ui, sans-serif;
      user-select: none;
    }

    .me-jv-drag { position: absolute; left: 0; top: 0; width: 100%; height: 9%; cursor: move; }

    .me-jv-viewport {
      position: absolute;
      left: var(--vp-left); top: var(--vp-top);
      width: var(--vp-width); height: var(--vp-height);
      box-sizing: border-box; padding: var(--vp-pad);
      color: #f9c08a; overflow-y: auto; overflow-x: hidden;
      line-height: 1.5; text-shadow: 0 0 6px rgba(255,150,40,0.55);
      scrollbar-width: thin; scrollbar-color: #c8761e transparent;
      user-select: text;
    }
    .me-jv-viewport::-webkit-scrollbar { width: 8px; }
    .me-jv-viewport::-webkit-scrollbar-track { background: transparent; }
    .me-jv-viewport::-webkit-scrollbar-thumb { background: #c8761e; border-radius: 4px; }

    .me-jv-title {
      font-size: clamp(14px, 2.0vh, 26px); font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: #ffd9a8;
      margin: 0 0 0.6em 0; text-shadow: 0 0 10px rgba(255,150,40,0.55);
    }
    .me-jv-body, .me-jv-page { font-size: clamp(11px, 1.55vh, 19px); }
    .me-jv-page-title { font-size: 1.05em; color: #ffd9a8; margin: 0.8em 0 0.3em; }
    .me-jv-viewport p { margin: 0 0 0.85em 0; }
    .me-jv-viewport a { color: #ffd27a; text-decoration: underline; }
    .me-jv-viewport a.content-link, .me-jv-viewport a.inline-roll {
      background: rgba(200,118,30,0.18); border: 1px solid rgba(200,118,30,0.5);
      color: #ffe0b0; padding: 0 4px; border-radius: 3px; text-decoration: none;
    }
    .me-jv-viewport h1, .me-jv-viewport h2, .me-jv-viewport h3 { color: #ffd9a8; border: none; }
    .me-jv-viewport hr { border: none; border-top: 1px solid #c8761e; opacity: 0.5; margin: 1em 0; }
    .me-jv-viewport img, .me-jv-page-img { max-width: 100%; border: none; }
    .me-jv-cap { font-style: italic; opacity: 0.85; }

    .me-jv-list { list-style: none; margin: 0; padding: 0; }
    .me-jv-list-item {
      padding: 0.45em 0.3em; border-bottom: 1px solid rgba(200,118,30,0.35);
      cursor: pointer; display: flex; align-items: center; gap: 0.5em;
    }
    .me-jv-list-item::before { content: "\\f15c"; font-family: "Font Awesome 6 Free"; font-weight: 900; opacity: 0.6; font-size: 0.85em; }
    .me-jv-list-item:hover { color: #ffd9a8; background: rgba(200,118,30,0.10); }
    .me-jv-empty { opacity: 0.8; font-style: italic; }

    /* Close button — uses the datapad's own button artwork with text overlaid */
    .me-jv-btn {
      position: absolute; top: var(--btn-top);
      width: var(--btn-width); aspect-ratio: 277 / 54;
      display: flex; align-items: center; justify-content: center; box-sizing: border-box;
      border: none; background-color: transparent;
      background-repeat: no-repeat; background-position: center; background-size: 100% 100%;
      font-family: inherit; font-size: clamp(10px, 1.6vh, 19px); font-weight: 600;
      letter-spacing: 0.04em; color: #ffe9cf; text-shadow: 0 1px 2px rgba(0,0,0,0.75);
      cursor: pointer; transition: filter 0.12s ease;
    }
    /* Close is centred when alone; shifts right to balance Back when present. */
    .me-jv-btn-right { right: var(--btn-solo-right); background-image: url('${ASSET('button-right.png')}'); padding-right: 8%; }
    .me-jv-pad.me-jv-entry .me-jv-btn-right { right: var(--btn-pair-right); }
    .me-jv-btn-left  { right: var(--btn-back-right); background-image: url('${ASSET('button-left.png')}');  padding-left:  8%; }
    .me-jv-btn:hover  { filter: brightness(1.15); }
    .me-jv-btn:active { filter: brightness(0.95); transform: translateY(1px); }
  `;
  document.head.appendChild(style);
}

// ── APPLICATION ─────────────────────────────────────────────────────────────
Hooks.once('init', () => {

  class MEJournalViewer extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: 'me-journal-viewer',
      classes: ['me-jv'],
      tag: 'div',
      window: { title: 'Journal Viewer', frame: true, resizable: false, minimizable: false },
      position: { width: 620, height: 826 },
    };

    static _instance = null;

    _entryId = null;

    static open(entryId = null) {
      const aspect = TEMPLATE.aspect;
      const height = Math.min(900, Math.round(window.innerHeight * 0.92));
      const width  = Math.round(height * aspect);
      const left   = Math.round((window.innerWidth  - width)  / 2);
      const top    = Math.round((window.innerHeight - height) / 2);

      MEJournalViewer._instance?.close();
      const inst = MEJournalViewer._instance = new MEJournalViewer();
      inst._entryId = entryId;
      inst.render({ force: true, position: { width, height, left, top } });
    }

    async _prepareContext() {
      const tpl = TEMPLATE;

      const entry = this._entryId ? game.journal.get(this._entryId) : null;
      if (entry && canRead(entry)) {
        return { mode: 'entry', tpl, entryName: entry.name, pagesHTML: await entryPagesHTML(entry) };
      }
      const entries = game.journal.contents
        .filter(canRead)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(j => ({ id: j.id, name: j.name }));
      return { mode: 'list', tpl, entries };
    }

    async _renderHTML(context) {
      const pad = document.createElement('div');
      pad.className = 'me-jv-pad';
      pad.setAttribute('style', padStyle(context.tpl));

      if (context.mode === 'entry') pad.classList.add('me-jv-entry');

      let inner, backBtn = '';
      if (context.mode === 'entry') {
        inner = `
          <div class="me-jv-viewport">
            <h1 class="me-jv-title">${context.entryName}</h1>
            <div class="me-jv-body">${context.pagesHTML}</div>
          </div>`;
        backBtn = `<button type="button" class="me-jv-btn me-jv-btn-left" data-action="index">Back</button>`;
      } else {
        const items = context.entries.length
          ? context.entries.map(e => `<li class="me-jv-list-item" data-action="open-entry" data-entry-id="${e.id}">${e.name}</li>`).join('')
          : '<li class="me-jv-empty">No journal entries available.</li>';
        inner = `
          <div class="me-jv-viewport">
            <h1 class="me-jv-title">Journal Index</h1>
            <ul class="me-jv-list">${items}</ul>
          </div>`;
      }

      pad.innerHTML = `
        <div class="me-jv-drag"></div>
        ${inner}
        ${backBtn}
        <button type="button" class="me-jv-btn me-jv-btn-right" data-action="close">Close</button>`;
      return pad;
    }

    _replaceHTML(result, content) { content.replaceChildren(result); }

    _onRender(context, options) {
      if (this._listenerElement !== this.element) {
        this.element.addEventListener('click', this._onClick.bind(this));
        this._listenerElement = this.element;
      }
      const handle = this.element.querySelector('.me-jv-drag');
      if (handle) this._bindDrag(handle);
    }

    _bindDrag(handle) {
      handle.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        const sx = ev.clientX, sy = ev.clientY;
        const p0 = this.position;
        const left0 = p0.left ?? 0, top0 = p0.top ?? 0;
        const onMove = e => this.setPosition({ left: left0 + (e.clientX - sx), top: top0 + (e.clientY - sy) });
        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
    }

    async _onClick(event) {
      const el = event.target.closest('[data-action]');
      if (!el) return;
      const action = el.dataset.action;
      if (action === 'close')      { this.close(); return; }
      if (action === 'index')      { this._entryId = null; await this.render(); return; }
      if (action === 'open-entry') { this._entryId = el.dataset.entryId; await this.render(); return; }
    }
  }

  Viewer = MEJournalViewer;
  globalThis.MassEffectJournalViewer = {
    open: id => MEJournalViewer.open(id),
    showToPlayers: id => showToPlayers(id),
  };

  // Right-click context-menu options on journal entries in the sidebar.
  // The options array is the trailing Array argument across hook signatures.
  const addEntryContext = (...args) => {
    const options = [...args].reverse().find(a => Array.isArray(a));
    if (!options) return;
    const idOf = li => {
      const el = li instanceof HTMLElement ? li : li?.[0];
      return el?.dataset.entryId ?? el?.dataset.documentId ?? null;
    };
    options.push({
      name: 'Show in Datapad',
      icon: '<i class="fa-solid fa-tablet-screen-button"></i>',
      condition: () => game.user.isGM,
      callback: li => { const id = idOf(li); if (id) showToPlayers(id); },
    });
    options.push({
      name: 'Open in Datapad',
      icon: '<i class="fa-solid fa-tablet-screen-button"></i>',
      condition: () => true,
      callback: li => { const id = idOf(li); if (id) MEJournalViewer.open(id); },
    });
  };
  for (const hook of ['getJournalDirectoryEntryContext', 'getJournalEntryContextOptions'])
    Hooks.on(hook, addEntryContext);

  // "Show in Datapad" button in the journal entry sheet header (GM only)
  const addSheetHeaderButton = (app, html) => {
    if (!game.user.isGM) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const header = root?.querySelector('.window-header');
    if (!header || header.querySelector('[data-me-jv-show]')) return;
    const entry = app.document;
    if (!entry?.id) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'header-control icon fa-solid fa-tablet-screen-button';
    btn.dataset.meJvShow = '1';
    btn.dataset.tooltip = 'Show in Datapad';
    btn.setAttribute('aria-label', 'Show in Datapad');
    btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); showToPlayers(entry.id); });
    const closeBtn = header.querySelector('[data-action="close"]');
    if (closeBtn) closeBtn.before(btn); else header.appendChild(btn);
  };
  for (const hook of ['renderJournalEntrySheet', 'renderJournalSheet'])
    Hooks.on(hook, addSheetHeaderButton);
});

Hooks.once('ready', () => {
  injectStyles();
  game.socket.on(SOCKET, onSocket);
});

})();
