/* Mindse7 · simulador · planta 2D (SVG em cm): o molde. Cotas sempre à vista, o fio do caminho, arrastar e teclado.
   O mesmo desenho serve a bancada, a miniatura da sugestão e a folha A4 (markup). */
var M7 = window.M7 || (window.M7 = {});
M7.Planta = (function () {
  var svg, cb, k = 1, ult = null, arr = null, NS = "http://www.w3.org/2000/svg";
  var CORP = { parede: "url(#hachura)", provador: "#F1F2F3", caixa: "#F1F2F3", vitrine: "#F7F7F4" };
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function n(v) { return Math.round(v * 10) / 10; }
  function cota(x1, z1, x2, z2, txt, fs, cls, k) {
    var dx = x2 - x1, dz = z2 - z1, l = Math.hypot(dx, dz) || 1, nx = -dz / l * 4 / k, nz = dx / l * 4 / k;
    return '<g class="cota ' + (cls || "") + '"><path d="M' + n(x1) + ' ' + n(z1) + ' L' + n(x2) + ' ' + n(z2) + ' M' + n(x1 - nx) + ' ' + n(z1 - nz) + ' L' + n(x1 + nx) + ' ' + n(z1 + nz) + ' M' + n(x2 - nx) + ' ' + n(z2 - nz) + ' L' + n(x2 + nx) + ' ' + n(z2 + nz) + '"/>' +
      '<text x="' + n((x1 + x2) / 2) + '" y="' + n((z1 + z2) / 2) + '" font-size="' + n(fs) + '" dy=".35em" text-anchor="middle">' + esc(txt) + '</text></g>';
  }
  function vao(A, B) {
    var best = { d: Infinity };
    [[A, B, false], [B, A, true]].forEach(function (c) { c[0].forEach(function (p) { for (var i = 0; i < 4; i++) {
      var a = c[1][i], b = c[1][(i + 1) % 4], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)), q = [a[0] + t * dx, a[1] + t * dz], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (d < best.d) best = c[2] ? { d: d, p: q, q: p } : { d: d, p: p, q: q }; } }); });
    return best;
  }
  function tique(c) { return M7.CORES[M7.sku(c).cor].hex; }
  function desenho(it) { /* o que se vê de cima, no traço do guia */
    var w = it.larg, d = it.prof, t = it.tipo, h = '<rect class="corpo" x="' + (-w / 2) + '" y="' + (-d / 2) + '" width="' + w + '" height="' + d + '" fill="' + (CORP[t] || "#fff") + '"/>', np = it.pecas.length;
    if (t === "arara_reta" || t === "arara_parede") {
      var y = t === "arara_parede" ? 0 : 0; h += '<path class="fino" d="M' + (-w / 2 + 3) + ' ' + y + ' H' + (w / 2 - 3) + '"/>';
      it.pecas.forEach(function (s, i) { var x = -w / 2 + 6 + (w - 12) * (np > 1 ? i / (np - 1) : .5);
        h += '<rect x="' + n(x - 1.4) + '" y="' + (-d / 2 + 5) + '" width="2.8" height="' + (d - 10) + '" fill="' + tique(s) + '" stroke="#141414" stroke-width=".4"/>'; });
    } else if (t === "arara_circular") { var r = w / 2;
      h = '<circle class="corpo" r="' + r + '" fill="#fff"/><circle class="fino" r="' + n(r * .82) + '" fill="none"/>';
      it.pecas.forEach(function (s, i) { var a = i / np * Math.PI * 2; h += '<circle cx="' + n(Math.cos(a) * r * .82) + '" cy="' + n(Math.sin(a) * r * .82) + '" r="3" fill="' + tique(s) + '" stroke="#141414" stroke-width=".4"/>'; });
    } else if (t === "mesa" || t === "gondola") { var ks = []; it.pecas.forEach(function (s) { if (ks.indexOf(s) < 0) ks.push(s); });
      if (t === "gondola") h += '<path class="fino" d="M' + (-w / 2 + 3) + ' ' + (-d / 2 + 3) + ' H' + (w / 2 - 3) + '"/>';
      ks.slice(0, Math.max(1, Math.floor((w - 8) / 20))).forEach(function (s, i) { h += '<rect x="' + (-w / 2 + 6 + i * 20) + '" y="' + (-d / 2 + 6) + '" width="16" height="16" fill="' + tique(s) + '" stroke="#141414" stroke-width=".6"/>'; });
    } else if (t === "manequim") { h = '<circle class="corpo" r="' + (Math.min(w, d) / 2) + '" fill="#fff"/><circle class="fino" r="' + (Math.min(w, d) / 5) + '" fill="' + (np ? tique(it.pecas[0]) : "none") + '"/>'; }
    else if (t === "vitrine") { h += '<path class="fino" d="M' + (-w / 2) + ' ' + (d / 2 - 4) + ' H' + (w / 2) + '"/><circle class="fino" r="12" fill="' + (np ? tique(it.pecas[0]) : "#fff") + '"/>'; }
    else if (t === "provador") { var c = ""; for (var x = -w / 2 + 4; x < w / 2 - 4; x += 12) c += "Q" + n(x + 3) + " " + (d / 2 - 9) + " " + n(x + 6) + " " + (d / 2 - 4) + " T" + n(x + 12) + " " + (d / 2 - 4) + " ";
      h += '<path class="fino" d="M' + (-w / 2 + 4) + ' ' + (d / 2 - 4) + ' ' + c + '"/>'; }
    else if (t === "caixa") h += '<rect class="fino" x="' + (-w / 2 + 6) + '" y="' + (-d / 2 + 6) + '" width="30" height="20" fill="#fff"/>';
    else if (t === "porta") h = '<rect class="corpo porta" x="' + (-w / 2) + '" y="' + (-d / 2) + '" width="' + w + '" height="' + d + '" fill="#fff"/><path class="fino" d="M' + (-w / 2) + ' 0 A' + w + ' ' + w + ' 0 0 0 ' + (w / 2) + ' ' + (-w + 0) + '" stroke-dasharray="4 3"/>';
    if (M7.TIPOS[t].frente) h += '<path class="frente" d="M-6 ' + (d / 2 + 3) + ' L0 ' + (d / 2 + 9) + ' L6 ' + (d / 2 + 3) + '"/>';
    return h;
  }
  var ESTILO = '<style>.corte{fill:none;stroke:#141414;stroke-width:1.5px;stroke-dasharray:7 4;vector-effect:non-scaling-stroke}.entrada{stroke:#0B6E4F;stroke-width:5px;vector-effect:non-scaling-stroke}' +
    '.rot-ent{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;fill:#0B6E4F;letter-spacing:.06em}.cota path{fill:none;stroke:#4A4B4D;stroke-width:1px;vector-effect:non-scaling-stroke}' +
    '.cota text{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;fill:#141414;stroke:#F7F7F4;stroke-width:4px;paint-order:stroke;vector-effect:non-scaling-stroke}.cota.sel path{stroke:#141414}.cota.curta path{stroke:#A3231B}.cota.curta text{fill:#A3231B}' +
    '.fio{fill:none;stroke:#0B6E4F;stroke-width:2.5px;stroke-dasharray:7 5;vector-effect:non-scaling-stroke;stroke-linejoin:round;opacity:.9}' +
    '.corpo{stroke:#141414;stroke-width:1.6px;vector-effect:non-scaling-stroke}.fino,.frente{fill:none;stroke:#141414;stroke-width:1.2px;vector-effect:non-scaling-stroke}.frente{stroke-width:1.6px}.porta{stroke:#0B6E4F;stroke-width:2.5px}' +
    '.rot{font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:700;fill:#141414;stroke:#F7F7F4;stroke-width:3px;paint-order:stroke;vector-effect:non-scaling-stroke;pointer-events:none}.rot.dentro{stroke:#fff}.med{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:600;fill:#4A4B4D}' +
    '.it.sel .corpo{stroke:#0B6E4F;stroke-width:2.6px;stroke-dasharray:7 4}.it:focus{outline:none}.it:focus-visible .corpo{stroke:#0B6E4F;stroke-width:3.4px}.marca,.toque{pointer-events:none}.it .toque{pointer-events:all;fill:transparent;stroke:none}.pulso{fill:none;stroke:#A3231B;stroke-width:3px;vector-effect:non-scaling-stroke;pointer-events:none}</style>';

  /* o desenho inteiro em texto SVG; k = px por cm (para cotas e letras em px) */
  function markup(proj, o) {
    var A = proj.area, W = A.larg_cm, D = A.prof_cm, k = o.k, pad = o.pad, fs = (o.mini ? 9 : 13) / k, fsm = (o.mini ? 9 : 12) / k, e = A.entrada, e0 = e.x_cm - e.larg_cm / 2, e1 = e.x_cm + e.larg_cm / 2, achados = o.achados || [], rota = o.rota, sel = o.sel;
    var h = ESTILO + '<defs><pattern id="pontos' + (o.sufixo || "") + '" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="' + n(Math.max(.55, 1 / k)) + '" fill="#C3CAD2"/></pattern>' +
      '<pattern id="hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><path d="M0 0 V6" stroke="#141414" stroke-width="1.2"/></pattern></defs>' +
      '<rect x="0" y="0" width="' + W + '" height="' + D + '" fill="url(#pontos' + (o.sufixo || "") + ')"/>' +
      '<path class="corte" d="M' + e0 + ' ' + D + ' H0 V0 H' + W + ' V' + D + ' H' + e1 + '"/><path class="entrada" d="M' + e0 + ' ' + D + ' H' + e1 + '"/>' +
      '<text class="rot-ent" x="' + e.x_cm + '" y="' + n(D + 26 / k) + '" font-size="' + n(fsm) + '" text-anchor="middle">ENTRADA · ' + e.larg_cm + ' CM</text>' +
      cota(0, -pad * .45, W, -pad * .45, W + " cm", fs, "", k) + cota(-pad * .45, 0, -pad * .45, D, D + " cm", fs, "vert", k);
    if (rota) Object.keys(rota.chega).forEach(function (id) { var f = rota.chega[id]; if (!f || f.length < 2) return; h += '<polyline class="fio" points="' + f.map(function (p) { return p.join(","); }).join(" ") + '"/>'; });
    var pequeno = k < .55; /* planta pequena: some a medida dentro do rótulo, fica o nome */
    proj.itens.forEach(function (it) {
      var lbl = M7.rotulo(it), med = it.larg + "×" + it.prof, toque = Math.max(0, (44.5 / k - Math.min(it.larg, it.prof)) / 2), P = M7.cantos(it);
      var cabe = !M7.ARARAS[it.tipo] && it.tipo !== "porta" && Math.min(it.larg, it.prof) * k > 40 && it.larg * k > Math.max(lbl.length, med.length) * 6.6 + 8;
      h += '<g class="it' + (it.id === sel ? " sel" : "") + '" data-id="' + it.id + '"' + (o.interativo ? ' tabindex="' + (it.id === o.tabId ? 0 : -1) + '" role="button" aria-label="' + esc(lbl + ", " + med + " cm, em " + it.x_cm + ", " + it.z_cm + (it.rot ? ", girado " + it.rot + "°" : "")) + '"' : "") +
        ' transform="translate(' + it.x_cm + ' ' + it.z_cm + ') rotate(' + it.rot + ')">' + (o.interativo && toque ? '<rect class="toque" x="' + n(-it.larg / 2 - toque) + '" y="' + n(-it.prof / 2 - toque) + '" width="' + n(it.larg + 2 * toque) + '" height="' + n(it.prof + 2 * toque) + '"/>' : "") + desenho(it) + '</g>';
      if (o.mini) return; /* miniatura: só o desenho; nomes e medidas ficam na planta grande */
      if (it.tipo === "parede") { h += '<text class="rot" x="' + n(Math.min.apply(0, P.map(function (p) { return p[0]; }))) + '" y="' + n(Math.min.apply(0, P.map(function (p) { return p[1]; })) - 5 / k) + '" font-size="' + n(fsm) + '"><tspan class="med">' + esc(lbl) + ' · ' + med + '</tspan></text>'; return; }
      var ly = cabe ? it.z_cm + ((it.tipo === "mesa" || it.tipo === "gondola") && it.pecas.length ? it.prof * .2 : 0) : Math.max.apply(0, P.map(function (p) { return p[1]; })) + 16 / k;
      h += '<text class="rot' + (cabe ? " dentro" : "") + '" x="' + it.x_cm + '" y="' + n(ly - (cabe ? 2 / k : 0)) + '" font-size="' + n(fs) + '" text-anchor="middle"><tspan>' + esc(lbl) + '</tspan>' + (pequeno ? "" : '<tspan class="med" x="' + it.x_cm + '" dy="1.15em" font-size="' + n(fsm) + '">' + med + '</tspan>') + '</text>';
    });
    var s = proj.itens.filter(function (x) { return x.id === sel; })[0];
    if (s) { var P = M7.cantos(s), xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; }), x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), z0 = Math.min.apply(0, zs);
      if (x0 > 1) h += cota(0, s.z_cm, x0, s.z_cm, Math.round(x0) + "", fsm, "sel", k);
      if (z0 > 1) h += cota(s.x_cm, 0, s.x_cm, z0, Math.round(z0) + "", fsm, "sel", k);
      if (W - x1 > 1) h += cota(x1, s.z_cm, W, s.z_cm, Math.round(W - x1) + "", fsm, "sel", k);
      proj.itens.forEach(function (o2) { if (o2.id === s.id || !M7.ocupa(o2)) return; var v = vao(P, M7.cantos(o2)); if (v.d > 2 && v.d < 150) h += cota(v.p[0], v.p[1], v.q[0], v.q[1], Math.round(v.d) + "", fsm, v.d < 90 ? "sel curta" : "sel", k); }); }
    var marca = {}; achados.forEach(function (a) { if (a.status !== "erro" && a.status !== "atencao") return; a.itens.forEach(function (id) { if (!marca[id] || a.status === "erro") marca[id] = a.status; }); if (!a.itens.length && a.local) marca["@" + a.local.x + "," + a.local.z] = a.status; });
    Object.keys(marca).forEach(function (id) { var it = proj.itens.filter(function (x) { return x.id === id; })[0], m = 22 / k, x, z;
      if (it) { var P = M7.cantos(it); x = Math.max.apply(0, P.map(function (p) { return p[0]; })) + m * .35; z = Math.min.apply(0, P.map(function (p) { return p[1]; })) - m * .35; } else { var c = id.slice(1).split(","); x = +c[0]; z = +c[1]; }
      h += '<use class="marca" href="#i-' + marca[id] + '" x="' + n(x - m / 2) + '" y="' + n(z - m / 2) + '" width="' + n(m) + '" height="' + n(m) + '" data-id="' + id + '"/>'; });
    return h;
  }
  function caixaVista(W, D, wpx, hpx) { var kE = wpx ? Math.min(wpx / (W * 1.25), hpx / (D * 1.3)) : 1, pad = Math.max(60, W * .1, 62 / kE); return { pad: pad, vb: [-pad, -pad * .85, W + pad * 2.1, D + pad * 1.6] }; }
  /* SVG avulso (miniatura da sugestão, folha A4) */
  var SIMB = '<symbol id="i-erro" viewBox="0 0 26 26"><path d="M13 2 L25 24 H1 Z" fill="#fff" stroke="#A3231B" stroke-width="2.4" stroke-linejoin="round"/><path d="M13 10 V16" stroke="#A3231B" stroke-width="2.6"/><circle cx="13" cy="19.6" r="1.6" fill="#A3231B"/></symbol>' +
    '<symbol id="i-atencao" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11" fill="#fff" stroke="#141414" stroke-width="2.2" stroke-dasharray="4 3"/><path d="M13 7 V14" stroke="#141414" stroke-width="2.6"/><circle cx="13" cy="18.4" r="1.6" fill="#141414"/></symbol>';
  function estatico(proj, wpx, hpx, achados, rota, sufixo, autonomo, mini) { /* autonomo: leva os símbolos junto (SVG que vira imagem não enxerga os do documento) */
    var A = proj.area, c = caixaVista(A.larg_cm, A.prof_cm, wpx, hpx), k = Math.min(wpx / c.vb[2], hpx / c.vb[3]);
    return '<svg xmlns="' + NS + '" viewBox="' + c.vb.join(" ") + '" width="' + wpx + '" height="' + hpx + '">' + (autonomo ? '<defs>' + SIMB + '</defs>' : "") + markup(proj, { k: k, pad: c.pad, achados: achados, rota: rota, sufixo: sufixo || "e", mini: mini }) + '</svg>';
  }

  function desenhar(proj, sel, achados, rota) {
    if (achados) ult = { a: achados, r: rota }; achados = ult ? ult.a : []; rota = ult ? ult.r : null;
    var rr = svg.getBoundingClientRect(), c = caixaVista(proj.area.larg_cm, proj.area.prof_cm, rr.width, rr.height);
    svg.setAttribute("viewBox", c.vb.join(" ")); k = medir();
    var foco = document.activeElement && document.activeElement.closest && document.activeElement.closest(".it"), focoId = foco ? foco.dataset.id : null;
    svg.innerHTML = markup(proj, { k: k, pad: c.pad, sel: sel, achados: achados, rota: rota, interativo: !consulta(), tabId: sel || (proj.itens[0] && proj.itens[0].id) });
    if (focoId) { var g = svg.querySelector('.it[data-id="' + focoId + '"]'); if (g) g.focus({ preventScroll: true }); }
  }
  function consulta() { return document.body.clientWidth < 720; }
  function medir() { var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return vb && vb.width && r.width ? Math.min(r.width / vb.width, r.height / vb.height) : 1; }
  function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  function init(el, callbacks) {
    svg = el; cb = callbacks;
    svg.addEventListener("pointerdown", function (e) {
      if (consulta()) return;
      var g = e.target.closest(".it"); if (!g) { cb.selecionar(null); return; }
      var id = g.dataset.id, it = M7.Ed.proj().itens.filter(function (x) { return x.id === id; })[0], p = pt(e);
      arr = { id: id, dx: it.x_cm - p.x, dz: it.z_cm - p.y, x0: e.clientX, y0: e.clientY, foi: false, pid: e.pointerId };
      svg.setPointerCapture(e.pointerId); cb.selecionar(id);
    });
    svg.addEventListener("pointermove", function (e) { if (!arr || e.pointerId !== arr.pid) return;
      if (!arr.foi) { if (Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 4) return; arr.foi = true; cb.inicioArrasto(); }
      var p = pt(e); cb.arrastando(arr.id, p.x + arr.dx, p.y + arr.dz); });
    var fim = function (e) { if (!arr || e.pointerId !== arr.pid) return; var a = arr; arr = null; if (a.foi) cb.fimArrasto(a.id); };
    svg.addEventListener("pointerup", fim); svg.addEventListener("pointercancel", fim);
    svg.addEventListener("focusin", function (e) { var g = e.target.closest(".it"); if (g && M7.Ed && M7.Ed.sel() !== g.dataset.id) cb.selecionar(g.dataset.id); });
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(medirTela, 80); });
  }
  function medirTela() { if (M7.Ed) desenhar(M7.Ed.proj(), M7.Ed.sel(), null, null); }
  function itemEm(x, y) { var el = document.elementFromPoint(x, y), g = el && el.closest && el.closest("#planta .it"); return g ? g.dataset.id : null; }
  function pulsar(ids) { ids.forEach(function (id) { var it = M7.Ed.proj().itens.filter(function (x) { return x.id === id; })[0]; if (!it) return; var c = document.createElementNS(NS, "circle"), r = Math.hypot(it.larg, it.prof) / 2;
    c.setAttribute("class", "pulso"); c.setAttribute("cx", it.x_cm); c.setAttribute("cy", it.z_cm); c.setAttribute("r", n(r * .6)); svg.appendChild(c);
    gsap.fromTo(c, { attr: { r: r * .6 }, opacity: 1 }, { attr: { r: r * 1.5 }, opacity: 0, duration: .7, repeat: 1, ease: "power2.out", onComplete: function () { c.remove(); } }); }); }
  return { init: init, desenhar: desenhar, estatico: estatico, itemEm: itemEm, pulsar: pulsar, medirTela: medirTela, escala: function () { return k; } };
})();
