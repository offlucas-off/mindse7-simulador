/* Mindse7 · simulador · editor: estado, desfazer, painéis, teclado, sugestão, salvar/abrir e exportar */
var M7 = window.M7 || (window.M7 = {});
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var proj = M7.CENARIOS.passa(), sel = null, hist = [], fut = [], achados = [], rota = null, notaObj = null, antes = {}, abertoId = null, tl = null;
  var teste = /^#(teste|estresse)/.test(location.hash);
  var reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  M7.reduz = reduz; if (reduz) gsap.globalTimeline.timeScale(1000);   /* movimento reduzido: toda tween termina no 1º quadro */
  var vivo = $("#vivo"), toast = $("#toast"), tToast = null;
  function dizer(t, aviso) { vivo.textContent = ""; vivo.textContent = t;
    if (aviso && !consulta()) { toast.textContent = t; toast.hidden = false; gsap.fromTo(toast, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .2 }); clearTimeout(tToast); tToast = setTimeout(function () { toast.hidden = true; }, 4500); } }
  function consulta() { return document.body.clientWidth < 720; }
  var GRADE = 10, snap = function (v) { return Math.round(v / GRADE) * GRADE; };
  var porId = function (id) { return proj.itens.filter(function (x) { return x.id === id; })[0] || null; };
  function caixa(it) { var P = M7.cantos(it), xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; }); return { x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), z0: Math.min.apply(0, zs), z1: Math.max.apply(0, zs) }; }

  /* encaixe: a borda do item vai para a grade de 10 cm; com parede = true (arrastando), a borda também gruda na parede da área ou numa parede do projeto a até 15 cm */
  function encaixar(it, x, z, parede) {
    if (it.rot % 90) { it.x_cm = snap(x); it.z_cm = snap(z); return; }
    var dei = it.rot % 180 === 90, hw = (dei ? it.prof : it.larg) / 2, hd = (dei ? it.larg : it.prof) / 2;
    it.x_cm = snap(x - hw) + hw; it.z_cm = snap(z - hd) + hd; if (!parede) return;
    var W = proj.area.larg_cm, D = proj.area.prof_cm, lx = [0, W], lz = [0];
    proj.itens.forEach(function (o) { if (o.tipo === "parede" && o.id !== it.id) { var c = caixa(o); lx.push(c.x0, c.x1); lz.push(c.z0, c.z1); } });
    function ajusta(centro, meio, linhas) { var melhor = 0, dmin = 16; linhas.forEach(function (l) { [[centro - meio, l - (centro - meio)], [centro + meio, l - (centro + meio)]].forEach(function (c) { if (Math.abs(c[1]) < dmin) { dmin = Math.abs(c[1]); melhor = c[1]; } }); }); return centro + melhor; }
    it.x_cm = ajusta(it.x_cm, hw, lx); it.z_cm = ajusta(it.z_cm, hd, lz);
  }

  /* ---------- histórico: foto do projeto antes de cada operação ---------- */
  function foto() { return JSON.stringify(proj); }
  function guardar(f) { hist.push(f); if (hist.length > 100) hist.shift(); fut = []; }
  function operar(fn) { var f = foto(), r = fn(); if (foto() !== f) { guardar(f); atualizar(); } return r; }
  var op = {
    adicionar: function (tipo) { return operar(function () {
      var T = M7.TIPOS[tipo], id = "i" + proj.proxId++, x = snap(proj.area.larg_cm / 2), z = snap(proj.area.prof_cm / 2), n = M7.item(id, tipo, x, z);
      for (var i = 0; i < 12 && proj.itens.some(function (o) { return M7.ocupa(o) && M7.ocupa(n) && M7.sobrepoe(M7.cantos(o), M7.cantos(n)); }); i++) { n.z_cm -= 30; if (n.z_cm < T.prof) { n.z_cm = z; n.x_cm += 40; } }
      encaixar(n, n.x_cm, n.z_cm); proj.itens.push(n); sel = id; dizer(T.nome + " posta na área em " + n.x_cm + ", " + n.z_cm + " cm."); return id; }); },
    mover: function (id, x, z) { return operar(function () { encaixar(porId(id), x, z); }); },
    girar: function (id, g) { return operar(function () { var it = porId(id); it.rot = ((it.rot + g) % 360 + 360) % 360; dizer(M7.rotulo(it) + " girado para " + it.rot + "°."); }); },
    medida: function (id, campo, v) { return operar(function () { var it = porId(id); v = Math.round(+v);
      if (!isFinite(v)) return; if (campo === "rot") it.rot = ((v % 360) + 360) % 360; else if (campo === "x_cm") encaixar(it, v, it.z_cm); else if (campo === "z_cm") encaixar(it, it.x_cm, v);
      else if (campo === "alt") it.alt = Math.max(20, Math.min(400, v)); else it[campo] = Math.max(10, Math.min(2000, v)); }); },
    duplicar: function (id) { return operar(function () { var it = porId(id), n = JSON.parse(JSON.stringify(it)); n.id = "i" + proj.proxId++; n.x_cm += 30; n.z_cm += 30; proj.itens.push(n); sel = n.id; dizer(M7.rotulo(it) + " duplicado: " + M7.rotulo(n) + "."); return n.id; }); },
    apagar: function (id) { return operar(function () { var it = porId(id); proj.itens = proj.itens.filter(function (x) { return x.id !== id; }); if (sel === id) sel = null; dizer(M7.rotulo(it) + " apagado. Ctrl+Z desfaz."); }); },
    porPeca: function (id, s) { var it = porId(id), k = M7.sku(s);
      if (!it || !k) return false;
      if (!M7.aceita(it.tipo, s)) { dizer(motivo(it, s), true); return false; }
      if (it.tipo === "manequim" && it.pecas.length >= 4) { dizer("O manequim já tem 4 peças. Tire uma antes de pôr outra.", true); return false; }
      operar(function () { it.pecas.push(s); }); dizer(k.nome + ", " + M7.CORES[k.cor].nome + ", " + k.tam + " → " + M7.rotulo(it) + " (" + it.pecas.length + (it.pecas.length === 1 ? " peça)." : " peças).")); return true; },
    tirarPeca: function (id, i) { return operar(function () { porId(id).pecas.splice(i, 1); }); },
    tirarSku: function (id, s) { return operar(function () { var p = porId(id).pecas, i = p.lastIndexOf(s); if (i >= 0) p.splice(i, 1); }); },
    desfazer: function () { if (!hist.length) return; fut.push(foto()); proj = JSON.parse(hist.pop()); if (sel && !porId(sel)) sel = null; atualizar(); dizer("Desfeito."); },
    refazer: function () { if (!fut.length) return; hist.push(foto()); proj = JSON.parse(fut.pop()); if (sel && !porId(sel)) sel = null; atualizar(); dizer("Refeito."); }
  };
  function motivo(it, s) { var k = M7.sku(s), T = M7.TIPOS[it.tipo];
    if (!T.recebe) return M7.rotulo(it) + " não recebe peças.";
    if (T.recebe === "pendura") return k.nome + " é de dobrar (estica com o próprio peso): vai na mesa ou na gôndola, não na arara.";
    if (T.recebe === "dobra") return k.nome + " é de pendurar (vinca): vai na arara, não na " + T.nome.toLowerCase() + ".";
    return k.nome + " não serve neste item."; }

  /* ---------- tudo que muda o projeto passa por aqui: valida e redesenha as vistas ---------- */
  function atualizar(leve) {
    if (!leve) { rota = M7.rota(proj); achados = M7.validar(proj, rota); notaObj = M7.nota(achados); }
    M7.Planta.desenhar(proj, sel, leve ? null : achados, leve ? null : rota);
    M7.Cena.sync(proj, sel, leve ? null : achados, leve ? null : rota);
    if (leve) return;
    painelItens(); painelItem(); painelPecas(); painelConferencia();
    $("#b-desfaz").disabled = !hist.length; $("#b-refaz").disabled = !fut.length; $("#nome-proj").textContent = proj.nome;
    var inn = $("#in-nome"); if (document.activeElement !== inn) inn.value = proj.nome;
    if (!teste) rascunho();
  }
  function selecionar(id, focar) { sel = id; atualizar(); if (id && focar) M7.Cena.focar(id); }

  /* ---------- molde: biblioteca, lista, medidas ---------- */
  $("#biblio").innerHTML = Object.keys(M7.TIPOS).filter(function (k) { return true; }).map(function (k) { var T = M7.TIPOS[k];
    return '<button class="bt" type="button" data-tipo="' + k + '" title="' + T.larg + '×' + T.prof + '×' + T.alt + ' cm"><svg aria-hidden="true"><use href="#t-' + k + '"/></svg><span>' + T.nome + '</span></button>'; }).join("");
  $("#biblio").addEventListener("click", function (e) { var b = e.target.closest("[data-tipo]"); if (b) op.adicionar(b.dataset.tipo); });
  function marcaDe(id) { var s = null; achados.forEach(function (a) { if ((a.status === "erro" || a.status === "atencao") && a.itens.indexOf(id) >= 0 && (!s || M7.PESO[a.status] < M7.PESO[s])) s = a.status; }); return s; }
  function painelItens() {
    $("#lista-itens").innerHTML = proj.itens.map(function (it) { var m = marcaDe(it.id);
      return '<li><button type="button" data-sel="' + it.id + '" aria-current="' + (it.id === sel) + '">' + M7.rotulo(it) + '<small>' + it.larg + '×' + it.prof + '</small>' +
        (m ? '<svg role="img" aria-label="' + (m === "erro" ? "com erro" : "com atenção") + '"><use href="#i-' + m + '"/></svg>' : '<span></span>') + '</button></li>'; }).join("") || '<li class="vazio">Área vazia. Comece pela parede do fundo e pelas araras, ou use a aba Sugestão.</li>';
  }
  $("#lista-itens").addEventListener("click", function (e) { var b = e.target.closest("[data-sel]"); if (b) { selecionar(b.dataset.sel, true); var n = $('[data-sel="' + b.dataset.sel + '"]'); if (n) n.focus(); } });
  var CAMPOS = [["larg", "Largura", "cm"], ["prof", "Profund.", "cm"], ["alt", "Altura", "cm"], ["rot", "Giro", "°"], ["x_cm", "Posição x", "cm"], ["z_cm", "Posição z", "cm"]];
  function painelItem() {
    var it = porId(sel), P = $("#painel-item");
    if (!it) { P.innerHTML = '<p class="ajuda">Escolha um item na lista, na planta ou no 3D para editar medidas.</p>'; return; }
    var ativo = document.activeElement && P.contains(document.activeElement) ? document.activeElement.dataset.campo : null;
    P.innerHTML = '<h3>' + M7.rotulo(it) + '</h3><div class="legenda-molde">' + CAMPOS.map(function (c) {
      return '<label><b>' + c[1] + '</b><input type="number" inputmode="numeric" data-campo="' + c[0] + '" value="' + it[c[0]] + '" step="' + (c[0] === "rot" ? 15 : 10) + '"><span class="un">' + c[2] + '</span></label>'; }).join("") +
      '</div><div class="acoes"><button class="bt" type="button" data-acao="girar">Girar 15°</button><button class="bt" type="button" data-acao="duplicar">Duplicar</button><button class="bt perigo" type="button" data-acao="apagar">Apagar</button></div>';
    if (ativo) { var i = $('[data-campo="' + ativo + '"]', P); if (i) i.focus(); }
  }
  $("#painel-item").addEventListener("change", function (e) { var c = e.target.dataset.campo; if (c && sel) op.medida(sel, c, e.target.value); });
  $("#painel-item").addEventListener("click", function (e) { var b = e.target.closest("[data-acao]"); if (!b || !sel) return; var a = b.dataset.acao;
    if (a === "girar") op.girar(sel, 15); else if (a === "duplicar") op.duplicar(sel); else if (a === "apagar") op.apagar(sel); });

  /* ---------- cartão: peças no item (trilho do guia, pilhas ou look) ---------- */
  var pego = null, origem = null, focoK = 0, fotoPego = null, selCab = null;
  function rotPeca(s) { var k = M7.sku(s); return k.nome + ", " + M7.CORES[k.cor].nome + ", " + k.tam; }
  function painelPecas() {
    var it = porId(sel), P = $("#painel-pecas"), R = it && M7.TIPOS[it.tipo].recebe;
    if (!R) { P.innerHTML = '<p class="vazio">Escolha uma <b>arara</b>, <b>mesa</b>, <b>gôndola</b>, <b>manequim</b> ou <b>vitrine</b> para ver e ordenar as peças dela.' + (it ? " " + M7.rotulo(it) + " não recebe peças." : "") + '</p>'; catalogo(); return; }
    if (R === "dobra") {
      var g = {}; it.pecas.forEach(function (s) { (g[s] = g[s] || []).push(s); });
      P.innerHTML = '<h3>' + M7.rotulo(it) + ' · pilhas</h3>' + (it.pecas.length ? '<ul class="pilhas">' + Object.keys(g).map(function (s) { var k = M7.sku(s), n = g[s].length;
        return '<li><svg viewBox="0 0 60 ' + (4 + Math.min(n, 8) * 8) + '" style="color:' + M7.CORES[k.cor].hex + '" aria-hidden="true">' + Array.apply(0, Array(Math.min(n, 8))).map(function (_, i) { return '<use href="#g-dobrado" y="' + (i * 8) + '" width="60" height="16"/>'; }).join("") +
          '</svg><span><b>' + k.nome + '</b><small>' + M7.CORES[k.cor].nome + ' · ' + k.tam + ' · ' + n + (n > 1 ? " peças" : " peça") + '</small></span><button class="bt" type="button" data-tira="' + s + '" aria-label="Tirar uma: ' + rotPeca(s) + '">−1</button></li>'; }).join("") + '</ul>' : '<p class="vazio">Vazia. Dobrados: camiseta (estica com o próprio peso) e jeans.</p>');
      catalogo(); return;
    }
    if (R === "look") {
      var l = it.tipo === "manequim" ? M7.avaliarLook(it.pecas) : null;
      P.innerHTML = '<h3>' + M7.rotulo(it) + ' · ' + (it.tipo === "manequim" ? "look" : "peças") + '</h3>' + (it.pecas.length ? '<ul class="look">' + it.pecas.map(function (s, i) { var k = M7.sku(s);
        return '<li><svg viewBox="0 0 60 104" style="color:' + M7.CORES[k.cor].hex + '" aria-hidden="true"><use href="#' + k.g + '"/></svg><span><b>' + k.nome + '</b><small>' + M7.CORES[k.cor].nome + ' · ' + k.tam + ' · ' + k.camada + '</small></span><button class="bt" type="button" data-tira-i="' + i + '" aria-label="Tirar: ' + rotPeca(s) + '">Tirar</button></li>'; }).join("") + '</ul>' : '<p class="vazio">' + (it.tipo === "manequim" ? "Sem roupa. Um look completo tem parte de cima + parte de baixo (ou vestido) + uma 3ª peça, no mesmo tamanho." : "Vitrine vazia. Menos vale mais: até 8 peças.") + '</p>') +
        (l && it.pecas.length ? '<p class="ajuda">' + (l.base ? "Base completa." : "Falta cima ou baixo.") + ' ' + (l.terceira ? "Tem a 3ª peça." : "Falta a 3ª peça.") + ' ' + (l.mesmoTam ? "Mesmo tamanho." : "Tamanhos diferentes.") + '</p>' : "");
      catalogo(); return;
    }
    var n = it.pecas.length; focoK = Math.max(0, Math.min(focoK, n - 1));
    P.innerHTML = '<h3>' + M7.rotulo(it) + ' · trilho' + (it.tipo === "arara_circular" ? " (volta inteira)" : "") + '</h3>' + (n ? '<div class="trilho" id="trilho"><ol class="cabides" id="cabides" aria-label="Peças na arara" aria-describedby="instr"></ol></div>' +
      '<div class="cartela-arara" id="cartela" aria-hidden="true"></div>' +
      '<div class="mover"><button class="bt" type="button" id="c-esq" aria-label="Levar a peça para a esquerda"><svg aria-hidden="true"><use href="#i-esq"/></svg></button><button class="bt" type="button" id="c-dir" aria-label="Levar a peça para a direita"><svg aria-hidden="true"><use href="#i-dir"/></svg></button><button class="bt perigo" type="button" id="c-tira">Tirar</button><span class="sel-txt" id="sel-txt"></span></div>' +
      '<p class="ajuda" id="instr">Toque na peça e use ◀ ▶, ou arraste. Teclado: <kbd>←</kbd><kbd>→</kbd> escolhem, <kbd>Espaço</kbd> pega e solta, <kbd>Esc</kbd> desiste.</p>' : '<p class="vazio">Arara vazia. Pendure peças que vincam (alfaiataria, saia longa, blazer, vestido) e o jeans.</p>');
    if (n) desenharTrilho(it); catalogo();
  }
  function desenharTrilho(it, focar) {
    var ol = $("#cabides"); if (!ol) return; var ant = null;
    ol.innerHTML = it.pecas.map(function (s, i) { var k = M7.sku(s), corte = ant !== null && ant !== k.tipo; ant = k.tipo;
      return '<li class="cabide' + (corte ? " corte" : "") + (pego === i ? " pego" : "") + (selCab === i ? " sel" : "") + '" data-k="' + i + '" role="button" tabindex="' + (i === focoK ? 0 : -1) + '" aria-pressed="' + (pego === i) + '" aria-label="' + rotPeca(s) + '. Posição ' + (i + 1) + ' de ' + it.pecas.length + (pego === i ? ". Pega." : "") + '">' +
        '<svg class="gancho" viewBox="0 0 60 22" aria-hidden="true"><use href="#g-gancho"/></svg><svg class="peca" viewBox="0 0 60 104" aria-hidden="true" style="color:' + M7.CORES[k.cor].hex + '"><use href="#' + k.g + '"/></svg><span class="tam">' + k.tam + '</span></li>'; }).join("");
    ant = null; $("#cartela").innerHTML = it.pecas.map(function (s) { var k = M7.sku(s), c = ant !== null && ant !== k.tipo; ant = k.tipo; return '<i' + (c ? ' class="corte"' : "") + ' style="background:' + M7.CORES[k.cor].hex + '"></i>'; }).join("");
    $("#trilho").style.setProperty("--w", ol.scrollWidth + "px");
    var a = pego !== null ? pego : selCab; $("#c-esq").disabled = a === null || a === 0; $("#c-dir").disabled = a === null || a === it.pecas.length - 1; $("#c-tira").disabled = a === null;
    $("#sel-txt").textContent = a !== null ? rotPeca(it.pecas[a]) + ", posição " + (a + 1) + "." : "Nenhuma peça escolhida.";
    if (focar) { var c = $('[data-k="' + focoK + '"]', ol); if (c) { c.focus({ preventScroll: true }); c.scrollIntoView({ block: "nearest", inline: "nearest" }); } }
  }
  function moverPecaVivo(it, de, para) { para = Math.max(0, Math.min(it.pecas.length - 1, para)); if (para === de) return de; var s = it.pecas.splice(de, 1)[0]; it.pecas.splice(para, 0, s); return para; }
  function soltar(it, txt) { var f = fotoPego; pego = null; fotoPego = null; if (f && f !== foto()) guardar(f); atualizar(); dizer(txt + " " + resumoArara(it.id)); focarCab(); }
  function focarCab() { var c = $('#cabides [data-k="' + focoK + '"]'); if (c) { c.focus({ preventScroll: true }); c.scrollIntoView({ block: "nearest", inline: "nearest" }); } }
  function resumoArara(id) { return achados.filter(function (a) { return a.itens[0] === id && ["tipojunto", "blocos", "grade", "densidade"].indexOf(a.regra) >= 0; }).map(function (a) { return M7.NOMES[a.regra] + ": " + (a.status === "ok" ? "certo" : a.status === "erro" ? "erro" : a.status === "atencao" ? "atenção" : "recomendação"); }).join("; ") + "."; }
  $("#painel-pecas").addEventListener("keydown", function (e) {
    var c = e.target.closest(".cabide"); if (!c) return; var it = porId(sel), k = +c.dataset.k, n = it.pecas.length, alvo = null;
    if (/^(Arrow|Home|End| |Enter|Escape|Delete|Backspace)/.test(e.key)) e.stopPropagation(); focoK = k; /* o nó some no redesenho: o atalho do editor não pode pegar a mesma tecla */
    if (e.key === "ArrowLeft") alvo = k - 1; else if (e.key === "ArrowRight") alvo = k + 1; else if (e.key === "Home") alvo = 0; else if (e.key === "End") alvo = n - 1;
    else if (e.key === " " || e.key === "Enter") { e.preventDefault();
      if (pego === k) { soltar(it, "Solta na posição " + (k + 1) + "."); }
      else { pego = k; origem = k; fotoPego = foto(); selCab = null; desenharTrilho(it, true); dizer(rotPeca(it.pecas[k]) + " pega. Setas levam, Espaço solta, Esc desiste."); }
      return; }
    else if (e.key === "Escape" && pego !== null) { e.preventDefault(); proj = JSON.parse(fotoPego); fotoPego = null; pego = null; focoK = origem; atualizar(); focarCab(); dizer("Desistiu: a peça voltou à posição " + (origem + 1) + "."); return; }
    else if ((e.key === "Delete" || e.key === "Backspace") && pego === null) { e.preventDefault(); op.tirarPeca(sel, k); focoK = Math.max(0, k - 1); focarCab(); dizer("Peça tirada da arara."); return; }
    if (alvo === null) return; e.preventDefault(); alvo = Math.max(0, Math.min(n - 1, alvo));
    if (pego === k) { focoK = pego = moverPecaVivo(it, k, alvo); desenharTrilho(it, true); dizer(rotPeca(it.pecas[pego]) + ", posição " + (pego + 1) + " de " + n + "."); }
    else { focoK = alvo; desenharTrilho(it, true); dizer(rotPeca(it.pecas[alvo]) + ", posição " + (alvo + 1) + " de " + n + "."); }
  });
  $("#painel-pecas").addEventListener("focusout", function (e) { /* sair do trilho com a peça pega solta onde está */
    if (pego === null || (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("#cabides"))) return;
    if (!e.relatedTarget && document.activeElement === document.body) return;
    var it = porId(sel); soltar(it, "Solta na posição " + (pego + 1) + ", ao sair do trilho.");
  });
  $("#painel-pecas").addEventListener("click", function (e) {
    var it = porId(sel); if (!it) return;
    var t = e.target.closest("[data-tira]"); if (t) { op.tirarSku(sel, t.dataset.tira); dizer("Uma peça a menos: " + rotPeca(t.dataset.tira) + "."); return; }
    var ti = e.target.closest("[data-tira-i]"); if (ti) { op.tirarPeca(sel, +ti.dataset.tiraI); dizer("Peça tirada."); return; }
    var c = e.target.closest(".cabide"); if (c && !arrastouCab) { var k = +c.dataset.k; selCab = selCab === k ? null : k; focoK = k; desenharTrilho(it, true); return; }
    var a = selCab; if (a === null) return;
    if (e.target.closest("#c-esq") || e.target.closest("#c-dir")) { var f = foto(), p = moverPecaVivo(it, a, a + (e.target.closest("#c-esq") ? -1 : 1)); guardar(f); selCab = focoK = p; atualizar(); dizer(rotPeca(it.pecas[p]) + ", posição " + (p + 1) + ". " + resumoArara(it.id)); }
    else if (e.target.closest("#c-tira")) { selCab = null; op.tirarPeca(sel, a); }
  });
  var arr = null, arrastouCab = false;
  function indicePorX(x) { var it = $$("#cabides .cabide"), r0 = it[0].getBoundingClientRect(); return Math.max(0, Math.min(it.length - 1, Math.round((x - r0.left - r0.width / 2) / (r0.width + 2)))); }
  $("#painel-pecas").addEventListener("pointerdown", function (e) { var c = e.target.closest(".cabide"); if (!c) return; arr = { k: +c.dataset.k, x0: e.clientX, y0: e.clientY, pid: e.pointerId, f: foto() }; arrastouCab = false; });
  window.addEventListener("pointermove", function (e) { if (!arr || e.pointerId !== arr.pid) return;
    if (!arrastouCab) { if (Math.abs(e.clientX - arr.x0) < 8) return; if (Math.abs(e.clientY - arr.y0) > Math.abs(e.clientX - arr.x0)) { arr = null; return; } }
    arrastouCab = true; var it = porId(sel), a = indicePorX(e.clientX); if (a !== arr.k) { arr.k = moverPecaVivo(it, arr.k, a); selCab = focoK = arr.k; desenharTrilho(it); } });
  window.addEventListener("pointerup", function (e) { if (!arr || e.pointerId !== arr.pid) return; var f = arr.f, foi = arrastouCab; arr = null;
    if (foi) { if (f !== foto()) guardar(f); atualizar(); dizer(rotPeca(porId(sel).pecas[focoK]) + ", posição " + (focoK + 1) + ". " + resumoArara(sel)); setTimeout(function () { arrastouCab = false; }, 0); } });

  /* ---------- catálogo: cartela de amostras; Pôr (teclado/toque) ou arrastar (Draggable). Recusa à vista, com o motivo ---------- */
  var escolha = {};
  M7.MODELOS.forEach(function (m) { escolha[m.mod] = { cor: m.cores[0], tam: m.tams[Math.floor(m.tams.length / 2)] }; });
  function skuDe(mod) { return mod + "-" + escolha[mod].cor + "-" + escolha[mod].tam; }
  function catalogo() {
    var it = porId(sel), dest = it && M7.TIPOS[it.tipo].recebe ? M7.rotulo(it) : null;
    $("#catalogo").innerHTML = M7.MODELOS.map(function (m) { var e = escolha[m.mod], ok = dest && M7.aceita(it.tipo, skuDe(m.mod)), why = dest && !ok ? motivo(it, skuDe(m.mod)) : "";
      return '<li class="modelo" data-mod="' + m.mod + '"><span class="arrasta" data-arrasta="' + m.mod + '" title="Arraste até um item"><svg viewBox="0 0 60 104" aria-hidden="true" style="color:' + M7.CORES[e.cor].hex + '"><use href="#' + m.g + '"/></svg></span>' +
        '<div><h4>' + m.nome + '</h4><span class="modo"><svg aria-hidden="true"><use href="#i-' + (m.modo === "dobra" ? "dobra" : "pendura") + '"/></svg>' + (m.modo === "ambos" ? "pendura ou dobra" : m.modo) + ' · ' + m.tipo + '</span></div>' +
        '<div class="opcoes" role="group" aria-label="Cor">' + m.cores.map(function (c) { return '<button type="button" class="cor" style="--c:' + M7.CORES[c].hex + '" data-cor="' + c + '" aria-pressed="' + (e.cor === c) + '" aria-label="' + M7.CORES[c].nome + '" title="' + M7.CORES[c].nome + '"></button>'; }).join("") +
        '</div><div class="opcoes" role="group" aria-label="Tamanho">' + m.tams.map(function (t) { return '<button type="button" class="tam" data-tam="' + t + '" aria-pressed="' + (e.tam === t) + '">' + t + '</button>'; }).join("") + '</div>' +
        '<button class="bt" type="button" data-por="' + m.mod + '"' + (ok ? "" : " disabled") + '>' + (ok ? "Pôr em " + dest : "Pôr") + '</button>' + (!dest ? '<p class="ajuda" style="grid-column:2;margin:0">Escolha um item que receba peças.</p>' : why ? '<p class="porque">' + why + '</p>' : "") + '</li>'; }).join("");
    ligarArrasto();
  }
  $("#catalogo").addEventListener("click", function (e) {
    var li = e.target.closest(".modelo"); if (!li) return; var mod = li.dataset.mod, b;
    if ((b = e.target.closest("[data-cor]"))) { escolha[mod].cor = b.dataset.cor; catalogo(); $('[data-mod="' + mod + '"] [data-cor="' + b.dataset.cor + '"]').focus(); }
    else if ((b = e.target.closest("[data-tam]"))) { escolha[mod].tam = isNaN(+b.dataset.tam) ? b.dataset.tam : +b.dataset.tam; catalogo(); $('[data-mod="' + mod + '"] [data-tam="' + b.dataset.tam + '"]').focus(); }
    else if ((b = e.target.closest("[data-por]")) && sel) { op.porPeca(sel, skuDe(mod)); var n = $('[data-por="' + mod + '"]'); if (n) n.focus(); }
  });
  var drags = [];
  function ligarArrasto() { /* GSAP Draggable move um "fantasma" fixo no body: a amostra sai da coluna sem ser cortada pela rolagem */
    drags.forEach(function (d) { d.kill(); d.target.remove(); }); drags = [];
    $$("[data-arrasta]").forEach(function (h) {
      var g = h.cloneNode(true); g.className = "fantasma"; g.removeAttribute("data-arrasta"); g.hidden = true; document.body.appendChild(g);
      drags.push(Draggable.create(g, { trigger: h, type: "x,y", minimumMovement: 6, zIndexBoost: false,
        onPress: function () { var r = h.getBoundingClientRect(); gsap.set(g, { x: r.left, y: r.top, opacity: 1, scale: 1 }); this.update(); },
        onDragStart: function () { g.hidden = false; gsap.to(g, { scale: 1.08, duration: .15 }); },
        onRelease: function () { if (!this.isDragging) g.hidden = true; },
        onDragEnd: function () { var x = this.pointerX, y = this.pointerY, id = M7.Planta.itemEm(x, y) || M7.Cena.itemEm(x, y), s = skuDe(h.dataset.arrasta);
          if (id) { sel = id; var ok = op.porPeca(id, s); if (!ok) atualizar(); gsap.to(g, { scale: ok ? .4 : 1, opacity: 0, duration: .25, onComplete: function () { g.hidden = true; } }); }
          else { gsap.to(g, { opacity: 0, duration: .2, onComplete: function () { g.hidden = true; } }); dizer("Solte a amostra sobre um item que receba peças."); } }
      })[0]);
    });
  }

  /* ---------- conferência: nota, 3 correções, achados. Estado é forma ---------- */
  var ST = { erro: "erro", atencao: "atenção", recomendacao: "recomendação", ok: "certo" }, notaMostrada = null;
  function fmt(n) { return String(n).replace(".", ","); }
  function painelConferencia() {
    var n = { erro: 0, atencao: 0, recomendacao: 0, ok: 0 }; achados.forEach(function (a) { n[a.status]++; });
    var N = notaObj, alvo = N.nota === null ? 0 : N.nota;
    $("#nota").innerHTML = '<div class="nota"><b aria-label="Nota ' + (N.nota === null ? "sem itens" : fmt(N.nota) + " de 10") + '"><span id="nota-n">' + (N.nota === null ? "—" : fmt(notaMostrada === null ? alvo : notaMostrada)) + '</span><small>/10</small></b><div class="placar">' +
      ["erro", "atencao", "recomendacao", "ok"].map(function (s) { return '<span title="' + ST[s] + '"><svg aria-hidden="true"><use href="#i-' + s + '"/></svg>' + n[s] + ' ' + (s === "ok" ? "certo" : s === "erro" ? "erro" : s === "atencao" ? "atenção" : "recom.") + '</span>'; }).join("") + '</div>' +
      '<details><summary>Como a nota é feita</summary><p>Nota = 10 × Σ(peso × valor) ÷ Σ peso, uma vez por regra, pelo pior achado dela. Peso pela força da fonte: lei ou física 3, média 2, fraca 1. Valor: certo 1, recomendação 0,75, atenção 0,4, erro 0. O impacto de uma correção é quanto a nota sobe se a regra ficar certa.</p></details></div>';
    if (N.nota !== null && notaMostrada !== null && notaMostrada !== alvo) { var o = { v: notaMostrada }; gsap.to(o, { v: alvo, duration: .5, ease: "power2.out", onUpdate: function () { var s = $("#nota-n"); if (s) s.textContent = fmt(Math.round(o.v * 10) / 10); } }); }
    notaMostrada = alvo;
    $("#top3").innerHTML = N.top3.length ? '<div class="top3"><h3>3 correções de maior impacto</h3><ol>' + N.top3.map(function (r, i) { var a = r.achado;
      return '<li><span><b>' + M7.NOMES[r.regra] + ':</b> ' + a.msg + ' <span class="mais">+' + fmt(r.impacto) + ' na nota</span>' + (a.corrige ? ' <button class="bt primario" type="button" data-corrige-regra="' + r.regra + '">Corrigir: ' + a.corrige.rotulo + '</button>' : "") + (a.itens.length ? ' <button class="bt" type="button" data-ir-regra="' + r.regra + '">Ver no lugar</button>' : "") + '</span></li>'; }).join("") + '</ol></div>' : (N.nota === null ? '<p class="vazio">Sem itens para conferir. Monte a área ou peça uma sugestão.</p>' : '<div class="top3"><h3>Nada a corrigir</h3><p class="ajuda" style="padding:0 10px 10px">Todas as regras que se aplicam estão certas.</p></div>');
    var novos = {};
    $("#achados").innerHTML = achados.map(function (a, i) { var ch = a.regra + "|" + a.itens.join(",") + "|" + a.status; novos[ch] = 1; var F = a.fonte;
      return '<li class="ach ' + a.status + '" data-ch="' + ch + '"><svg role="img" aria-label="' + ST[a.status] + '"><use href="#i-' + a.status + '"/></svg><h4>' + M7.NOMES[a.regra] + ' · ' + ST[a.status] + '</h4><p>' + a.msg + '</p>' +
        (a.corrige ? '<button class="bt primario" type="button" data-corrige="' + i + '">Corrigir: ' + a.corrige.rotulo + '</button> ' : "") + (a.itens.length ? '<button class="bt" type="button" data-ir="' + i + '">Ver no lugar</button>' : "") +
        (F ? '<details><summary>Fonte e força</summary><p>' + F.texto + '</p><p>' + F.url + ' · acesso ' + F.acesso + '</p><p><b>Força:</b> ' + F.forca + '</p></details>' : '<details><summary>Fonte</summary><p>Regra física: dois móveis não ocupam o mesmo chão e nada passa do limite da área. Não é norma.</p></details>') + '</li>'; }).join("");
    $$("#achados .ach").forEach(function (li) { if (!antes[li.dataset.ch]) gsap.fromTo(li, { backgroundColor: "#F1F2F3", y: 6 }, { backgroundColor: "#FFFFFF", y: 0, duration: .45, ease: "power3.out", clearProps: "transform" }); });
    antes = novos;
    var b = $("#n-erros"); b.hidden = !n.erro; b.textContent = n.erro;
  }
  function corrigir(a) { var c = a && a.corrige; if (!c) return false;
    operar(function () { M7.aplicarCorrecao(proj, c); });
    sel = c.id; atualizar(); dizer("Corrigido: " + c.rotulo + ". Ctrl+Z desfaz.", true); return true; }
  function irPara(a) { var id = a.itens[0]; sel = id; atualizar(); M7.Cena.focar(id); M7.Planta.pulsar(a.itens); if (consulta()) $("#v-planta").scrollIntoView({ behavior: reduz ? "auto" : "smooth" }); dizer("Mostrando " + M7.rotulo(porId(id)) + " na planta e no 3D."); }
  $("#achados").addEventListener("click", function (e) { var b = e.target.closest("[data-ir]"), c = e.target.closest("[data-corrige]"); if (b) irPara(achados[+b.dataset.ir]); if (c) corrigir(achados[+c.dataset.corrige]); });
  $("#top3").addEventListener("click", function (e) { var b = e.target.closest("[data-ir-regra]"), c = e.target.closest("[data-corrige-regra]"), k = (b || c) && (b || c).dataset.irRegra || (c && c.dataset.corrigeRegra); if (!b && !c) return; var r = notaObj.top3.filter(function (x) { return x.regra === (b ? b.dataset.irRegra : c.dataset.corrigeRegra); })[0]; if (!r) return; if (b) irPara(r.achado); else corrigir(r.achado); });

  /* ---------- abas do cartão ---------- */
  var ABAS = ["conf", "pecas", "sug", "proj"];
  function abrirAba(n, foco) { ABAS.forEach(function (k) { var t = $("#aba-" + k), p = $("#p-" + k), on = k === n; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; p.hidden = !on; });
    if (foco) $("#aba-" + n).focus(); if (n === "sug" && !$("#form-sug").children.length) formSug(); }
  $(".abas").addEventListener("click", function (e) { var t = e.target.closest("[role=tab]"); if (t) abrirAba(t.id.slice(4)); });
  $(".abas").addEventListener("keydown", function (e) { var t = e.target.closest("[role=tab]"); if (!t) return; var vis = ABAS.filter(function (k) { return $("#aba-" + k).offsetParent !== null; }), i = vis.indexOf(t.id.slice(4)), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (e.key === "Home") i = 0; else if (e.key === "End") i = vis.length - 1; else if (d) i = (i + d + vis.length) % vis.length; else return; e.preventDefault(); abrirAba(vis[i], true); });

  /* ---------- sugestão automática: formulário, 3 variações, linha do tempo que monta na frente do usuário ---------- */
  var FORMATOS = { retangular: 4 / 3, quadrado: 1, comprido: 2 };
  var FS = { m2: 20, formato: "retangular", cenario: "cea", itens: { parede: { qtd: 1, larg: 400 }, arara_parede: { qtd: 2 }, arara_reta: { qtd: 0 }, arara_circular: { qtd: 0 }, mesa: { qtd: 2, larg: 120, prof: 80 }, gondola: { qtd: 0 }, manequim: { qtd: 1 }, vitrine: { qtd: 0 }, provador: { qtd: 1 }, caixa: { qtd: 0 }, porta: { qtd: 0 } },
    pecas: { cm: { cores: ["branco", "preto"], tams: ["P", "M", "G"], n: 1 }, bz: { cores: ["offwhite"], tams: ["P", "M", "G"], n: 1 }, wl: { cores: ["jeans"], tams: [36, 38, 40, 42, 44], n: 1 }, alf: { cores: ["rosa", "marrom"], tams: [36, 38, 40], n: 1 }, sl: { cores: [], tams: [], n: 1 }, vm: { cores: [], tams: [], n: 1 } } };
  function dimsDe(m2, formato) { var r = FORMATOS[formato], larg = Math.round(Math.sqrt(m2 * r) * 10) * 10, prof = Math.round(m2 * 10000 / larg / 10) * 10; return { larg_cm: Math.max(100, larg), prof_cm: Math.max(100, prof) }; }
  function recursosDoForm() { var d = dimsDe(FS.m2, FS.formato), it = [], pe = [];
    Object.keys(FS.itens).forEach(function (t) { var x = FS.itens[t]; if (x.qtd > 0) it.push({ tipo: t, qtd: x.qtd, larg: x.larg || undefined, prof: x.prof || undefined }); });
    M7.MODELOS.forEach(function (m) { var x = FS.pecas[m.mod]; if (x && x.cores.length && x.tams.length) pe.push({ mod: m.mod, cores: x.cores.slice(), tams: x.tams.slice(), n: x.n }); });
    return { cenario: FS.cenario, area: { larg_cm: d.larg_cm, prof_cm: d.prof_cm }, itens: it, pecas: pe }; }
  function formSug() {
    var d = dimsDe(FS.m2, FS.formato), f = $("#form-sug");
    f.innerHTML = '<fieldset><legend>Área</legend><div class="linha" style="grid-template-columns:1fr 1fr"><label><span>Metros quadrados</span><input type="number" inputmode="decimal" id="f-m2" min="2" max="200" step="0.5" value="' + FS.m2 + '"></label><label><span>Formato</span><select id="f-formato">' + Object.keys(FORMATOS).map(function (k) { return '<option value="' + k + '"' + (k === FS.formato ? " selected" : "") + '>' + k + '</option>'; }).join("") + '</select></label></div><p class="ajuda" id="f-dims" style="margin:0">' + d.larg_cm + ' × ' + d.prof_cm + ' cm, entrada de 120 cm no meio da frente.</p></fieldset>' +
      '<fieldset><legend>Itens disponíveis</legend>' + Object.keys(FS.itens).map(function (t) { var T = M7.TIPOS[t], x = FS.itens[t];
        return '<div class="linha l4"><div class="nome"><svg aria-hidden="true"><use href="#t-' + t + '"/></svg>' + T.nome + '</div><label><span>Qtd</span><input type="number" inputmode="numeric" min="0" max="12" data-it="' + t + '" data-k="qtd" value="' + x.qtd + '"></label><label><span>Larg. cm</span><input type="number" inputmode="numeric" min="30" max="1200" data-it="' + t + '" data-k="larg" placeholder="' + T.larg + '" value="' + (x.larg || "") + '"></label>' +
          /* Dev1 r2: o pedido diz "2 mesas de 1,2 × 0,8 m"; sem a profundidade, a mesa de 100 × 60 do próprio #teste não se digitava */
          '<label><span>Prof. cm</span><input type="number" inputmode="numeric" min="5" max="1200" data-it="' + t + '" data-k="prof" placeholder="' + T.prof + '" value="' + (x.prof || "") + '"></label></div>'; }).join("") + '</fieldset>' +
      '<fieldset><legend>Peças</legend>' + M7.MODELOS.map(function (m) { var x = FS.pecas[m.mod];
        return '<div class="pecas-linha"><h4>' + m.nome + ' <small>(' + (m.modo === "ambos" ? "pendura ou dobra" : m.modo) + ')</small></h4><div class="opcoes" role="group" aria-label="Cores de ' + m.nome + '">' + m.cores.map(function (c) { return '<button type="button" class="cor" style="--c:' + M7.CORES[c].hex + '" data-pm="' + m.mod + '" data-pcor="' + c + '" aria-pressed="' + (x.cores.indexOf(c) >= 0) + '" aria-label="' + M7.CORES[c].nome + '"></button>'; }).join("") + '</div><div class="opcoes" role="group" aria-label="Tamanhos de ' + m.nome + '">' + m.tams.map(function (t) { return '<button type="button" class="tam" data-pm="' + m.mod + '" data-ptam="' + t + '" aria-pressed="' + (x.tams.indexOf(t) >= 0) + '">' + t + '</button>'; }).join("") + '</div><label class="n">Peças por cor e tamanho <input type="number" inputmode="numeric" min="1" max="10" data-pm="' + m.mod + '" data-pn="1" value="' + x.n + '"></label></div>'; }).join("") + '</fieldset>' +
      '<fieldset><legend>Cenário</legend><div class="radio" role="group" aria-label="Cenário"><button class="bt" type="button" data-cen="cea" aria-pressed="' + (FS.cenario === "cea") + '">Espaço na C&amp;A</button><button class="bt" type="button" data-cen="multi" aria-pressed="' + (FS.cenario === "multi") + '">Corner multimarca</button></div><p class="ajuda" style="margin:6px 0 0">A divisa neutra só existe na multimarca (tabela C&amp;A × multimarca do guia).</p></fieldset>' +
      '<button class="bt primario" type="submit">Sugerir montagem</button>';
  }
  $("#form-sug").addEventListener("input", function (e) { var t = e.target;
    if (t.id === "f-m2") { FS.m2 = Math.max(2, Math.min(200, +t.value || 2)); $("#f-dims").textContent = dimsDe(FS.m2, FS.formato).larg_cm + " × " + dimsDe(FS.m2, FS.formato).prof_cm + " cm, entrada de 120 cm no meio da frente."; }
    else if (t.id === "f-formato") { FS.formato = t.value; $("#f-dims").textContent = dimsDe(FS.m2, FS.formato).larg_cm + " × " + dimsDe(FS.m2, FS.formato).prof_cm + " cm, entrada de 120 cm no meio da frente."; }
    else if (t.dataset.it) { var x = FS.itens[t.dataset.it]; x[t.dataset.k] = Math.max(0, Math.round(+t.value) || 0); if (!x[t.dataset.k] && t.dataset.k !== "qtd") delete x[t.dataset.k]; }
    else if (t.dataset.pn) FS.pecas[t.dataset.pm].n = Math.max(1, Math.min(10, Math.round(+t.value) || 1)); });
  $("#form-sug").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.cen) { FS.cenario = b.dataset.cen; $$("[data-cen]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); return; }
    if (b.dataset.pcor || b.dataset.ptam) { var x = FS.pecas[b.dataset.pm], lista = b.dataset.pcor ? x.cores : x.tams, v = b.dataset.pcor || (isNaN(+b.dataset.ptam) ? b.dataset.ptam : +b.dataset.ptam), i = lista.indexOf(v); if (i >= 0) lista.splice(i, 1); else lista.push(v); b.setAttribute("aria-pressed", i < 0); } });
  $("#form-sug").addEventListener("submit", function (e) { e.preventDefault(); sugerir(recursosDoForm()); });

  var ultimaSug = null;
  function sugerir(rec) {
    var r = M7.sugerir(rec), S = $("#sug-saida"); ultimaSug = r; var cen = rec.cenario === "multi" ? "multimarca" : "C&A";
    var faltas = r.faltas.length ? '<div class="faltas" role="status"><b>O que falta ou não coube</b><ul>' + r.faltas.map(function (f) { return '<li>' + f + '</li>'; }).join("") + '</ul></div>' : "";
    /* Dev1 r2: sem variação, mostra o porquê de cada uma E o que falta (antes, uma coisa escondia a outra) */
    if (!r.variacoes.length) { S.innerHTML = '<p class="vazio">Nenhuma montagem útil com esses recursos.</p>' + faltas + (r.descartadas.length ? '<ul class="ajuda">' + r.descartadas.map(function (d) { return "<li>" + d + "</li>"; }).join("") + "</ul>" : ""); dizer("Nada para montar com esses recursos. " + (r.faltas[0] || r.descartadas[0] || "")); return r; }
    S.innerHTML = faltas + '<div class="cards">' + r.variacoes.map(function (v, i) { var n = v.projeto.itens.length;
      return '<div class="card-var" data-v="' + i + '"><h4><span>' + (i + 1) + ' · ' + v.nome + '</span><span>' + fmt(v.nota) + '/10</span></h4><div class="mini">' + M7.Planta.estatico(v.projeto, 300, 220, null, null, "m" + i, false, true) + '</div><p class="meta">' + n + ' itens · ' + v.projeto.itens.reduce(function (s, it) { return s + it.pecas.length; }, 0) + ' peças · sem erro · corredores de ' + (v.corredor / 100).toFixed(2).replace(".", ",") + ' m · ' + cen + '</p>' + (v.soEsta.length ? '<ul class="so-esta">' + v.soEsta.map(function (f) { return '<li>' + f + '</li>'; }).join("") + '</ul>' : "") + '<p class="meta" title="mesma entrada, mesma assinatura">assinatura ' + v.hash.slice(0, 6) + '</p><button class="bt primario" type="button" data-monta="' + i + '">Montar esta</button></div>'; }).join("") + '</div><div id="sug-passos"></div>';
    gsap.from("#sug-saida .card-var", { y: 12, opacity: 0, duration: .35, stagger: .08, ease: "power3.out", clearProps: "all" });
    dizer(r.variacoes.length + (r.variacoes.length === 1 ? " variação pronta." : " variações prontas.") + (r.faltas.length ? " " + r.faltas.length + " aviso de falta." : "")); return r;
  }
  $("#sug-saida").addEventListener("click", function (e) { var b = e.target.closest("[data-monta]"); if (b) montarAnimado(ultimaSug.variacoes[+b.dataset.monta]); var p = e.target.closest("[data-passo]"); if (p) { sel = p.dataset.passo; atualizar(); M7.Cena.focar(sel); } var sk = e.target.closest("#b-pula"); if (sk && tl) tl.progress(1); });
  function montarAnimado(v) {
    if (tl) tl.progress(1);
    var alvo = JSON.parse(JSON.stringify(v.projeto)), vazio = JSON.parse(JSON.stringify(alvo)); vazio.itens = [];
    var f = foto(); proj = vazio; sel = null; abertoId = null; guardar(f); atualizar(); M7.Cena.enquadrar();
    var ex = {}; v.explicacoes.forEach(function (x) { (ex[x.id] = ex[x.id] || []).push(x.txt); });
    var ordem = v.ordem.filter(function (id) { return alvo.itens.some(function (it) { return it.id === id; }); });
    $("#sug-passos").innerHTML = '<h3 style="margin:14px 0 4px">Montando… <button class="bt" type="button" id="b-pula">Pular animação</button></h3><ol class="passos">' + ordem.map(function (id) { var it = alvo.itens.filter(function (x) { return x.id === id; })[0];
      return '<li data-p="' + id + '"><button type="button" data-passo="' + id + '"><b>' + M7.rotulo(it) + '</b><br>' + (ex[id] || ["Posto na área."]).join(" ") + '</button></li>'; }).join("") + '</ol>';
    tl = gsap.timeline({ onComplete: function () { tl = null; var h = $("#sug-passos h3"); if (h) h.innerHTML = "Montado: " + ordem.length + " itens. Cada escolha explicada abaixo"; sel = null; atualizar(); M7.Cena.enquadrar(); dizer("Montagem pronta: " + v.nome + ", nota " + fmt(v.nota) + ". Ctrl+Z volta ao que havia antes."); } });
    ordem.forEach(function (id) {
      var it = alvo.itens.filter(function (x) { return x.id === id; })[0], vivo2 = JSON.parse(JSON.stringify(it)), pecas = vivo2.pecas; vivo2.pecas = []; var li = $('[data-p="' + id + '"]'), an = M7.Cena.animar(id, { y: 160, s: .6 });
      tl.call(function () { proj.itens.push(vivo2); sel = id; $$("#sug-passos .passos li").forEach(function (x) { x.classList.remove("agora"); }); if (li) { li.classList.add("agora", "feito"); li.scrollIntoView({ block: "nearest" }); } atualizar(true); painelItens(); painelItem(); });
      tl.to(an, { y: 0, s: 1, duration: .55, ease: "back.out(1.4)", onUpdate: function () { M7.Cena.recompor(); } });
      if (pecas.length) { var o = { n: 0 }; tl.to(o, { n: pecas.length, duration: Math.min(.9, .25 + pecas.length * .03), ease: "none", onUpdate: function () { vivo2.pecas = pecas.slice(0, Math.floor(o.n)); atualizar(true); } }); tl.call(function () { vivo2.pecas = pecas.slice(); }); }
      tl.to({}, { duration: .12 });
    });
    return tl;
  }

  /* ---------- projeto: salvar/abrir no aparelho (localStorage), exportar/importar JSON ---------- */
  var CHAVE = teste ? "m7sim.teste" : "m7sim.projetos", RASC = "m7sim.rascunho"; /* o #teste usa uma chave só dele: nunca mexe nos projetos de verdade */
  var Store = { ler: function (k) { try { var t = localStorage.getItem(k); return t ? JSON.parse(t) : null; } catch (e) { return null; } },
    gravar: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
  function lista() { var l = Store.ler(CHAVE); return Array.isArray(l) ? l : []; }
  var tRasc = 0; function rascunho() { clearTimeout(tRasc); tRasc = setTimeout(function () { Store.gravar(RASC, proj); }, 400); }
  function msg(t, erro) { var m = $("#msg-proj"); m.textContent = t; m.className = "msg" + (erro ? " erro" : ""); dizer(t, !!erro); }
  function salvar() {
    proj.nome = ($("#in-nome").value || proj.nome).trim().slice(0, 60) || "Sem nome"; var l = lista(), reg = { id: abertoId || ("p" + Date.now().toString(36)), nome: proj.nome, quando: new Date().toISOString(), projeto: JSON.parse(JSON.stringify(proj)) }, i = l.map(function (x) { return x.id; }).indexOf(reg.id);
    if (i >= 0) l[i] = reg; else l.unshift(reg); l = l.slice(0, 20);
    if (!Store.gravar(CHAVE, l)) { msg("Não consegui salvar neste aparelho (o navegador bloqueou o armazenamento). Use Exportar JSON para guardar uma cópia.", true); return false; }
    abertoId = reg.id; atualizar(); painelSalvos(); msg("Salvo neste aparelho: " + proj.nome + "."); return true;
  }
  function painelSalvos() { var l = lista(); $("#salvos").innerHTML = l.length ? l.map(function (r) { return '<li><span><b>' + r.nome.replace(/</g, "&lt;") + '</b><small>' + new Date(r.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) + ' · ' + r.projeto.itens.length + ' itens</small></span><button class="bt" type="button" data-abre="' + r.id + '">Abrir</button><button class="bt perigo" type="button" data-apaga="' + r.id + '" aria-label="Apagar ' + r.nome.replace(/"/g, "") + '">Apagar</button></li>'; }).join("") : '<li class="vazio">Nada salvo ainda.</li>'; }
  $("#salvos").addEventListener("click", function (e) { var a = e.target.closest("[data-abre]"), d = e.target.closest("[data-apaga]"), l = lista();
    if (a) { var r = l.filter(function (x) { return x.id === a.dataset.abre; })[0]; if (!r) return; var er = M7.checarProjeto(r.projeto); if (er) { msg("O projeto salvo está com defeito (" + er + "). Ele não foi aberto.", true); return; } carregar(JSON.parse(JSON.stringify(r.projeto))); abertoId = r.id; msg("Aberto: " + r.nome + "."); }
    if (d) { if (d.dataset.sim) { Store.gravar(CHAVE, l.filter(function (x) { return x.id !== d.dataset.apaga; })); painelSalvos(); msg("Apagado."); } else { d.dataset.sim = "1"; d.textContent = "Apagar mesmo?"; setTimeout(function () { if (d.isConnected) { delete d.dataset.sim; d.textContent = "Apagar"; } }, 3000); } } });
  function importar(texto) { /* confere tudo antes de tocar no projeto aberto */
    var o; try { o = JSON.parse(texto); } catch (e) { msg("Arquivo inválido: não é JSON (" + e.message.slice(0, 50) + "). O projeto aberto não foi alterado.", true); return { ok: false, erro: "json" }; }
    var er = M7.checarProjeto(o); if (er) { msg("Arquivo inválido: " + er + " O projeto aberto não foi alterado.", true); return { ok: false, erro: er }; }
    carregar(o); abertoId = null; msg("Importado: " + o.nome + ", " + o.itens.length + " itens."); return { ok: true };
  }
  $("#in-json").addEventListener("change", function (e) { var f = e.target.files[0]; if (!f) return; if (f.size > 4e6) { msg("Arquivo grande demais (acima de 4 MB). O projeto aberto não foi alterado.", true); e.target.value = ""; return; }
    var r = new FileReader(); r.onload = function () { importar(String(r.result)); e.target.value = ""; }; r.onerror = function () { msg("Não consegui ler o arquivo.", true); }; r.readAsText(f); });
  $("#b-json").addEventListener("click", function () { var nome = (proj.nome.replace(/[^\w\- ]+/g, "").trim() || "projeto").replace(/ +/g, "-") + ".json"; M7.Export.baixar(new Blob([JSON.stringify(proj, null, 2)], { type: "application/json" }), nome); msg("Exportado: " + nome); });
  $("#b-salvar").addEventListener("click", function () { abrirAba("proj"); salvar(); }); $("#b-salvar2").addEventListener("click", salvar);
  $("#in-nome").addEventListener("change", function () { proj.nome = this.value.trim().slice(0, 60) || proj.nome; $("#nome-proj").textContent = proj.nome; });
  $("#b-png").addEventListener("click", function () { M7.Export.png().then(function (b) { M7.Export.baixar(b, (proj.nome.replace(/[^\w\- ]+/g, "").trim() || "planta").replace(/ +/g, "-") + "-A4.png"); msg("PNG A4 gerado."); }, function () { msg("Não consegui gerar o PNG.", true); }); });
  $("#b-pdf").addEventListener("click", function () { msg("Abrindo a impressão: escolha \"Salvar como PDF\", papel A4."); M7.Export.pdf(); });
  $("#b-fps").addEventListener("click", function () { var b = this, guarda = foto(), s = $("#saida-fps"); b.disabled = true; s.hidden = false; s.textContent = "Medindo 10 s…";
    M7.estresse(10, function (r, c, txt) { s.textContent = txt; carregar(JSON.parse(guarda)); b.disabled = false; }, true); });

  /* ---------- teclado do editor: setas movem, R gira, D duplica, Delete apaga, Ctrl+Z ---------- */
  document.addEventListener("keydown", function (e) {
    if (!e.target.isConnected || (e.target.closest && e.target.closest("input,textarea,select,#painel-pecas,.opcoes,.abas,#sug-saida,#salvos"))) return;
    var c = e.ctrlKey || e.metaKey, k = e.key;
    if (c && (k === "z" || k === "Z")) { e.preventDefault(); e.shiftKey ? op.refazer() : op.desfazer(); return; }
    if (c && (k === "y" || k === "Y")) { e.preventDefault(); op.refazer(); return; }
    if (!sel || c || e.altKey || consulta()) return; var it = porId(sel), p = e.shiftKey ? 50 : GRADE;
    var d = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[k];
    if (d) { e.preventDefault(); op.mover(sel, it.x_cm + d[0], it.z_cm + d[1]); dizer(M7.rotulo(it) + " em " + porId(sel).x_cm + ", " + porId(sel).z_cm + " cm."); }
    else if (k === "r" || k === "R") { e.preventDefault(); op.girar(sel, e.shiftKey ? -15 : 15); }
    else if (k === "d" || k === "D") { e.preventDefault(); op.duplicar(sel); }
    else if (k === "Delete" || k === "Backspace") { e.preventDefault(); op.apagar(sel); }
    else if (k === "Escape") { sel = null; atualizar(); }
  });
  $("#pula-planta").addEventListener("click", function (e) { e.preventDefault(); var g = document.querySelector("#planta .it[tabindex=\"0\"]"); if (g) g.focus(); });
  $("#b-desfaz").addEventListener("click", op.desfazer); $("#b-refaz").addEventListener("click", op.refazer);
  $$("[data-ex]").forEach(function (b) { b.addEventListener("click", function () { carregar(M7.CENARIOS[b.dataset.ex]()); abertoId = null; dizer("Exemplo " + proj.nome + " carregado. Ctrl+Z volta ao que havia antes."); }); });
  function vista(v) { var p = $("#prancheta"); p.dataset.vista = v; $$("[data-vista]").forEach(function (b) { if (b.tagName === "BUTTON" && b.dataset.vista !== undefined) b.setAttribute("aria-pressed", b.dataset.vista === (v === "trocada" ? "dividida" : v)); });
    $("#b-troca").setAttribute("aria-pressed", v === "trocada"); $("#b-troca").disabled = v === "planta" || v === "tres"; setTimeout(function () { M7.Cena.medirTela(); M7.Planta.medirTela(); }, 30); }
  $$(".vistas [data-vista]").forEach(function (b) { b.addEventListener("click", function () { vista(b.dataset.vista); }); });
  $("#b-troca").addEventListener("click", function () { vista($("#prancheta").dataset.vista === "trocada" ? "dividida" : "trocada"); });
  $("#cena").addEventListener("pointerdown", function () { $("#dica-cena").hidden = true; }, { once: true });

  function carregar(p) { var f = foto(); proj = p; sel = null; guardar(f); notaMostrada = null; atualizar(); M7.Cena.enquadrar(); }

  /* ---------- planta e 3D avisam o editor ---------- */
  var fotoArr = null;
  var cbs = {
    selecionar: function (id) { if (id !== sel) { sel = id; atualizar(); } },
    inicioArrasto: function () { fotoArr = foto(); },
    arrastando: function (id, x, z) { encaixar(porId(id), x, z, true); atualizar(true); },
    medidaViva: function (id, campo, v) { var it = porId(id); it[campo] = campo === "alt" ? Math.max(20, Math.min(400, snap(v))) : Math.max(10, Math.min(2000, snap(v))); atualizar(true); },
    fimArrasto: function (id) { if (fotoArr && fotoArr !== foto()) guardar(fotoArr); fotoArr = null; atualizar(); var it = porId(id); if (it) dizer(M7.rotulo(it) + " em " + it.x_cm + ", " + it.z_cm + " cm, " + it.larg + "×" + it.prof + "×" + it.alt + "."); }
  };
  M7.Planta.init($("#planta"), cbs); M7.Cena.init($("#cena"), cbs);
  if (window.ResizeObserver) new ResizeObserver(function () { M7.Planta.medirTela(); }).observe($("#v-planta .palco"));
  if (!teste) { var r0 = Store.ler(RASC); if (r0 && !M7.checarProjeto(r0)) { proj = r0; } }
  atualizar(); painelSalvos(); M7.Cena.enquadrar(); vista("dividida");

  M7.Ed = { proj: function () { return proj; }, sel: function () { return sel; }, achados: function () { return achados; }, rota: function () { return rota; }, nota: function () { return notaObj; }, pego: function () { return pego; },
    op: op, corrigir: corrigir, selecionar: selecionar, carregar: carregar, hist: function () { return hist.length; }, importar: importar, salvar: salvar, lista: lista, abrirAba: abrirAba, sugerir: sugerir, montarAnimado: montarAnimado, tl: function () { return tl; },
    recursosDoForm: recursosDoForm, estado: FS, abertoId: function () { return abertoId; }, store: Store, CHAVE: CHAVE, vista: vista };
})();
