'use strict';
(() => {
  const root = document.getElementById('cleario-prototype');
  const $ = id => document.getElementById(id);
  const input = $('cl-input');
  let rich = '', result = '', mode = 'clean', view = 'preview', blocks = [], stale = false;
  const sample = '## A calmer working day\n\nGood writing deserves a clean start.\u00a0\u00a0Keep the words, lose the hidden\u200b formatting.\n\n### Before you publish\n\n• Check your headings\n• Keep paragraphs readable\n• Remove unwanted formatting\n\n#### One final check\n\nPreview your content, then copy it into your CMS.';
  const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function normalize(s) {
    return s.normalize('NFC').replace(/\r\n?/g, '\n')
      .replace(/[\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD]/g, '')
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000\t]/g, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .split('\n').map(l => l.replace(/ +/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function parse(source, isRich) {
    const items = [];
    const add = (text, type = 'p') => {
      text = normalize(text); if (!text) return;
      const heading = text.match(/^(#{1,6})\s+([\s\S]+)$/);
      if (heading) { type = 'h' + Math.min(4, Math.max(2, heading[1].length)); text = heading[2]; }
      if (/^[•●▪◦*\-]\s+/.test(text)) { type = 'li'; text = text.replace(/^[•●▪◦*\-]\s+/, ''); }
      items.push({ text, type });
    };
    if (isRich || /<\/?[a-z][a-z0-9:-]*\b[^>]*>/i.test(source)) {
      // Inert template: content is never attached; output is rebuilt from escaped text only.
      const template = document.createElement('template');
      template.innerHTML = source;
      template.content.querySelectorAll('script,style,iframe,object,embed,template,svg,math,head,title,meta,link,noscript,[hidden]').forEach(e => e.remove());
      const blockTags = /^(P|DIV|H[1-6]|LI|UL|OL|SECTION|ARTICLE|BLOCKQUOTE|TR|TABLE|TBODY|THEAD|FOOTER|HEADER)$/;
      function walk(parent, inherited = 'p') {
        let buffer = '';
        const flush = () => { add(buffer, inherited); buffer = ''; };
        for (const child of parent.childNodes) {
          if (child.nodeType === 3) { buffer += child.textContent; continue; }
          if (child.nodeType !== 1) continue;
          if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(child.getAttribute('style') || '')) continue;
          if (child.tagName === 'BR') { buffer += '\n'; continue; }
          if (blockTags.test(child.tagName)) {
            flush();
            let type = 'p';
            const word = ((child.className || '') + ' ' + (child.getAttribute('style') || '')).match(/(?:MsoHeading|heading\s*|outline-level\s*:\s*)([1-6])/i);
            if (/^H[1-6]$/.test(child.tagName)) type = 'h' + Math.min(4, Math.max(2, +child.tagName[1]));
            else if (word) type = 'h' + Math.min(4, +word[1] + 1);
            else if (child.tagName === 'LI' || /mso-list\s*:/i.test(child.getAttribute('style') || '')) type = 'li';
            walk(child, type);
          } else if (child.tagName === 'TD' || child.tagName === 'TH') buffer += child.textContent + ' ';
          else buffer += child.textContent;
        }
        flush();
      }
      walk(template.content);
    } else {
      const decode = document.createElement('textarea');
      decode.innerHTML = escape(source).replace(/&amp;((?:#\d+|#x[\da-f]+|[a-z]+);)/gi, '&$1');
      const lines = normalize(decode.value).split('\n');
      let paragraph = [];
      const flush = () => { if (paragraph.length) add(paragraph.join('\n')); paragraph = []; };
      lines.forEach((line, i) => {
        if (!line) return flush();
        if (/^(?:#{1,6}\s|[•●▪◦*\-]\s)/.test(line)) { flush(); add(line); return; }
        const isolated = (i === 0 || !lines[i-1]) && (i === lines.length-1 || !lines[i+1]);
        // Conservative suggestion; every block can be corrected before copying.
        if (isolated && line.length <= 85 && line.split(/\s+/).length <= 10 && !/[.!;,]$/.test(line)) { flush(); add(line, 'h2'); }
        else paragraph.push(line);
      });
      flush();
    }
    let prior = 1;
    items.forEach(b => { if (/^h/.test(b.type)) { const level = Math.min(+b.type[1], prior + 1); b.type = 'h' + Math.max(2, level); prior = +b.type[1]; } });
    return items;
  }
  function serialize() {
    if (mode === 'clean') {
      let plain = blocks.map(b => b.text).join('\n\n');
      if (!$('cl-spacing').checked) plain = plain.replace(/\s+/g, ' ');
      return plain;
    }
    let list = false; const out = [];
    for (const b of blocks) {
      if (b.type === 'li') { if (!list) { out.push('<ul>'); list = true; } out.push('  <li>' + escape(b.text) + '</li>'); continue; }
      if (list) { out.push('</ul>'); list = false; }
      out.push('<' + b.type + '>' + escape(b.text).replace(/\n/g, '<br>') + '</' + b.type + '>');
    }
    if (list) out.push('</ul>');
    return out.join('\n');
  }
  function render() {
    result = serialize(); const output = $('cl-output'); output.replaceChildren();
    if (result) {
      if (mode === 'clean' || view === 'html') { const pre = document.createElement('pre'); pre.textContent = result; output.append(pre); }
      else output.innerHTML = result;
    }
    $('cl-preview-tab').setAttribute('aria-pressed', String(view === 'preview'));
    $('cl-html-tab').setAttribute('aria-pressed', String(view === 'html'));
    $('cl-html-tab').disabled = mode === 'clean';
    $('cl-copy').disabled = !result || stale;
    $('cl-output-count').textContent = blocks.map(b => b.text).join('\n\n').length.toLocaleString() + ' characters';
    $('cl-review').hidden = mode !== 'optimize' || !blocks.length;
  }
  function review() {
    $('cl-heading-controls').replaceChildren();
    blocks.forEach((block, index) => {
      const row = document.createElement('label'); row.className = 'cl-heading-row';
      const label = document.createElement('span'); label.textContent = block.text.slice(0, 90);
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Format: ' + block.text.slice(0, 90));
      [['p','Paragraph'],['h2','H2 · Main heading'],['h3','H3 · Subheading'],['h4','H4 · Detail heading'],['li','Bullet point']].forEach(([value,text]) => { const option = new Option(text,value); select.add(option); });
      select.value = block.type;
      select.onchange = () => { blocks[index].type = select.value; render(); $('cl-result-state').textContent = 'Structure updated'; };
      row.append(label,select); $('cl-heading-controls').append(row);
    });
  }
  function run(nextMode) {
    mode = nextMode; stale = false; if (mode === 'clean') view = 'preview';
    blocks = parse(rich || input.value, !!rich); render(); review();
    $('cl-result-state').textContent = result ? (mode === 'clean' ? 'Text cleaned' : 'Structure ready to review') : 'Paste some text to start';
    $('cl-note').textContent = mode === 'clean' ? 'Formatting removed. Words, letters and punctuation preserved.' : 'Heading levels are suggestions. Use “Review heading levels” to adjust them before publishing.';
  }
  function changed() { $('cl-count').textContent = input.value.length.toLocaleString() + ' characters'; stale = true; $('cl-copy').disabled = true; $('cl-result-state').textContent = 'Content changed · run Clean or Optimize'; }
  input.oninput = () => { rich = ''; changed(); };
  input.addEventListener('paste', e => {
    const html = e.clipboardData?.getData('text/html'), text = e.clipboardData?.getData('text/plain');
    if (!html || !text) return;
    // Preserve rich semantics only when replacing all content, not for mixed partial edits.
    if (!input.value || (input.selectionStart === 0 && input.selectionEnd === input.value.length)) { e.preventDefault(); input.value = text; rich = html; changed(); }
  });
  $('cl-clean').onclick = () => run('clean'); $('cl-optimize').onclick = () => run('optimize');
  $('cl-spacing').onchange = () => { if (mode === 'clean' && !stale) render(); };
  $('cl-preview-tab').onclick = () => { view = 'preview'; render(); };
  $('cl-html-tab').onclick = () => { view = 'html'; render(); };
  $('cl-clear').onclick = () => { input.value = ''; rich = ''; changed(); run('clean'); input.focus(); };
  $('cl-sample').onclick = () => { input.value = sample; rich = ''; changed(); run('optimize'); };
  $('cl-copy').onclick = async () => {
    try {
      if (mode === 'optimize' && view === 'preview' && window.ClipboardItem && navigator.clipboard?.write) {
        const text = blocks.map(b => b.text).join('\n\n');
        await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([result],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);
        $('cl-result-state').textContent = 'Formatted text copied';
      } else { await navigator.clipboard.writeText(result); $('cl-result-state').textContent = mode === 'clean' ? 'Text copied' : 'HTML copied'; }
    } catch {
      view = mode === 'clean' ? 'preview' : 'html'; render();
      const range = document.createRange(); range.selectNodeContents($('cl-output')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      $('cl-result-state').textContent = 'Press Ctrl+C or ⌘C to copy the selected result';
    }
  };
  function theme(value) {
    const dark = value === 'dark'; const choice = dark ? 'dark' : 'light';
    $('cl-theme').value = choice; root.style.colorScheme = choice; document.documentElement.dataset.theme = choice;
    $('cl-theme-label').textContent = dark ? 'Dark' : 'Light'; $('cl-theme-sun').hidden = dark; $('cl-theme-moon').hidden = !dark;
    $('cl-theme-light').setAttribute('aria-pressed', String(!dark)); $('cl-theme-dark').setAttribute('aria-pressed', String(dark));
    try { localStorage.setItem('cleario-theme', choice); } catch {}
  }
  function closeTheme(focus = false) { $('cl-theme-menu').hidden = true; $('cl-theme-toggle').setAttribute('aria-expanded', 'false'); if (focus) $('cl-theme-toggle').focus(); }
  $('cl-theme-toggle').onclick = () => { const open = $('cl-theme-menu').hidden; $('cl-theme-menu').hidden = !open; $('cl-theme-toggle').setAttribute('aria-expanded', String(open)); };
  ['light','dark'].forEach(value => { $('cl-theme-' + value).onclick = () => { theme(value); closeTheme(true); }; });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('cl-theme-menu').hidden) closeTheme(true); });
  document.addEventListener('click', e => { if (!root.querySelector('.cl-theme-wrap').contains(e.target)) closeTheme(); });
  root.querySelector('.cl-theme-wrap').addEventListener('focusout', e => { if (!e.currentTarget.contains(e.relatedTarget)) closeTheme(); });
  let choice = 'light'; try { choice = localStorage.getItem('cleario-theme') || choice; } catch {} theme(choice);
  changed(); run('clean');
})();
