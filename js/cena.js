/* Mindse7 · simulador · prova 3D (three r147, script clássico). Desenha só quando algo muda: sem laço contínuo.
   Traço do guia em volume: faces brancas, aresta de tinta, chão de papel ponteado, sem sombra nem céu. 1 unidade = 1 cm.
   Orçamento: todos os móveis viram 1 malha + 1 contorno (2 chamadas); peças penduradas em instâncias (2 por silhueta). */
var M7 = window.M7 || (window.M7 = {});
M7.Cena = (function () {
  var R, cena, cam, ctl, cv, cb, sujo = false, chao = null, sigArea = "", selG = null, fio = null, roupa = {}, ray = new THREE.Raycaster(), arr = null;
  var TINTA = 0x141414, mLinha = new THREE.LineBasicMaterial({ color: TINTA }), mTinta = new THREE.MeshBasicMaterial({ color: TINTA }), mVert = new THREE.MeshLambertMaterial({ vertexColors: true }),
    mPeca = new THREE.MeshLambertMaterial({ color: 0xffffff });
  var cache = {}, moveis = null, contornos = null, proj = null, sel = null, anim = {}, marcas = {}, alcas = null;

  /* ---------- peças de montar (em coordenadas do item) ---------- */
  var BRANCO = new THREE.Color(0xffffff), CORTINA = new THREE.Color(0xE3E4E5);
  function peca(lista, geo, x, y, z, cor, ang, sx, sy, sz, rx) { /* empilha uma geometria com cor e transformação */
    var m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, 0, 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
    if (ang) m.premultiply(new THREE.Matrix4().makeRotationY(ang));
    lista.push({ g: geo, m: m, c: cor || BRANCO });
  }
  var BOX = new THREE.BoxGeometry(1, 1, 1);
  function caixa(l, w, h, d, x, y, z, cor) { peca(l, BOX, x, y, z, cor, 0, w, h, d); }
  function tom(s) { return new THREE.Color(M7.CORES[M7.sku(s).cor].hex); }
  function pilhas(l, it, larg, prof, y0, maxCol) { /* dobrados: uma pilha por SKU, 2,6 cm por peça */
    var p = [], v = {}; it.pecas.forEach(function (s) { if (!v[s]) { v[s] = { s: s, n: 0 }; p.push(v[s]); } v[s].n++; });
    var col = Math.max(1, Math.min(maxCol || 9, Math.floor((larg - 10) / 34))), lin = Math.max(1, Math.floor((prof - 8) / 32));
    p.slice(0, col * lin).forEach(function (q, i) { var c = i % col, li = Math.floor(i / col), h = Math.min(q.n, 12) * 2.6;
      caixa(l, 30, h, 28, -larg / 2 + 5 + 17 + c * 34, y0 + h / 2, -prof / 2 + 4 + 15 + li * 32, tom(q.s)); });
    return p.length - col * lin; /* o que sobrou sem lugar */
  }
  function corpo(l, a, r, look) { /* manequim de costureira: base, haste, tronco torneado, cabeça; o look pinta o tronco e a saia/calça */
    var base = 92, cab = 9, esc = (a - base - cab * 2) / 74, ps = (look || []).map(M7.sku);
    var cima = ps.filter(function (p) { return p.camada === "cima" || p.camada === "inteiro"; }), baixo = ps.filter(function (p) { return p.camada === "baixo" || p.camada === "inteiro"; });
    peca(l, new THREE.CylinderGeometry(r * .7, r * .75, 2, 24), 0, 1, 0);
    peca(l, new THREE.CylinderGeometry(1.2, 1.2, base - 2, 8), 0, base / 2 + 1, 0);
    var perfil = [[0, 0], [10, 0], [12, 6], [14, 18], [11.5, 32], [13.5, 44], [16.5, 54], [15.5, 60], [7, 66], [4.5, 68], [4.5, 74], [0, 74]].map(function (p) { return new THREE.Vector2(p[0] * r / 25 * 1.6, p[1] * esc); });
    peca(l, new THREE.LatheGeometry(perfil, 18), 0, base, 0, cima.length ? tom(cima[cima.length - 1].sku) : BRANCO, 0, 1, 1, .72);
    peca(l, new THREE.SphereGeometry(cab, 14, 10), 0, a - cab, 0, BRANCO, 0, .85, 1.05, .9);
    if (baixo.length) { var b = baixo[0], comp = b.tipo === "Vestido" ? 45 : b.tipo === "Saia longa" ? 80 : 88; /* a peça de baixo cai do quadril */
      peca(l, new THREE.CylinderGeometry(r * .5, b.tipo.indexOf("Calça") === 0 ? r * .42 : r * .9, comp, 16, 1, true), 0, base + 4 - comp / 2, 0, tom(b.sku)); }
  }
  var MONTA = {
    parede: function (l, it) { caixa(l, it.larg, it.alt, it.prof, 0, it.alt / 2, 0); },
    arara_reta: function (l, it) { var w = it.larg, d = it.prof, a = it.alt;
      [-1, 1].forEach(function (s) { caixa(l, 3, a, 3, s * (w / 2 - 2), a / 2, 0); caixa(l, 5, 3, d, s * (w / 2 - 2), 1.5, 0); });
      peca(l, new THREE.CylinderGeometry(1.6, 1.6, w, 10), 0, a - 2, 0, BRANCO, 0, 1, 1, 1); l[l.length - 1].m.multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); },
    arara_parede: function (l, it) { var w = it.larg, d = it.prof, a = it.alt;
      [-1, 1].forEach(function (s) { caixa(l, 3, 3, d / 2 + 2, s * (w / 2 - 4), a - 2, -d / 4); caixa(l, 4, 14, 2, s * (w / 2 - 4), a - 6, -d / 2 + 1); });
      peca(l, new THREE.CylinderGeometry(1.6, 1.6, w, 10), 0, a - 2, 0); l[l.length - 1].m.multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); },
    arara_circular: function (l, it) { var r = it.larg / 2 * .82, a = it.alt;
      peca(l, new THREE.TorusGeometry(r, 1.4, 6, 40), 0, a - 2, 0, BRANCO, 0, 1, 1, 1, Math.PI / 2);
      peca(l, new THREE.CylinderGeometry(2, 2, a, 10), 0, a / 2, 0); peca(l, new THREE.CylinderGeometry(it.larg * .3, it.larg * .32, 3, 24), 0, 1.5, 0); },
    mesa: function (l, it) { var w = it.larg, d = it.prof, a = it.alt;
      caixa(l, w, 4, d, 0, a - 2, 0); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) { caixa(l, 4, a - 4, 4, s[0] * (w / 2 - 5), (a - 4) / 2, s[1] * (d / 2 - 5)); });
      pilhas(l, it, w, d, a); },
    manequim: function (l, it) { corpo(l, it.alt, Math.min(it.larg, it.prof) / 2, it.pecas); },
    provador: function (l, it) { var w = it.larg, d = it.prof, a = it.alt;
      caixa(l, w, a, 4, 0, a / 2, -d / 2 + 2); [-1, 1].forEach(function (s) { caixa(l, 4, a, d, s * (w / 2 - 2), a / 2, 0); });
      caixa(l, w, 3, 3, 0, a - 8, d / 2 - 2); caixa(l, w * .62, a - 26, 2, -w * .17, (a - 26) / 2 + 12, d / 2 - 2, CORTINA); },
    caixa: function (l, it) { var w = it.larg, d = it.prof, a = it.alt; caixa(l, w, a - 4, d - 6, 0, (a - 4) / 2, 3); caixa(l, w + 4, 4, d, 0, a - 2, 0); },
    porta: function (l, it) { var w = it.larg, a = it.alt; [-1, 1].forEach(function (s) { caixa(l, 5, a, 12, s * (w / 2 + 2.5), a / 2, 0); }); caixa(l, w + 10, 6, 12, 0, a + 3, 0); }
  };
  MONTA.vitrine = function (l, it) { var w = it.larg, d = it.prof, a = it.alt; caixa(l, w, 30, d, 0, 15, 0);
    var g = []; corpo(g, Math.min(a - 40, 175), 22, it.pecas.slice(0, 3)); g.forEach(function (p) { p.m.premultiply(new THREE.Matrix4().makeTranslation(0, 30, 0)); l.push(p); });
    if (it.pecas.length > 3) pilhas(l, { pecas: it.pecas.slice(3) }, w * .9, d * .9, 30, 4); };
  MONTA.gondola = function (l, it) { var w = it.larg, d = it.prof, a = it.alt, nv = 3, col = Math.max(1, Math.floor((w - 16) / 34));
    caixa(l, w, a, 3, 0, a / 2, -d / 2 + 1.5); [-1, 1].forEach(function (s) { caixa(l, 3, a, d, s * (w / 2 - 1.5), a / 2, 0); });
    var y = []; for (var i = 0; i < nv; i++) { y.push(12 + i * (a - 20) / nv); caixa(l, w - 6, 2.5, d - 3, 0, y[i], 1.5); }
    var p = [], v = {}; it.pecas.forEach(function (s) { if (!v[s]) { v[s] = { s: s, n: 0 }; p.push(v[s]); } v[s].n++; });
    p.slice(0, col * nv).forEach(function (q, i) { var c = i % col, nvl = Math.floor(i / col), h = Math.min(q.n, 10) * 2.6;
      caixa(l, 30, h, 26, -w / 2 + 8 + 17 + c * 34, y[nvl] + 1.25 + h / 2, 2, tom(q.s)); }); };

  /* geometria do item, em coordenadas locais: posição, normal, cor e o contorno. Guardada por assinatura. */
  function geometria(it) {
    var sig = [it.tipo, it.larg, it.prof, it.alt, M7.ARARAS[it.tipo] ? "" : it.pecas.join()].join("|");
    if (cache[it.id] && cache[it.id].sig === sig) return cache[it.id];
    var l = []; MONTA[it.tipo](l, it); var pos = [], nor = [], col = [], lin = [], v = new THREE.Vector3(), nm = new THREE.Matrix3();
    l.forEach(function (p) { var g = p.g.index ? p.g.toNonIndexed() : p.g, P = g.attributes.position, N = g.attributes.normal; nm.getNormalMatrix(p.m);
      for (var i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(p.m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); col.push(p.c.r, p.c.g, p.c.b); }
      var e = new THREE.EdgesGeometry(p.g, 28), E = e.attributes.position; for (i = 0; i < E.count; i++) { v.fromBufferAttribute(E, i).applyMatrix4(p.m); lin.push(v.x, v.y, v.z); } e.dispose(); if (g !== p.g) g.dispose(); });
    return (cache[it.id] = { sig: sig, pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), lin: new Float32Array(lin) });
  }
  /* compõe todos os móveis numa malha só (e todos os contornos numa linha só) */
  function compor() {
    var gs = proj.itens.map(function (it) { return { it: it, g: geometria(it) }; }), nv = 0, nl = 0;
    gs.forEach(function (x) { nv += x.g.pos.length; nl += x.g.lin.length; });
    var P = new Float32Array(nv), N = new Float32Array(nv), C = new Float32Array(nv), Lp = new Float32Array(nl), o = 0, ol = 0;
    gs.forEach(function (x) { var it = x.it, g = x.g, a = -it.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), an = anim[it.id] || { y: 0, s: 1 }, k = an.s;
      for (var i = 0; i < g.pos.length; i += 3) { var px = g.pos[i] * k, py = g.pos[i + 1] * k, pz = g.pos[i + 2] * k;
        P[o + i] = it.x_cm + px * c + pz * s; P[o + i + 1] = py + an.y; P[o + i + 2] = it.z_cm - px * s + pz * c;
        N[o + i] = g.nor[i] * c + g.nor[i + 2] * s; N[o + i + 1] = g.nor[i + 1]; N[o + i + 2] = -g.nor[i] * s + g.nor[i + 2] * c; }
      C.set(g.col, o); o += g.pos.length;
      for (i = 0; i < g.lin.length; i += 3) { px = g.lin[i] * k; py = g.lin[i + 1] * k; pz = g.lin[i + 2] * k;
        Lp[ol + i] = it.x_cm + px * c + pz * s; Lp[ol + i + 1] = py + an.y; Lp[ol + i + 2] = it.z_cm - px * s + pz * c; } ol += g.lin.length; });
    var gm = moveis.geometry; gm.dispose(); gm = new THREE.BufferGeometry(); gm.setAttribute("position", new THREE.BufferAttribute(P, 3)); gm.setAttribute("normal", new THREE.BufferAttribute(N, 3)); gm.setAttribute("color", new THREE.BufferAttribute(C, 3)); moveis.geometry = gm;
    var gl = contornos.geometry; gl.dispose(); gl = new THREE.BufferGeometry(); gl.setAttribute("position", new THREE.BufferAttribute(Lp, 3)); contornos.geometry = gl;
    Object.keys(cache).forEach(function (id) { if (!proj.itens.some(function (it) { return it.id === id; })) delete cache[id]; });
  }

  /* ---------- peças penduradas: silhuetas do guia extrudadas; face na cor da peça, borda em tinta (2 chamadas por silhueta) ---------- */
  var SIL = { "g-calca-reta": [[14, 2], [46, 2], [48, 102], [33, 102], [30, 30], [27, 102], [12, 102]], "g-calca-wide": [[15, 2], [45, 2], [56, 102], [34, 102], [30, 34], [26, 102], [4, 102]],
    "g-saia-longa": [[18, 2], [42, 2], [54, 102], [6, 102]], "g-blazer": [[18, 4], [30, 10], [42, 4], [54, 12], [50, 40], [44, 40], [45, 70], [15, 70], [16, 40], [10, 40], [6, 12]],
    "g-vestido": [[22, 2], [26, 14], [34, 14], [38, 2], [44, 6], [40, 26], [52, 102], [8, 102], [20, 26], [16, 6]], "g-camiseta": [[20, 4], [40, 4], [54, 14], [48, 26], [42, 22], [42, 60], [18, 60], [18, 22], [12, 26], [6, 14]] };
  var GEO = {};
  function geo(gl) { if (GEO[gl]) return GEO[gl]; var f = new THREE.ExtrudeGeometry(new THREE.Shape(SIL[gl].map(function (p) { return new THREE.Vector2((p[0] - 30) * .78, -p[1]); })), { depth: 1.1, bevelEnabled: false });
    f.rotateY(Math.PI / 2); f.translate(-.55, 0, 0); return (GEO[gl] = f); }
  function roupas() {
    var lista = {}, m4 = new THREE.Matrix4(), m = new THREE.Matrix4(), cor = new THREE.Color();
    proj.itens.forEach(function (it) { if (!M7.ARARAS[it.tipo]) return; var n = it.pecas.length, an = anim[it.id] || { y: 0, s: 1 };
      it.pecas.forEach(function (s, i) { var k = M7.sku(s), x, z = 0, ang = 0;
        if (it.tipo === "arara_circular") { var r = it.larg / 2 * .82, t = i / n * Math.PI * 2; x = r * Math.cos(t); z = r * Math.sin(t); ang = -(t + Math.PI / 2); }
        else { var L = it.larg - 10; x = -L / 2 + L * (i + .5) / n; }
        (lista[k.g] = lista[k.g] || []).push({ it: it, x: x, z: z, ang: ang, y: it.alt - 4 + an.y, k: an.s, cor: M7.CORES[k.cor].hex }); }); });
    Object.keys(SIL).forEach(function (gl) { var l = lista[gl] || [], r = roupa[gl];
      if (!r || r.cap < l.length) { if (r) { cena.remove(r); r.dispose(); } r = roupa[gl] = new THREE.InstancedMesh(geo(gl), [mPeca, mTinta], Math.max(32, Math.ceil(l.length * 1.5))); r.cap = r.count; cena.add(r); }
      l.forEach(function (p, i) { m4.makeTranslation(p.it.x_cm, 0, p.it.z_cm).multiply(m.makeRotationY(-p.it.rot * Math.PI / 180)).multiply(m.makeScale(p.k, p.k, p.k)).multiply(m.makeTranslation(p.x, p.y, p.z)).multiply(m.makeRotationY(p.ang));
        r.setMatrixAt(i, m4); r.setColorAt(i, cor.set(p.cor)); });
      r.count = l.length; r.visible = l.length > 0; r.instanceMatrix.needsUpdate = true; if (r.instanceColor) r.instanceColor.needsUpdate = true; });
  }

  /* ---------- chão de papel ponteado (textura feita aqui, 10 cm entre pontos) e linha de corte da área ---------- */
  function area(A) {
    var sig = [A.larg_cm, A.prof_cm, A.entrada.x_cm, A.entrada.larg_cm].join(); if (sig === sigArea) return; sigArea = sig;
    if (chao) { cena.remove(chao); chao.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    chao = new THREE.Group(); var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d");
    x.fillStyle = "#F7F7F4"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#B4BCC6"; for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 2.6, 0, 7); x.fill(); }
    var tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(A.larg_cm / 40, A.prof_cm / 40);
    var p = new THREE.Mesh(new THREE.PlaneGeometry(A.larg_cm, A.prof_cm), new THREE.MeshBasicMaterial({ map: tx })); p.rotation.x = -Math.PI / 2; p.position.set(A.larg_cm / 2, 0, A.prof_cm / 2); chao.add(p);
    var e = A.entrada, e0 = e.x_cm - e.larg_cm / 2, e1 = e.x_cm + e.larg_cm / 2, W = A.larg_cm, D = A.prof_cm;
    var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[e0, D], [0, D], [0, 0], [W, 0], [W, D], [e1, D]].map(function (q) { return new THREE.Vector3(q[0], .4, q[1]); })), new THREE.LineDashedMaterial({ color: TINTA, dashSize: 9, gapSize: 6 }));
    l.computeLineDistances(); chao.add(l);
    var en = new THREE.Mesh(new THREE.BoxGeometry(e.larg_cm, .6, 4), new THREE.MeshBasicMaterial({ color: 0x0B6E4F })); en.position.set(e.x_cm, .3, D); chao.add(en);
    cena.add(chao);
  }

  /* ---------- marcas da conferência: pontos de tamanho fixo na tela (1 chamada por forma); estado é forma ---------- */
  var TEX = {};
  function texMarca(s) { if (TEX[s]) return TEX[s]; var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"); x.lineJoin = "round";
    if (s === "erro") { x.fillStyle = "#fff"; x.strokeStyle = "#A3231B"; x.lineWidth = 10; x.beginPath(); x.moveTo(64, 10); x.lineTo(120, 116); x.lineTo(8, 116); x.closePath(); x.fill(); x.stroke(); x.fillStyle = "#A3231B"; x.fillRect(58, 44, 12, 40); x.beginPath(); x.arc(64, 98, 7, 0, 7); x.fill(); }
    else { x.fillStyle = "#fff"; x.strokeStyle = "#141414"; x.lineWidth = 9; x.setLineDash([18, 12]); x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fill(); x.stroke(); x.setLineDash([]); x.fillStyle = "#141414"; x.fillRect(58, 32, 12, 38); x.beginPath(); x.arc(64, 88, 7, 0, 7); x.fill(); }
    return (TEX[s] = new THREE.CanvasTexture(c)); }
  function marcar(achados) {
    var st = {}; achados.forEach(function (a) { if (a.status === "erro" || a.status === "atencao") a.itens.forEach(function (id) { if (!st[id] || a.status === "erro") st[id] = a.status; }); });
    ["erro", "atencao"].forEach(function (s) { if (marcas[s]) { cena.remove(marcas[s]); marcas[s].geometry.dispose(); }
      var pts = []; Object.keys(st).forEach(function (id) { var it = proj.itens.filter(function (x) { return x.id === id; })[0]; if (it && st[id] === s) pts.push(new THREE.Vector3(it.x_cm, it.alt + 30, it.z_cm)); });
      var p = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ map: texMarca(s), size: 30 * Math.min(window.devicePixelRatio || 1, 2), sizeAttenuation: false, transparent: true, alphaTest: .4, depthTest: false }));
      p.renderOrder = 9; p.visible = pts.length > 0; p.userData.n = pts.length; marcas[s] = p; cena.add(p); });
  }
  function tracarFio(rota) {
    if (fio) { cena.remove(fio); fio.dispose(); } var pts = [], m = new THREE.Matrix4(), vis = {};
    Object.keys(rota.chega).forEach(function (id) { var f = rota.chega[id]; if (f) for (var i = 1; i < f.length; i++) { var a = f[i - 1], b = f[i], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
      for (var t = 0; t <= n; t++) { var q = [Math.round((a[0] + (b[0] - a[0]) * t / n) / 7) * 7, Math.round((a[1] + (b[1] - a[1]) * t / n) / 7) * 7], key = q.join(); if (!vis[key]) { vis[key] = 1; pts.push(q); } } } });
    var g = new THREE.CircleGeometry(2.4, 10); g.rotateX(-Math.PI / 2); fio = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x0B6E4F }), Math.max(1, pts.length));
    pts.forEach(function (p, i) { fio.setMatrixAt(i, m.makeTranslation(p[0], .7, p[1])); }); fio.count = pts.length; cena.add(fio);
  }

  /* ---------- alças do item escolhido: largura (+x), profundidade (+z), altura (topo) ---------- */
  var ALCA = new THREE.BoxGeometry(9, 9, 9), mAlca = new THREE.MeshBasicMaterial({ color: 0x0B6E4F });
  function posAlcas(it) {
    if (!alcas) { alcas = new THREE.InstancedMesh(ALCA, mAlca, 3); alcas.renderOrder = 8; cena.add(alcas); }
    alcas.visible = !!it; if (!it) return; var a = -it.rot * Math.PI / 180, m = new THREE.Matrix4(), base = new THREE.Matrix4().makeTranslation(it.x_cm, 0, it.z_cm).multiply(new THREE.Matrix4().makeRotationY(a));
    [[it.larg / 2 + 10, it.alt / 2, 0], [0, it.alt / 2, it.prof / 2 + 10], [0, it.alt + 10, 0]].forEach(function (p, i) { alcas.setMatrixAt(i, base.clone().multiply(m.makeTranslation(p[0], p[1], p[2]))); });
    alcas.instanceMatrix.needsUpdate = true;
  }

  /* ---------- sincroniza com o projeto ---------- */
  function sync(p, s, achados, rota) {
    proj = p; sel = s; area(p.area); compor(); roupas();
    if (selG) { cena.remove(selG); selG.geometry.dispose(); selG = null; }
    var it = p.itens.filter(function (x) { return x.id === s; })[0];
    if (it) { var w = it.larg / 2 + 8, d = it.prof / 2 + 8; selG = new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-w, -d], [w, -d], [w, d], [-w, d], [-w, -d]].map(function (q) { return new THREE.Vector3(q[0], .9, q[1]); })), new THREE.LineDashedMaterial({ color: 0x0B6E4F, dashSize: 7, gapSize: 5 }));
      selG.computeLineDistances(); selG.position.set(it.x_cm, 0, it.z_cm); selG.rotation.y = -it.rot * Math.PI / 180; cena.add(selG); }
    posAlcas(document.body.clientWidth >= 720 ? it : null);
    if (achados) { marcar(achados); if (rota) tracarFio(rota); }
    pedir();
  }

  /* ---------- desenhar sob demanda; parada, 1 quadro em 2× (traço liso, sem MSAA); em movimento, a resolução da tela ---------- */
  var medindo = false, ultimo = 0, tPolir = 0, dpr = window.devicePixelRatio || 1, PR_ALTA = 2, PR_MOV = Math.min(dpr, 1.5);
  function aplicarPR(pr) { if (R.getPixelRatio() === pr) return; var p = cv.parentNode; R.setPixelRatio(pr); R.setSize(p.clientWidth, p.clientHeight, false); }
  function pedir() { if (sujo || medindo) return; sujo = true; var agora = performance.now(), mov = agora - ultimo < 300; ultimo = agora;
    requestAnimationFrame(function () { sujo = false; if (medindo) return; aplicarPR(mov ? PR_MOV : PR_ALTA); R.render(cena, cam); clearTimeout(tPolir);
      if (mov) tPolir = setTimeout(function () { if (medindo) return; aplicarPR(PR_ALTA); R.render(cena, cam); }, 260); }); }
  function medirTela() { var p = cv.parentNode, w = p.clientWidth, h = p.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); pedir(); }
  function enquadrar() { var A = proj ? proj.area : { larg_cm: 600, prof_cm: 450 }, W = A.larg_cm, D = A.prof_cm, d = Math.max(W, D) * 1.25;
    ctl.target.set(W / 2, 40, D / 2); cam.position.set(W / 2 + d * .32, d * .78, D / 2 + d * .95); ctl.update(); pedir(); }
  function focar(id) { var it = proj.itens.filter(function (x) { return x.id === id; })[0]; if (!it) return;
    var dir = cam.position.clone().sub(ctl.target).normalize(), dist = Math.max(260, Math.max(it.larg, it.alt) * 2.6), alvo = new THREE.Vector3(it.x_cm, it.alt / 2, it.z_cm), pos = alvo.clone().add(dir.multiplyScalar(dist));
    gsap.to(ctl.target, { x: alvo.x, y: alvo.y, z: alvo.z, duration: .7, ease: "power3.inOut", onUpdate: function () { ctl.update(); pedir(); } });
    gsap.to(cam.position, { x: pos.x, y: Math.max(pos.y, it.alt + 60), z: pos.z, duration: .7, ease: "power3.inOut", onUpdate: function () { ctl.update(); pedir(); } }); }
  /* animação de entrada (linha do tempo da sugestão): o item cai do alto e assenta */
  function animar(id, de) { var a = anim[id] = { y: de.y || 0, s: de.s === undefined ? 1 : de.s }; return a; }
  function recompor() { if (proj) { compor(); roupas(); pedir(); } }

  /* ---------- toque e clique: raio contra a caixa de cada item, no espaço do item ---------- */
  function raio(x, y) { var r = cv.getBoundingClientRect(); if (x < r.left || y < r.top || x > r.right || y > r.bottom) return null;
    ray.setFromCamera({ x: (x - r.left) / r.width * 2 - 1, y: -(y - r.top) / r.height * 2 + 1 }, cam); return ray; }
  function itemEm(x, y) { var r = raio(x, y); if (!r || !proj) return null; var melhor = null, dmin = Infinity, inv = new THREE.Matrix4(), o = new THREE.Ray(), b = new THREE.Box3(), p = new THREE.Vector3();
    proj.itens.forEach(function (it) { inv.makeTranslation(it.x_cm, 0, it.z_cm).multiply(new THREE.Matrix4().makeRotationY(-it.rot * Math.PI / 180)).invert(); o.copy(r.ray).applyMatrix4(inv);
      b.min.set(-it.larg / 2, 0, -it.prof / 2); b.max.set(it.larg / 2, Math.max(it.alt, 20), it.prof / 2); if (o.intersectBox(b, p)) { var d = p.applyMatrix4(inv.clone().invert()).distanceTo(r.ray.origin); if (d < dmin) { dmin = d; melhor = it.id; } } });
    return melhor; }
  function alcaEm(x, y) { if (!alcas || !alcas.visible) return -1; var r = raio(x, y); if (!r) return -1; var h = r.intersectObject(alcas)[0]; return h ? h.instanceId : -1; }
  function noPlano(x, y, plano) { var r = raio(x, y), p = new THREE.Vector3(); return r && r.ray.intersectPlane(plano, p) ? p : null; }
  var CHAO = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function init(el, callbacks) {
    cv = el; cb = callbacks;
    R = new THREE.WebGLRenderer({ canvas: cv, antialias: false }); R.setPixelRatio(PR_ALTA); R.setClearColor(0xF4F5F6);
    cena = new THREE.Scene(); cena.add(new THREE.AmbientLight(0xffffff, .86)); var luz = new THREE.DirectionalLight(0xffffff, .22); luz.position.set(.5, 1, .8); cena.add(luz);
    moveis = new THREE.Mesh(new THREE.BufferGeometry(), mVert); contornos = new THREE.LineSegments(new THREE.BufferGeometry(), mLinha); cena.add(moveis, contornos);
    cam = new THREE.PerspectiveCamera(32, 1, 10, 30000);
    /* arrastar item ou alça: raio da câmera até o plano (o Draggable do GSAP move DOM, não sabe do raio). Registrado antes do OrbitControls para pará-lo. */
    cv.addEventListener("pointerdown", function (e) { if (document.body.clientWidth < 720) return;
      var a = alcaEm(e.clientX, e.clientY), id = a >= 0 ? sel : itemEm(e.clientX, e.clientY);
      arr = { id: id, alca: a, x0: e.clientX, y0: e.clientY, foi: false, pid: e.pointerId };
      if (!id) return; ctl.enabled = false; try { cv.setPointerCapture(e.pointerId); } catch (x) { } var it = proj.itens.filter(function (x) { return x.id === id; })[0], p = noPlano(e.clientX, e.clientY, CHAO);
      arr.dx = p ? it.x_cm - p.x : 0; arr.dz = p ? it.z_cm - p.z : 0;
      if (a === 2) { var n = cam.position.clone().sub(new THREE.Vector3(it.x_cm, 0, it.z_cm)); n.y = 0; n.normalize(); arr.plano = new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(it.x_cm, 0, it.z_cm)); }
      if (a < 0) cb.selecionar(id); });
    cv.addEventListener("pointermove", function (e) { if (!arr || !arr.id || e.pointerId !== arr.pid) return;
      if (!arr.foi) { if (Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 4) return; arr.foi = true; cb.inicioArrasto(); }
      var it = proj.itens.filter(function (x) { return x.id === arr.id; })[0];
      if (arr.alca === 2) { var q = noPlano(e.clientX, e.clientY, arr.plano); if (q) cb.medidaViva(arr.id, "alt", q.y - 10); return; }
      var p = noPlano(e.clientX, e.clientY, CHAO); if (!p) return;
      if (arr.alca >= 0) { var a = it.rot * Math.PI / 180, dx = p.x - it.x_cm, dz = p.z - it.z_cm, lx = dx * Math.cos(a) + dz * Math.sin(a), lz = -dx * Math.sin(a) + dz * Math.cos(a);
        cb.medidaViva(arr.id, arr.alca === 0 ? "larg" : "prof", 2 * ((arr.alca === 0 ? Math.abs(lx) : Math.abs(lz)) - 10)); return; }
      cb.arrastando(arr.id, p.x + arr.dx, p.z + arr.dz); });
    var fim = function (e) { if (!arr || e.pointerId !== arr.pid) return; var a = arr; arr = null; ctl.enabled = true;
      if (a.id && a.foi) cb.fimArrasto(a.id); else if (!a.id && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 4) cb.selecionar(null); };
    cv.addEventListener("pointerup", fim); cv.addEventListener("pointercancel", fim);
    ctl = new THREE.OrbitControls(cam, cv); ctl.maxPolarAngle = Math.PI * .47; ctl.minDistance = 80; ctl.maxDistance = 8000; ctl.screenSpacePanning = true; ctl.addEventListener("change", pedir);
    if (window.ResizeObserver) new ResizeObserver(medirTela).observe(cv.parentNode); else window.addEventListener("resize", medirTela);
    medirTela();
  }
  /* #estresse: gira a câmera sem parar por N segundos e mede quadro a quadro; depois confere que parada não desenha */
  /* Dev1 r2: além do fps, mede o custo de JS por quadro (atualizar + mandar desenhar) e repete com 1/4 dos pixels.
     Se o fps sobe muito com menos pixels e o JS fica pequeno, o gargalo é rasterizar (o que a GPU faz), não o código. */
  function fase(seg, pr, pronto) { var t0 = performance.now(), ant = t0, dts = [], js = [], calls = 0, tri = 0; aplicarPR(pr);
    (function q() { var t = performance.now(); if (t !== ant) dts.push(t - ant); ant = t; ctl.update(); R.render(cena, cam); js.push(performance.now() - t); calls = Math.max(calls, R.info.render.calls); tri = R.info.render.triangles;
      if (t - t0 < seg * 1000) return requestAnimationFrame(q);
      var fps = dts.slice(1).map(function (d) { return 1000 / d; }).sort(function (a, b) { return a - b; }), jo = js.slice(1).sort(function (a, b) { return a - b; });
      pronto({ quadros: dts.length, media: Math.round(dts.length / ((t - t0) / 1000) * 10) / 10, p5: Math.round(fps[Math.floor(fps.length * .05)] * 10) / 10, chamadas: calls, triangulos: tri, px: R.domElement.width + "×" + R.domElement.height,
        jsMed: Math.round(jo[Math.floor(jo.length / 2)] * 10) / 10, jsP95: Math.round(jo[Math.floor(jo.length * .95)] * 10) / 10 }); })(); }
  function medir(seg, pronto) { ctl.autoRotate = true; ctl.autoRotateSpeed = 6; medindo = true; clearTimeout(tPolir);
    fase(seg, PR_MOV, function (res) { fase(Math.max(2, seg / 2), PR_MOV / 2, function (q) { res.quarto = q;
      ctl.autoRotate = false; medindo = false; ultimo = 0; var f0 = R.info.render.frame;
      setTimeout(function () { res.paradoQuadros = R.info.render.frame - f0 - 1; pronto(res); }, 3000); pedir(); }); }); }
  function contagem() { var p = 0; Object.keys(roupa).forEach(function (k) { p += roupa[k].count; });
    return { itens: proj ? proj.itens.length : 0, penduradas: p, marcas: (marcas.erro ? marcas.erro.userData.n : 0) + (marcas.atencao ? marcas.atencao.userData.n : 0), fio: fio ? fio.count : 0, vertices: moveis.geometry.attributes.position ? moveis.geometry.attributes.position.count : 0, chamadas: R.info.render.calls, quadros: R.info.render.frame }; }
  function gpu() { var gl = R.getContext(), x = gl.getExtension("WEBGL_debug_renderer_info"); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : "desconhecida"; }
  function quadro() { R.render(cena, cam); return R.info.render.calls; }
  return { gpu: gpu, quadro: quadro, init: init, sync: sync, focar: focar, itemEm: itemEm, enquadrar: enquadrar, medirTela: medirTela, medir: medir, contagem: contagem, animar: animar, recompor: recompor, pedir: pedir,
    camera: function () { return cam; }, controles: function () { return ctl; }, telaPara: function (x, y, z) { var v = new THREE.Vector3(x, y, z).project(cam), c = cv.getBoundingClientRect(); return { x: c.left + (v.x + 1) / 2 * c.width, y: c.top + (1 - v.y) / 2 * c.height }; } };
})();
