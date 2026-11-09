// Convierte la pieza, tal como la dibuja el navegador, en un SVG para Figma:
// textos editables (fuente Inter), formas con sus degradados y sombras, y capas con nombre.
// Se activa con ?svg en la dirección; lo usa redes/exportar.sh. No hace falta editarlo para cambiar textos.
(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));

  const art = document.querySelector('.art');
  const A = art.getBoundingClientRect();
  const W = Math.round(A.width);
  const H = Math.round(A.height);
  const defs = [];
  const copied = new Set();
  let uid = 0;
  const newId = (p) => `${p}-${++uid}`;
  const n = (v) => +(+v).toFixed(2);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left - A.left, y: r.top - A.top, w: r.width, h: r.height }; };

  // --- colores y degradados de CSS a SVG ---
  const splitTop = (s) => {
    const out = []; let depth = 0; let cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  const color = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const hex = (c) => '#' + c.rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const fillAttr = (c, prop = 'fill') => `${prop}="${hex(c)}"${c.a < 1 ? ` ${prop}-opacity="${n(c.a)}"` : ''}`;

  const parseStops = (parts) => {
    const s = parts.map((p) => {
      const i = p.lastIndexOf(')');
      const pos = p.slice(i + 1).trim();
      return { c: color(p.slice(0, i + 1)), pos: pos ? parseFloat(pos) / 100 : null };
    });
    if (s[0].pos == null) s[0].pos = 0;
    if (s.at(-1).pos == null) s.at(-1).pos = 1;
    for (let i = 1; i < s.length - 1; i++) {
      if (s[i].pos != null) continue;
      let j = i; while (s[j].pos == null) j++;
      for (let k = i; k < j; k++) s[k].pos = s[i - 1].pos + (s[j].pos - s[i - 1].pos) * (k - i + 1) / (j - i + 1);
    }
    // "transparent" toma el color del vecino, como lo mezcla el navegador.
    s.forEach((st, i) => {
      if (st.c.a > 0) return;
      const nb = [s[i - 1], s[i + 1]].find((x) => x && x.c.a > 0);
      if (nb) st.c = { rgb: nb.c.rgb, a: 0 };
    });
    return s;
  };
  const stopsSvg = (s) => s.map((st) => `<stop offset="${n(st.pos)}" stop-color="${hex(st.c)}"${st.c.a < 1 ? ` stop-opacity="${n(st.c.a)}"` : ''}/>`).join('');
  const args = (css) => splitTop(css.slice(css.indexOf('(') + 1, css.lastIndexOf(')')));

  const linear = (css, b) => {
    const parts = args(css);
    let ang = 180;
    if (/deg$/.test(parts[0])) ang = parseFloat(parts.shift());
    else if (/^to /.test(parts[0])) ang = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[parts.shift()] ?? 180;
    const s = parseStops(parts);
    if (s.every((x) => hex(x.c) === hex(s[0].c) && x.c.a === s[0].c.a)) return fillAttr(s[0].c);
    const r = ang * Math.PI / 180; const dx = Math.sin(r); const dy = -Math.cos(r);
    const L = Math.abs(b.w * dx) + Math.abs(b.h * dy);
    const cx = b.x + b.w / 2; const cy = b.y + b.h / 2;
    const id = newId('degradado');
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(cx - dx * L / 2)}" y1="${n(cy - dy * L / 2)}" x2="${n(cx + dx * L / 2)}" y2="${n(cy + dy * L / 2)}">${stopsSvg(s)}</linearGradient>`);
    return `fill="url(#${id})"`;
  };
  const radial = (css, b) => {
    const parts = args(css);
    const m = /([\d.]+)% ([\d.]+)% at ([\d.]+)% ([\d.]+)%/.exec(parts.shift());
    const rx = m[1] / 100 * b.w; const ry = m[2] / 100 * b.h;
    const cx = b.x + m[3] / 100 * b.w; const cy = b.y + m[4] / 100 * b.h;
    const id = newId('luz');
    defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="translate(${n(cx)} ${n(cy)}) scale(1 ${n(ry / rx)}) translate(${n(-cx)} ${n(-cy)})">${stopsSvg(parseStops(parts))}</radialGradient>`);
    return `fill="url(#${id})"`;
  };
  const paint = (layer, b) => (layer.startsWith('linear') ? linear(layer, b) : radial(layer, b));

  // --- sombras, con el mismo esquema de filtros que exporta Figma (así las reconoce como efecto) ---
  const parseShadows = (s) => (!s || s === 'none' ? [] : splitTop(s).map((p) => {
    const i = p.lastIndexOf(')');
    const [dx = 0, dy = 0, blur = 0, spread = 0] = p.slice(i + 1).trim().split(/\s+/).map(parseFloat);
    return { c: color(p.slice(0, i + 1)), dx, dy, blur, spread };
  }));
  const shadowFilter = (list, b) => {
    const id = newId('sombra');
    const pad = Math.max(...list.map((s) => Math.abs(s.dx) + Math.abs(s.dy) + s.blur * 1.5 + Math.max(s.spread, 0))) + 4;
    let f = `<filter id="${id}" x="${n(b.x - pad)}" y="${n(b.y - pad)}" width="${n(b.w + 2 * pad)}" height="${n(b.h + 2 * pad)}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/>`;
    let prev = 'BackgroundImageFix';
    [...list].reverse().forEach((s, i) => {
      const res = `effect${i + 1}_dropShadow`;
      const [r, g, bl] = s.c.rgb.map((v) => n(v / 255));
      f += '<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>';
      if (s.spread) f += `<feMorphology radius="${Math.abs(s.spread)}" operator="${s.spread < 0 ? 'erode' : 'dilate'}" in="SourceAlpha" result="${res}"/>`;
      f += `<feOffset dx="${n(s.dx)}" dy="${n(s.dy)}"/>`;
      if (s.blur) f += `<feGaussianBlur stdDeviation="${n(s.blur / 2)}"/>`;
      f += `<feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${bl} 0 0 0 ${n(s.c.a)} 0"/><feBlend mode="normal" in2="${prev}" result="${res}"/>`;
      prev = res;
    });
    defs.push(`${f}<feBlend mode="normal" in="SourceGraphic" in2="${prev}" result="shape"/></filter>`);
    return ` filter="url(#${id})"`;
  };

  // --- formas ---
  const radius = (el, b) => {
    const r = getComputedStyle(el).borderTopLeftRadius;
    const v = r.endsWith('%') ? parseFloat(r) / 100 * b.w : parseFloat(r) || 0;
    return Math.min(v, b.w / 2, b.h / 2);
  };
  const shape = (b, r, attrs) => {
    if (Math.abs(b.w - b.h) < 0.5 && r >= b.w / 2 - 0.5) return `<circle cx="${n(b.x + b.w / 2)}" cy="${n(b.y + b.h / 2)}" r="${n(b.w / 2)}" ${attrs}/>`;
    return `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}"${r ? ` rx="${n(r)}"` : ''} ${attrs}/>`;
  };
  const inset = (b, d) => ({ x: b.x + d, y: b.y + d, w: b.w - 2 * d, h: b.h - 2 * d });

  const drawBox = (el, b, cs) => {
    if (cs.display === 'contents' || !b.w || !b.h) return '';
    if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') return '';
    const layers = cs.backgroundImage === 'none' ? [] : splitTop(cs.backgroundImage);
    const bg = color(cs.backgroundColor);
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const bc = color(cs.borderTopColor);
    const sh = parseShadows(cs.boxShadow);
    const hasBg = layers.length || (bg && bg.a > 0);
    if (!hasBg && !sh.length && !(bw && bc && bc.a > 0)) return '';
    const r = radius(el, b);
    const filt = sh.length ? shadowFilter(sh, b) : '';
    const op = +cs.opacity < 1 ? ` opacity="${n(cs.opacity)}"` : '';
    const fill = (bb) => (layers.length ? paint(layers[0], bb) : hasBg ? fillAttr(bg) : 'fill="none"');
    // Borde de degradado: fondo blanco por dentro y degradado en el borde (el botón).
    if (layers.length === 2 && bw && (!bc || bc.a === 0)) {
      const stroke = paint(layers[1], b).replace(/^fill/, 'stroke');
      return shape(inset(b, bw / 2), r - bw / 2, `${fill(b)} ${stroke} stroke-width="${n(bw)}"${filt}${op}`);
    }
    if (bw && bc && bc.a > 0) {
      let out = shape(b, r, `${fillAttr(bc)}${filt}${op}`);
      if (hasBg) out += shape(inset(b, bw), Math.max(r - bw, 0), `${fill(b)}${op}`);
      return out;
    }
    return shape(b, r, `${fill(b)}${filt}${op}`);
  };

  const copyDef = (id) => {
    if (copied.has(id)) return;
    const el = document.getElementById(id);
    if (el) { copied.add(id); defs.push(el.outerHTML); }
  };
  const drawSvg = (svg, b, cs) => {
    const use = svg.querySelector('use');
    const sym = use && document.querySelector(use.getAttribute('href'));
    const vb = (svg.getAttribute('viewBox') || sym?.getAttribute('viewBox')).split(/[\s,]+/).map(Number);
    const s = Math.min(b.w / vb[2], b.h / vb[3]);
    const tx = b.x + (b.w - vb[2] * s) / 2 - vb[0] * s;
    const ty = b.y + (b.h - vb[3] * s) / 2 - vb[1] * s;
    const inner = (sym || svg).innerHTML.replace(/currentColor/g, hex(color(cs.color)));
    for (const m of inner.matchAll(/url\(#([\w-]+)\)/g)) copyDef(m[1]);
    let out = `<g transform="translate(${n(tx)} ${n(ty)}) scale(${+s.toFixed(5)})">${inner}</g>`;
    const ds = /drop-shadow\((.+)\)/.exec(cs.filter);
    if (ds) out = `<g${shadowFilter(parseShadows(ds[1]), b)}>${out}</g>`;
    return out;
  };

  // --- textos: un bloque de texto = una capa de texto editable ---
  const baseFont = getComputedStyle(document.body).fontFamily;
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;left:0;top:0;font:400 100px ${baseFont};line-height:normal;letter-spacing:0`;
  probe.innerHTML = 'H<span style="display:inline-block;width:1px;height:0"></span>';
  document.body.append(probe);
  const pr = document.createRange(); pr.selectNodeContents(probe.firstChild);
  const ascent = (probe.lastChild.getBoundingClientRect().bottom - pr.getBoundingClientRect().top) / 100;
  probe.remove();

  const isInline = (el) => getComputedStyle(el).display === 'inline';
  const gradHost = (node, block) => {
    for (let e = node; e && block.contains(e); e = e.parentElement) {
      const c = getComputedStyle(e);
      if (c.backgroundClip === 'text' || c.webkitBackgroundClip === 'text') return e;
      if (e === block) break;
    }
    return null;
  };
  const textFill = (frag, block) => {
    const g = gradHost(frag.host, block);
    if (!g) return fillAttr(color(frag.cs.color));
    const rect = [...g.getClientRects()].find((r) => r.bottom > frag.top && r.top < frag.bottom) || g.getBoundingClientRect();
    return linear(getComputedStyle(g).backgroundImage, { x: rect.left - A.left, y: rect.top - A.top, w: rect.width, h: rect.height });
  };
  const textBlock = (el, cs) => {
    const nodes = [];
    const collect = (node) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3 && c.textContent.trim()) nodes.push(c);
        else if (c.nodeType === 1 && c.namespaceURI === 'http://www.w3.org/1999/xhtml' && c.tagName !== 'IMG' && isInline(c)) collect(c);
      }
    };
    collect(el);
    if (!nodes.length) return '';
    const frags = [];
    const range = document.createRange();
    for (const tn of nodes) {
      const host = tn.parentElement; const hcs = getComputedStyle(host); const txt = tn.textContent;
      let cur = null;
      for (let i = 0; i < txt.length; i++) {
        if (/\s/.test(txt[i])) continue;
        range.setStart(tn, i); range.setEnd(tn, i + 1);
        const r = range.getClientRects()[0];
        if (!r) continue;
        if (cur && Math.abs(r.top - cur.top) < 2) { cur.end = i + 1; cur.right = r.right; continue; }
        if (cur) frags.push(cur);
        cur = { tn, host, cs: hcs, start: i, end: i + 1, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }
      if (cur) frags.push(cur);
    }
    const fs = parseFloat(cs.fontSize);
    const lines = [];
    for (const f of frags) {
      const L = lines.at(-1);
      if (L && Math.abs(f.top - L[0].top) < fs * 0.3) L.push(f); else lines.push([f]);
    }
    const baseFill = fillAttr(color(cs.color));
    const alignEnd = lines.length === 1 && /right|end/.test(cs.textAlign);
    let spans = '';
    for (const L of lines) {
      L.forEach((f, i) => {
        const ffs = parseFloat(f.cs.fontSize);
        let s = f.tn.textContent.slice(f.start, f.end).replace(/\s+/g, ' ');
        // Espacio al final de cada renglón (menos el último), para que al editar en Figma no se peguen las palabras.
        if (i === L.length - 1 && L !== lines.at(-1)) s += ' ';
        const at = [];
        if (i === 0) at.push(`x="${n((alignEnd ? L.at(-1).right : f.left) - A.left)}" y="${n(f.top - A.top + ascent * ffs)}"`);
        else if (f.left - L[i - 1].right > ffs * 0.12) s = ' ' + s;
        if (f.cs.fontWeight !== cs.fontWeight) at.push(`font-weight="${f.cs.fontWeight}"`);
        const fill = textFill(f, el);
        // Si el bloque es transparente (texto con degradado), el tramo vuelve a ser opaco.
        if (fill !== baseFill) at.push(fill + (/fill-opacity/.test(baseFill) && !/fill-opacity/.test(fill) ? ' fill-opacity="1"' : ''));
        spans += `<tspan${at.length ? ' ' + at.join(' ') : ''}>${esc(s)}</tspan>`;
      });
    }
    const ls = parseFloat(cs.letterSpacing) || 0;
    const extra = (alignEnd ? ' text-anchor="end"' : '') + (/tabular/.test(cs.fontVariantNumeric) ? ' style="font-variant-numeric:tabular-nums"' : '');
    return `<text xml:space="preserve" font-family="Inter" font-size="${n(fs)}" font-weight="${cs.fontWeight}" letter-spacing="${n(ls)}" ${baseFill}${extra}>${spans}</text>`;
  };

  // --- recorrido de la pieza, en el orden en que el navegador pinta ---
  const NAMES = { brand: 'marca', badge: 'insignia', main: 'tarjeta-principal', sep: 'separador', lead: 'bajada', avw: 'paises', avcap: 'texto-paises', plus: 'mas-paises', big: 'comision', listw: 'lo-que-recibes', pill: 'etiqueta', list: 'lista', cta: 'boton', sp: 'destello', cursor: 'cursor' };
  const usedNames = {};
  const layerName = (el) => {
    const key = [...el.classList].find((c) => NAMES[c]);
    const flag = el.classList.contains('flag') && el.querySelector(':scope > svg[aria-label]')?.getAttribute('aria-label');
    let name = key ? NAMES[key] : null;
    if (flag) name = 'bandera-' + flag.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    else if (el.getAttribute('aria-label') === 'UBITS') name = 'logo-ubits';
    if (!name) return null;
    usedNames[name] = (usedNames[name] || 0) + 1;
    return usedNames[name] > 1 ? `${name}-${usedNames[name]}` : name;
  };
  const walk = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return '';
    const b = box(el);
    let out = el === art ? '' : drawBox(el, b, cs);
    const tag = el.tagName.toLowerCase();
    if (tag === 'svg') out += drawSvg(el, b, cs);
    else if (tag === 'img') out += `<image xlink:href="${el.getAttribute('src')}" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" preserveAspectRatio="xMidYMid meet"/>`;
    else {
      if (cs.display !== 'inline') out += textBlock(el, cs);
      let kids = '';
      for (const c of el.children) kids += walk(c);
      if (kids && el !== art && cs.overflow === 'hidden' && radius(el, b) > 0) {
        const bw = parseFloat(cs.borderTopWidth) || 0;
        const id = newId('recorte');
        defs.push(`<clipPath id="${id}">${shape(inset(b, bw), Math.max(radius(el, b) - bw, 0), '')}</clipPath>`);
        kids = `<g clip-path="url(#${id})">${kids}</g>`;
      }
      out += kids;
    }
    const name = out && el !== art ? layerName(el) : null;
    return name ? `<g id="${name}">${out}</g>` : out;
  };

  let bg = `<rect width="${W}" height="${H}" ${fillAttr(color(getComputedStyle(art).backgroundColor))}/>`;
  const before = getComputedStyle(art, '::before').backgroundImage;
  if (before !== 'none') splitTop(before).reverse().forEach((l) => { bg += `<rect width="${W}" height="${H}" ${paint(l, { x: 0, y: 0, w: W, h: H })}/>`; });
  const body = walk(art);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + '<style>@font-face{font-family:"Inter";font-weight:100 900;src:url(../site/fonts/inter-latin-wght-normal.woff2) format("woff2")}</style>'
    + `<defs>${defs.join('')}</defs><g id="fondo">${bg}</g>${body}</svg>`;

  const pre = document.createElement('pre');
  pre.id = 'svg-out';
  pre.textContent = svg;
  document.body.replaceChildren(pre);
})();
