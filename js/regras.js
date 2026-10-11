/* Mindse7 · simulador · geometria, rota e validador (9 regras + nota). Funções puras: o #teste e a tela chamam as mesmas. */
var M7 = window.M7 || (window.M7 = {});

/* ---------- geometria no chão (cm) ---------- */
M7.cantos = function (it) {
  var a = it.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), w = it.larg / 2, d = it.prof / 2;
  return [[-w, -d], [w, -d], [w, d], [-w, d]].map(function (p) { return [it.x_cm + p[0] * c - p[1] * s, it.z_cm + p[0] * s + p[1] * c]; });
};
function segDist(px, pz, a, b) {
  var dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2)) : 0;
  return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz);
}
function dentro(px, pz, P) { var s = 0; for (var i = 0; i < 4; i++) { var a = P[i], b = P[(i + 1) % 4], c = (b[0] - a[0]) * (pz - a[1]) - (b[1] - a[1]) * (px - a[0]); if (c > 1e-9) s |= 1; else if (c < -1e-9) s |= 2; } return s !== 3; }
M7.distPonto = function (px, pz, P) { if (dentro(px, pz, P)) return 0; var d = Infinity; for (var i = 0; i < 4; i++) d = Math.min(d, segDist(px, pz, P[i], P[(i + 1) % 4])); return d; };
M7.pertoDe = function (px, pz, P) { /* ponto do retângulo mais perto de (px, pz): [x, z, distância]; dentro = distância 0 */
  if (dentro(px, pz, P)) return [px, pz, 0]; var best = [px, pz, Infinity];
  for (var i = 0; i < 4; i++) { var a = P[i], b = P[(i + 1) % 4], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2)) : 0,
    qx = a[0] + t * dx, qz = a[1] + t * dz, d = Math.hypot(px - qx, pz - qz); if (d < best[2]) best = [qx, qz, d]; }
  return best; };
function proj(P, ax) { var mn = Infinity, mx = -Infinity; P.forEach(function (p) { var v = p[0] * ax[0] + p[1] * ax[1]; mn = Math.min(mn, v); mx = Math.max(mx, v); }); return [mn, mx]; }
M7.sobrepoe = function (A, B) {
  var ax = [];
  [A, B].forEach(function (P) { for (var i = 0; i < 2; i++) { var dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dz) || 1; ax.push([-dz / l, dx / l]); } });
  return ax.every(function (a) { var p = proj(A, a), q = proj(B, a); return p[1] > q[0] + 0.5 && q[1] > p[0] + 0.5; });
};
M7.folga = function (i1, i2) {
  var A = M7.cantos(i1), B = M7.cantos(i2); if (M7.sobrepoe(A, B)) return 0;
  var d = Infinity; A.forEach(function (p) { d = Math.min(d, M7.distPonto(p[0], p[1], B)); }); B.forEach(function (p) { d = Math.min(d, M7.distPonto(p[0], p[1], A)); });
  return Math.round(d * 10) / 10;
};
M7.ocupa = function (it) { return M7.TIPOS[it.tipo].obstaculo !== false; };
M7.interno = function (it) { return [it.larg - 8, it.prof - 4]; }; /* provador por dentro: paredes de 4 cm; a frente é a cortina (a sugestão usa a mesma conta) */

/* ---------- fontes: URL + data de acesso + força. O nível manda no status máximo: lei, física e média (regra de VM já validada no guia, pedido) → erro; fraca → recomendação ---------- */
M7.FONTES = {
  rota: { nivel: "lei", texto: "ABNT NBR 9050:2015, 10.17.1 (locais de comércio): \"A largura livre nos corredores de compras deve ser de no mínimo 0,90 m de largura e, a cada 10 m, deve haver um espaço para manobra da cadeira de rodas.\" A Emenda 1/2020 não altera o 10.17.",
    url: "https://www.cnmp.mp.br/portal/images/Comissoes/DireitosFundamentais/Acessibilidade/ABNT_NBR_9050_2015.pdf", acesso: "2026-10-10",
    forca: "Norma obrigatória por lei: Decreto 5.296/2004, art. 13, § 1º, e Lei 13.146/2015, art. 57 (planalto.gov.br). Texto integral da norma em cópia do CNMP (pág. 137)." },
  publico: { nivel: "fraca", texto: "ABNT NBR 9050:2015, 6.11.1 c): 1,50 m para corredores de uso público; 3.1.37: uso público inclui propriedade privada aberta ao público. Se o 10.17.1 (corredor de compras, 0,90 m) afasta o 6.11.1 c) no salão, nenhuma fonte oficial resolve.",
    url: "https://www.cnmp.mp.br/portal/images/Comissoes/DireitosFundamentais/Acessibilidade/ABNT_NBR_9050_2015.pdf", acesso: "2026-10-10", forca: "Recomendação: conflito entre dois itens da norma sem interpretação oficial." },
  provador: { nivel: "lei", texto: "ABNT NBR 9050:2015, 10.17.2: havendo provadores, \"pelo menos um deve ser acessível\", com entrada de 0,80 m e \"dimensões mínimas internas de 1,20 m por 1,20 m\".",
    url: "https://www.cnmp.mp.br/portal/images/Comissoes/DireitosFundamentais/Acessibilidade/ABNT_NBR_9050_2015.pdf", acesso: "2026-10-10", forca: "Norma obrigatória por lei (Decreto 5.296/2004, art. 13, § 1º); cópia integral no CNMP." },
  porta: { nivel: "lei", texto: "ABNT NBR 9050:2015/Em1:2020, 6.11.2.1: vão livre de porta \"maior ou igual a 0,80 m\".",
    url: "https://canoas.rs.gov.br/norma-abnt-nbr-9050-2015-emenda-1-2020", acesso: "2026-10-10", forca: "Norma obrigatória por lei (Decreto 5.296/2004, art. 13, § 1º); texto da Emenda 1 hospedado por prefeitura." },
  giro: { nivel: "fraca", texto: "NBR 9050, 4.3.4: giro de 360° pede círculo de 1,50 m. Aplicar isso na frente do provador é inferência, não item da norma.",
    url: "https://depi.unicamp.br/wp-content/uploads/sites/59/2022/01/acessibilidade-nbr9050.pdf", acesso: "2026-10-10", forca: "Recomendação: o número é da norma; o lugar (frente do provador) é inferido." },
  densidade: { nivel: "fraca", texto: "Faixa de 16, 20 ou 25 peças por metro de trilho (capacidade declarada de fabricante e fornecedores), a do guia final.",
    url: "casos/2026-10-10-mindse7-vm/guia/index.html, seção da arara", acesso: "2026-10-10", forca: "Fraca: fornecedor, não manual de varejo." },
  ordem: { nivel: "media", texto: "CottonWorks, Parte 6: \"classifications… left to right\", \"small to large, light to dark\"; Confluence Running (16/01/2025): do menor ao maior.",
    url: "https://cottonworks.com/wp-content/uploads/2024/10/Part_6.pdf", acesso: "2026-10-10", forca: "Média: material de treinamento de VM (Cotton Incorporated), não norma." },
  olhos: { nivel: "fraca", texto: "Altura dos olhos de 1,10 a 1,60 m (Studio Matrx, faixa \"ilustrativa\"); um ponto focal por zona (guia, Tira 02).",
    url: "https://www.studiomatrx.org/students/retail-and-store-design/fixtures-and-fittings", acesso: "2026-10-10", forca: "Fraca: faixa ilustrativa de material didático." },
  look: { nivel: "media", texto: "CottonWorks, Parte 6: o manequim e o 1º cabide mostram \"the total ensemble\". 3ª peça e mesmo tamanho (P = 36): proposta do guia.",
    url: "https://cottonworks.com/wp-content/uploads/2024/10/Part_6.pdf", acesso: "2026-10-10", forca: "Média para o look completo; a 3ª peça e o P = 36 são proposta do guia (recomendação)." },
  vitrine: { nivel: "fraca", texto: "\"If you think you need 12 pieces, try 8\" (KROFT, blog de fornecedor, sem data, sobre arara de vitrine).",
    url: "https://www.kroft.co/blogs/hanging-out/visual-merchandisers-secret-weapon-window-clothing-racks", acesso: "2026-10-10", forca: "Fraca: blog de fornecedor." }
};
M7.TETO = { lei: "erro", fisica: "erro", media: "erro", fraca: "recomendacao" }; /* erro: lei, física ou regra do guia já validada (fonte média); fonte fraca: recomendação */
M7.LIMIAR = { rota_min_cm: 90, manobra_cm: 120, manobra_cada: 1000, largo_publico: 150, provador_int: 120, porta_min_cm: 80, grade_cm: 5, faixa_min_m: 16, faixa_max_m: 25, olho_min: 110, olho_max: 160, vitrine_max: 8 };
M7.rotulo = function (it) { return M7.TIPOS[it.tipo].nome + " " + it.id.replace("i", "#"); };
/* corrige: o que um clique faz ({k: "ordenar" | "medida" | "cortar", id, ...}); só quando existe uma correção objetiva */
function achado(regra, status, itens, msg, fonte, local, corrige) { return { regra: regra, status: status, itens: itens, msg: msg, fonte: fonte, local: local || null, corrige: corrige || null }; }
function teto(F, s) { return s === "erro" && F ? M7.TETO[F.nivel] : s; } /* nenhum status passa do que a fonte sustenta */

/* ---------- rota: grade de 5 cm; um ponto é livre a r cm de tudo (r = 45 = meia passagem de 90 cm).
   Dijkstra com pedágio nos pontos estreitos (sem folga de 60 ou de 75 cm): o caminho prefere o corredor largo,
   e o trecho estreito que sobra é medido em cm (a norma pede largura conforme a extensão). ---------- */
M7.naFrente = function (it, x, z) {
  if (!M7.TIPOS[it.tipo].frente) return true;
  var a = -it.rot * Math.PI / 180, dx = x - it.x_cm, dz = z - it.z_cm, lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
  return lz >= it.prof / 2 - 1e-6 && Math.abs(lx) <= it.larg / 2 + 1e-6;
};
M7.rota = function (proj) {
  var A = proj.area, h = M7.LIMIAR.grade_cm, nx = Math.floor(A.larg_cm / h) + 1, nz = Math.floor(A.prof_cm / h) + 1, N = nx * nz;
  var e = A.entrada, e0 = e.x_cm - e.larg_cm / 2, e1 = e.x_cm + e.larg_cm / 2, polys = {}, obst = proj.itens.filter(M7.ocupa);
  proj.itens.forEach(function (it) { polys[it.id] = M7.cantos(it); });
  /* folga de cada ponto até os dois obstáculos mais próximos (a menos de 75 cm); paredes laterais e do fundo contam, a frente não (ali é a porta) */
  var L = M7.LIMIAR, R = L.largo_publico / 2, d1 = new Float64Array(N).fill(Infinity), i1 = new Array(N), d2 = new Float64Array(N).fill(Infinity);
  function poe2(c, id, d) { if (id === i1[c]) { if (d < d1[c]) d1[c] = d; return; } if (d < d1[c]) { d2[c] = d1[c]; d1[c] = d; i1[c] = id; } else if (d < d2[c]) d2[c] = d; }
  obst.forEach(function (it) { var P = polys[it.id], xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; });
    for (var j = Math.max(0, Math.floor((Math.min.apply(0, zs) - R) / h)); j <= Math.min(nz - 1, Math.ceil((Math.max.apply(0, zs) + R) / h)); j++)
      for (var i = Math.max(0, Math.floor((Math.min.apply(0, xs) - R) / h)); i <= Math.min(nx - 1, Math.ceil((Math.max.apply(0, xs) + R) / h)); i++) { var d = M7.distPonto(i * h, j * h, P); if (d < R) poe2(j * nx + i, it.id, d); } });
  for (var jj = 0; jj < nz; jj++) for (var ii = 0; ii < nx; ii++) { var cc = jj * nx + ii, dw = Math.min(ii * h, A.larg_cm - ii * h, jj * h); if (dw < R) poe2(cc, "@parede", dw); }
  /* largura do corredor (Dev1 r2): soma das distâncias a 2 obstáculos em lados OPOSTOS (ângulo > 120°).
     Parede ou móvel de um lado só não é corredor; a quina (2 paredes a 90°) também não; a frente (entrada) não conta. */
  var W2 = L.largo_publico, viz = {}, caixa = {}; /* calculado só nos pontos dos caminhos, sob demanda */
  obst.forEach(function (it) { var P = polys[it.id], xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; }); caixa[it.id] = [Math.min.apply(0, xs), Math.max.apply(0, xs), Math.min.apply(0, zs), Math.max.apply(0, zs)]; });
  function vizinhos(c) { if (viz[c]) return viz[c]; var x = (c % nx) * h, z = Math.floor(c / nx) * h, l = [];
    obst.forEach(function (it) { var b = caixa[it.id]; if (x < b[0] - W2 || x > b[1] + W2 || z < b[2] - W2 || z > b[3] + W2) return; var q = M7.pertoDe(x, z, polys[it.id]); if (q[2] > 0 && q[2] < W2) l.push([it.id, q[2], (q[0] - x) / q[2], (q[1] - z) / q[2]]); });
    if (x < W2) l.push(["@esq", x, -1, 0]); if (A.larg_cm - x < W2) l.push(["@dir", A.larg_cm - x, 1, 0]); if (z < W2) l.push(["@fundo", z, 0, -1]);
    return (viz[c] = l); }
  function largura(c, alvo) { var l = vizinhos(c), mn = Infinity;
    for (var a = 0; a < l.length; a++) if (l[a][0] !== alvo) for (var o = a + 1; o < l.length; o++)
      if (l[o][0] !== alvo && l[a][2] * l[o][2] + l[a][3] * l[o][3] < -.5) mn = Math.min(mn, l[a][1] + l[o][1]);
    return mn; }
  function grade(r) { /* ponto bloqueado: a menos de r de um obstáculo, de uma parede lateral/do fundo, ou da frente fora do vão da entrada */
    var b = new Uint8Array(N);
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) { var c = j * nx + i, x = i * h, z = j * h; if (d1[c] < r - 1e-6 || (!(x >= e0 && x <= e1) && z > A.prof_cm - r + 1e-6)) b[c] = 1; }
    return b;
  }
  var b90 = grade(L.rota_min_cm / 2), b120 = grade(L.manobra_cm / 2), b150 = grade(L.largo_publico / 2);
  var pai = new Int32Array(N).fill(-2), dist = new Float64Array(N).fill(Infinity), heap = [], entrou = 0, k, i;
  function sobe(i) { while (i) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
  function desce() { var i = 0, n = heap.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && heap[l][0] < heap[m][0]) m = l; if (r < n && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } }
  for (i = Math.ceil(e0 / h); i <= Math.floor(e1 / h); i++) { k = (nz - 1) * nx + i; if (!b90[k]) { dist[k] = Math.abs(i * h - e.x_cm) / h * .01; pai[k] = -1; heap.push([dist[k], k]); sobe(heap.length - 1); entrou++; } }
  while (heap.length) {
    var top = heap[0], ult = heap.pop(); if (heap.length) { heap[0] = ult; desce(); } k = top[1]; if (top[0] > dist[k]) continue;
    var ci = k % nx, cj = (k - ci) / nx;
    for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
      var ni = ci + di, nj = cj + dj, n = nj * nx + ni; if (!(di || dj) || ni < 0 || nj < 0 || ni >= nx || nj >= nz || b90[n]) continue;
      var nd = dist[k] + (di && dj ? 1.4142 : 1) * (1 + 6 * b120[n] + 2 * b150[n]);
      if (nd < dist[n]) { dist[n] = nd; pai[n] = k; heap.push([nd, n]); sobe(heap.length - 1); }
    }
  }
  function livre(x, z) { var i = Math.round(x / h), j = Math.round(z / h); return i >= 0 && j >= 0 && i < nx && j < nz && !b90[j * nx + i]; }
  function ve(a, b) { var l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(l / (h / 2)); for (var t = 1; t < n; t++) if (!livre(a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n)) return false; return true; }
  function puxar(f) { if (f.length < 3) return f; var out = [f[0]], i = 0; while (i < f.length - 1) { var j = f.length - 1; while (j > i + 1 && !ve(f[i], f[j])) j--; out.push(f[j]); i = j; } return out; }
  function folga(c, alvo) { return i1[c] === alvo ? d2[c] : d1[c]; } /* a folga sem contar o próprio destino */
  var chega = {}, trechos = {};
  proj.itens.forEach(function (it) {
    if (!M7.TIPOS[it.tipo].alvo) return;
    var P = polys[it.id], melhor = -1, ordem = Infinity, xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; }), m = L.rota_min_cm / 2 + 15;
    for (var j = Math.max(0, Math.floor((Math.min.apply(0, zs) - m) / h)); j <= Math.min(nz - 1, Math.ceil((Math.max.apply(0, zs) + m) / h)); j++)
      for (var i = Math.max(0, Math.floor((Math.min.apply(0, xs) - m) / h)); i <= Math.min(nx - 1, Math.ceil((Math.max.apply(0, xs) + m) / h)); i++) {
        var kk = j * nx + i; if (pai[kk] !== -2 && dist[kk] < ordem && M7.distPonto(i * h, j * h, P) <= m && M7.naFrente(it, i * h, j * h)) { ordem = dist[kk]; melhor = kk; } }
    var f = [], run1 = 0, run2 = 0, max1 = 0, max2 = 0, ant = null, minL = Infinity;
    for (var c = melhor; c >= 0; c = pai[c]) { f.push([(c % nx) * h, Math.floor(c / nx) * h]);
      var passo = ant === null ? 0 : (Math.abs(ant - c) === 1 || Math.abs(ant - c) === nx ? h : h * 1.4142); ant = c;
      var fo = folga(c, it.id), lg = largura(c, null); /* o destino conta: o corredor de compras é o espaço entre os expositores */ minL = Math.min(minL, lg);
      run1 = fo < L.manobra_cm / 2 ? run1 + passo : 0; run2 = lg < W2 ? run2 + passo : 0; max1 = Math.max(max1, run1); max2 = Math.max(max2, run2); }
    chega[it.id] = melhor >= 0 ? puxar(f.reverse()) : null;
    /* maior trecho seguido sem 1,20 m de folga (manobra); maior trecho de corredor com menos de 1,50 m entre lados opostos e a largura mínima; folga onde a pessoa para */
    trechos[it.id] = { semManobra: Math.round(max1), estreito150: Math.round(max2), largMin: minL === Infinity ? null : Math.round(minL), fim: melhor >= 0 ? Math.min(R, folga(melhor, it.id)) : 0 };
  });
  return { chega: chega, trechos: trechos, entra: entrou > 0 };
};

function quemFecha(proj, it) {
  var A = proj.area, L = M7.LIMIAR.rota_min_cm, zona = it, out = [];
  if (M7.TIPOS[it.tipo].frente) { var a = it.rot * Math.PI / 180, o = it.prof / 2 + L / 2;
    zona = { x_cm: it.x_cm - o * Math.sin(a), z_cm: it.z_cm + o * Math.cos(a), rot: it.rot, larg: it.larg, prof: L }; }
  var perto = function (o) { return zona === it ? M7.folga(it, o) < L : M7.sobrepoe(M7.cantos(zona), M7.cantos(o)); };
  proj.itens.forEach(function (o) { if (o.id !== it.id && M7.ocupa(o) && perto(o)) out.push({ id: o.id, nome: M7.rotulo(o), cm: M7.folga(it, o) }); });
  var P = M7.cantos(zona === it ? it : zona), m = zona === it ? L : 0;
  [["parede da esquerda", function (p) { return p[0]; }], ["parede da direita", function (p) { return A.larg_cm - p[0]; }], ["fundo", function (p) { return p[1]; }], ["frente da área", function (p) { return A.prof_cm - p[1]; }]].forEach(function (w) {
    if (it.tipo === "porta") return; var g = Math.min.apply(0, P.map(w[1])); if (g < m || g < 0) out.push({ id: null, nome: w[0], cm: Math.max(0, Math.round(Math.min.apply(0, M7.cantos(it).map(w[1])))) });
  });
  return out.sort(function (a, b) { return a.cm - b.cm; });
}
function cm(n) { return n <= 0 ? "encostado" : Math.round(n) + " cm"; }
function m(n) { return (n / 100).toFixed(2).replace(".", ","); }
var ACESSO = { provador: 1, porta: 1 }; /* esses dois são da regra 9 */

/* rota sem caminho de 90 cm: erro de lei, com quem fecha */
function semCaminho(proj, r, alvos, regra, F) {
  var out = [], A = proj.area;
  if (!r.entra) { var e = A.entrada, boca = { x_cm: e.x_cm, z_cm: A.prof_cm - 45, rot: 0, larg: e.larg_cm, prof: 90 }, na = proj.itens.filter(function (it) { return M7.ocupa(it) && M7.sobrepoe(M7.cantos(boca), M7.cantos(it)); });
    if (regra === "circulacao") out.push(achado(regra, "erro", na.map(function (it) { return it.id; }), "A entrada está fechada: não sobra caminho de 90 cm para dentro." + (na.length ? " Na boca da entrada: " + na.map(M7.rotulo).join(", ") + "." : ""), F, { x: e.x_cm, z: A.prof_cm }));
    return out; }
  alvos.filter(function (it) { return !r.chega[it.id]; }).forEach(function (it) {
    var f = quemFecha(proj, it), nomes = f.slice(0, 3).map(function (v) { return v.nome + " (" + cm(v.cm) + ")"; }).join(", ");
    out.push(achado(regra, "erro", [it.id].concat(f.filter(function (v) { return v.id; }).map(function (v) { return v.id; })),
      "Da entrada até " + M7.rotulo(it) + (M7.TIPOS[it.tipo].frente ? " (pela frente)" : "") + " não há caminho de 90 cm." + (nomes ? " Fecham o acesso: " + nomes + "." : ""), F, { x: it.x_cm, z: it.z_cm }));
  });
  return out;
}
function extensao(r, alvos, regra, F) { /* 10.17.1: a cada 10 m de corredor, um espaço de manobra (90° = 1,20 × 1,20 m, NBR 4.3.4) */
  var L = M7.LIMIAR, out = [];
  alvos.forEach(function (it) { var t = r.trechos[it.id]; if (!r.chega[it.id] || !t) return;
    if (t.semManobra > L.manobra_cada) out.push(achado(regra, "erro", [it.id], "Até " + M7.rotulo(it) + " há " + m(t.semManobra) + " m de corredor sem um espaço de 1,20 m para manobrar a cadeira de rodas. A norma pede um a cada 10 m.", F, { x: it.x_cm, z: it.z_cm })); });
  return out;
}

/* ---------- 1 · circulação livre até cada item (lei) + erros físicos ---------- */
M7.regraCirculacao = function (proj, r) {
  var F = M7.FONTES.rota, out = [], its = proj.itens, A = proj.area;
  for (var i = 0; i < its.length; i++) {
    var P = M7.cantos(its[i]);
    if (P.some(function (p) { return p[0] < -0.5 || p[1] < -0.5 || p[0] > A.larg_cm + 0.5 || p[1] > A.prof_cm + 0.5; }))
      out.push(achado("circulacao", "erro", [its[i].id], M7.rotulo(its[i]) + " passa do limite da área: traga para dentro.", null));
    for (var j = i + 1; j < its.length; j++) if (M7.ocupa(its[i]) && M7.ocupa(its[j]) && M7.sobrepoe(P, M7.cantos(its[j])))
      out.push(achado("circulacao", "erro", [its[i].id, its[j].id], M7.rotulo(its[i]) + " e " + M7.rotulo(its[j]) + " ocupam o mesmo chão: não dá para montar assim.", null));
  }
  var fora = out.filter(function (a) { return a.itens.length === 1; }).map(function (a) { return a.itens[0]; });
  var alvos = its.filter(function (it) { return M7.TIPOS[it.tipo].alvo && !ACESSO[it.tipo] && fora.indexOf(it.id) < 0; });
  out = out.concat(semCaminho(proj, r, alvos, "circulacao", F), extensao(r, alvos, "circulacao", F));
  var apertado = alvos.filter(function (it) { var t = r.trechos[it.id]; return r.chega[it.id] && t && t.estreito150 > 0; });
  var lmin = Math.min.apply(0, apertado.map(function (it) { return r.trechos[it.id].largMin; }));
  if (apertado.length && !out.length) out.push(achado("circulacao", "recomendacao", apertado.map(function (it) { return it.id; }),
    "Dentro do 10.17.1 (0,90 m). O corredor até " + apertado.map(M7.rotulo).join(", ") + " tem " + m(lmin) + " m no ponto mais estreito (de um lado ao outro): o 6.11.1 c) pede 1,50 m para uso público, e a norma não diz se ele vale para o corredor de compras.", M7.FONTES.publico));
  if (!out.length) out.push(achado("circulacao", "ok", [], alvos.length ? "Caminho dentro da norma da entrada até " + (alvos.length > 1 ? "os " + alvos.length + " itens." : "o item.") : "Nenhum item para alcançar ainda.", F));
  return out;
};

/* ---------- 2 · densidade da arara na faixa (fraca) ---------- */
M7.regraDensidade = function (proj) {
  var L = M7.LIMIAR, F = M7.FONTES.densidade, out = [];
  proj.itens.forEach(function (it) {
    if (!M7.ARARAS[it.tipo] || !it.pecas.length) return;
    var t = M7.trilho(it), mt = t / 100, pm = it.pecas.length / mt, ok = pm >= L.faixa_min_m - 1e-9 && pm <= L.faixa_max_m + 1e-9, faixa = Math.ceil(mt * L.faixa_min_m - 1e-9) + " a " + Math.floor(mt * L.faixa_max_m + 1e-9);
    out.push(achado("densidade", ok ? "ok" : teto(F, "erro"), [it.id], M7.rotulo(it) + ": " + it.pecas.length + " peças em " + Math.round(t) + " cm de trilho (" + pm.toFixed(1).replace(".", ",") + " por metro). A faixa dá " + faixa + " peças" +
      (ok ? "." : pm > L.faixa_max_m ? ": tire peças até sobrar folga entre os cabides." : ": cabe mais, se a arara parecer vazia."), F));
  });
  return out;
};

/* ---------- 3, 4, 5 · ordem da arara: tipo junto, blocos de cor claro → escuro, grade do menor ao maior (média) ---------- */
function trechosDe(ps, chave) { var t = []; ps.forEach(function (p) { var v = chave(p); if (!t.length || t[t.length - 1].v !== v) t.push({ v: v, ps: [p] }); else t[t.length - 1].ps.push(p); }); return t; }
function porArara(proj, fn) { var out = []; proj.itens.forEach(function (it) { if (M7.ARARAS[it.tipo] && it.pecas.length) out.push(fn(it, it.pecas.map(M7.sku))); }); return out; }
M7.regraTipoJunto = function (proj) {
  var F = M7.FONTES.ordem;
  return porArara(proj, function (it, ps) { var visto = {}, q = [];
    trechosDe(ps, function (p) { return p.tipo; }).forEach(function (t) { if (visto[t.v] && q.indexOf(t.v) < 0) q.push(t.v); visto[t.v] = 1; });
    return achado("tipojunto", q.length ? teto(F, "erro") : "ok", [it.id], q.length ? M7.rotulo(it) + ": " + q.join(", ") + " aparece em mais de um trecho. Junte o tipo antes de ordenar a cor." : M7.rotulo(it) + ": cada tipo está num trecho só.", F, null, q.length ? { k: "ordenar", id: it.id, rotulo: "Reordenar a arara" } : null); });
};
M7.regraBlocos = function (proj) {
  var F = M7.FONTES.ordem;
  return porArara(proj, function (it, ps) { var q = [];
    trechosDe(ps, function (p) { return p.tipo; }).forEach(function (t) { var vc = {}, tc = trechosDe(t.ps, function (p) { return p.cor; });
      tc.forEach(function (c, i) { if (vc[c.v]) q.push(t.v + " " + M7.CORES[c.v].nome.toLowerCase() + " em dois blocos"); vc[c.v] = 1;
        if (i && M7.lstar(M7.CORES[c.v].hex) > M7.lstar(M7.CORES[tc[i - 1].v].hex) + M7.EMPATE) q.push(t.v + ": " + M7.CORES[c.v].nome.toLowerCase() + " (mais claro) depois de " + M7.CORES[tc[i - 1].v].nome.toLowerCase()); }); });
    return achado("blocos", q.length ? teto(F, "erro") : "ok", [it.id], q.length ? M7.rotulo(it) + ": " + q.join("; ") + ". Cada cor num bloco, do claro para o escuro." : M7.rotulo(it) + ": cores em blocos, do claro para o escuro.", F, null, q.length ? { k: "ordenar", id: it.id, rotulo: "Reordenar a arara" } : null); });
};
M7.regraGrade = function (proj) {
  var F = M7.FONTES.ordem;
  return porArara(proj, function (it, ps) { var ult = {}, q = [];
    ps.forEach(function (p) { var k = p.mod + "|" + p.cor, o = M7.ordTam(p.tam); if (ult[k] !== undefined && o < ult[k] && q.indexOf(p.nome) < 0) q.push(p.nome + " " + M7.CORES[p.cor].nome.toLowerCase()); ult[k] = Math.max(ult[k] === undefined ? -1 : ult[k], o); });
    return achado("grade", q.length ? teto(F, "erro") : "ok", [it.id], q.length ? M7.rotulo(it) + ": tamanho fora de ordem em " + q.join(", ") + ". Do menor para o maior, da esquerda para a direita." : M7.rotulo(it) + ": tamanhos do menor para o maior.", F, null, q.length ? { k: "ordenar", id: it.id, rotulo: "Reordenar a arara" } : null); });
};

/* ---------- 6 · altura dos olhos para o ponto focal (fraca) ---------- */
M7.regraOlhos = function (proj) {
  var L = M7.LIMIAR, F = M7.FONTES.olhos, out = [], focos = proj.itens.filter(function (it) { return it.tipo === "manequim" || it.tipo === "vitrine"; });
  focos.filter(function (it) { return it.tipo === "manequim"; }).forEach(function (it) { var f = Math.round(it.alt * .75); /* busto do manequim: onde o look é lido */
    var ok = f >= L.olho_min && f <= L.olho_max;
    out.push(achado("olhos", ok ? "ok" : teto(F, "erro"), [it.id], M7.rotulo(it) + ": o look fica a " + m(f) + " m do chão" + (ok ? ", na altura dos olhos." : "; a faixa é de 1,10 a 1,60 m. Ajuste a altura do manequim ou use um pedestal."), F)); });
  if (!focos.length && proj.itens.some(function (it) { return M7.ARARAS[it.tipo]; }))
    out.push(achado("olhos", teto(F, "erro"), [], "Nenhum ponto focal na área: ponha um manequim com o look ou o 1º cabide com o look completo.", F));
  return out;
};

/* ---------- 7 · manequim com look completo (média; 3ª peça e mesmo tamanho = proposta do guia) ---------- */
M7.avaliarLook = function (pecas) {
  var ps = pecas.map(M7.sku), c = function (k) { return ps.filter(function (p) { return p.camada === k; }).length; };
  var base = c("inteiro") > 0 || (c("cima") > 0 && c("baixo") > 0), terceira = ps.length >= (c("inteiro") > 0 ? 2 : 3), tams = ps.map(function (p) { return M7.tamLook(p.tam); });
  return { base: base, terceira: terceira, mesmoTam: tams.every(function (t) { return t === tams[0]; }), n: ps.length };
};
M7.regraLook = function (proj) {
  var F = M7.FONTES.look, out = [];
  proj.itens.forEach(function (it) { if (it.tipo !== "manequim") return; var l = M7.avaliarLook(it.pecas);
    if (!l.base) out.push(achado("look", "atencao", [it.id], M7.rotulo(it) + (l.n ? ": falta " + (it.pecas.some(function (s) { return M7.sku(s).camada === "baixo"; }) ? "a parte de cima." : "a parte de baixo (ou um vestido).") : " está sem roupa.") + " O manequim mostra o look inteiro.", F));
    else if (!l.terceira || !l.mesmoTam) out.push(achado("look", "recomendacao", [it.id], M7.rotulo(it) + ": " + [!l.terceira ? "falta a 3ª peça (camada ou acessório)" : "", !l.mesmoTam ? "tamanhos diferentes no mesmo look (P = 36)" : ""].filter(Boolean).join("; ") + ".", F));
    else out.push(achado("look", "ok", [it.id], M7.rotulo(it) + ": look completo, mesmo tamanho.", F)); });
  return out;
};

/* ---------- 8 · vitrine sem excesso (fraca) ---------- */
M7.regraVitrine = function (proj) {
  var L = M7.LIMIAR, F = M7.FONTES.vitrine, out = [];
  proj.itens.forEach(function (it) { if (it.tipo !== "vitrine") return; var n = it.pecas.length, ok = n <= L.vitrine_max;
    out.push(achado("vitrine", ok ? "ok" : teto(F, "erro"), [it.id], M7.rotulo(it) + ": " + n + (n === 1 ? " peça" : " peças") + (ok ? "." : ". Menos vale mais: tire até ficar com " + L.vitrine_max + " ou menos."), F, null, ok ? null : { k: "cortar", id: it.id, n: n - L.vitrine_max, rotulo: "Tirar as últimas " + (n - L.vitrine_max) })); });
  return out;
};

/* ---------- 9 · acesso ao provador e à saída (lei: rota de 90 cm e porta ≥ 80 cm; giro de 1,50 m = recomendação) ---------- */
M7.regraAcesso = function (proj, r) {
  var L = M7.LIMIAR, F = M7.FONTES.rota, out = [], alvos = proj.itens.filter(function (it) { return ACESSO[it.tipo]; });
  proj.itens.forEach(function (it) { if (it.tipo === "porta" && it.larg < L.porta_min_cm - 1e-9) out.push(achado("acesso", "erro", [it.id], M7.rotulo(it) + ": vão de " + it.larg + " cm. A norma pede 80 cm ou mais.", M7.FONTES.porta, null, { k: "medida", id: it.id, campos: { larg: L.porta_min_cm }, rotulo: "Alargar a porta para " + L.porta_min_cm + " cm" })); });
  var provs = proj.itens.filter(function (it) { return it.tipo === "provador"; }), interno = M7.interno;
  if (provs.length && !provs.some(function (it) { var d = interno(it); return d[0] >= L.provador_int && d[1] >= L.provador_int; }))
    out.push(achado("acesso", "erro", provs.map(function (it) { return it.id; }), "Nenhum provador acessível: o maior tem " + interno(provs[0]).join(" × ") + " cm por dentro. A norma pede pelo menos um com 1,20 × 1,20 m livres e entrada de 80 cm.", M7.FONTES.provador, null, { k: "medida", id: provs[0].id, campos: { larg: L.provador_int + 10, prof: L.provador_int + 10 }, rotulo: "Aumentar para " + (L.provador_int + 10) + " × " + (L.provador_int + 10) + " cm" }));
  if (r.entra) out = out.concat(semCaminho(proj, r, alvos, "acesso", F), extensao(r, alvos, "acesso", F));
  else if (alvos.length) out.push(achado("acesso", "erro", alvos.map(function (it) { return it.id; }), "Com a entrada fechada, provador e saída ficam sem acesso.", F));
  alvos.filter(function (it) { return it.tipo === "provador" && r.chega[it.id] && r.trechos[it.id].fim < L.largo_publico / 2 && !out.some(function (a) { return a.itens[0] === it.id; }); }).forEach(function (it) {
    out.push(achado("acesso", "recomendacao", [it.id], M7.rotulo(it) + ": a frente não tem 1,50 m livres para girar a cadeira de rodas.", M7.FONTES.giro)); });
  if (!out.length && alvos.length) out.push(achado("acesso", "ok", [], "Provador acessível (1,20 × 1,20 m por dentro), caminho de 0,90 m até ele e até a saída, portas com 80 cm ou mais.", F));
  return out;
};

M7.aplicarCorrecao = function (proj, c) { /* a correção de um clique, em cima do projeto (editor e teste usam a mesma) */
  var it = proj.itens.filter(function (x) { return x.id === c.id; })[0]; if (!it) return false;
  if (c.k === "ordenar") it.pecas = M7.ordenarArara(it.pecas); else if (c.k === "medida") Object.keys(c.campos).forEach(function (k) { it[k] = c.campos[k]; }); else if (c.k === "cortar") it.pecas = it.pecas.slice(0, it.pecas.length - c.n); else return false;
  return true;
};
M7.REGRAS = [M7.regraCirculacao, M7.regraDensidade, M7.regraTipoJunto, M7.regraBlocos, M7.regraGrade, M7.regraOlhos, M7.regraLook, M7.regraVitrine, M7.regraAcesso];
M7.NOMES = { circulacao: "Circulação", densidade: "Densidade da arara", tipojunto: "Tipo junto antes da cor", blocos: "Blocos de cor", grade: "Grade de tamanhos",
  olhos: "Altura dos olhos e ponto focal", look: "Manequim com look completo", vitrine: "Vitrine sem excesso", acesso: "Acesso ao provador e à saída" };
M7.PESO = { erro: 0, atencao: 1, recomendacao: 2, ok: 3 };
M7.validar = function (proj, rota) {
  if (!proj.itens.length) return []; /* sem itens não há o que conferir (e a nota não inventa 10) */
  var r = rota || M7.rota(proj), l = [];
  M7.REGRAS.forEach(function (f) { l = l.concat(f(proj, r)); });
  return l.sort(function (a, b) { return M7.PESO[a.status] - M7.PESO[b.status]; });
};

/* ---------- nota (0–10) e as 3 correções de maior impacto ----------
   peso da regra pela força da fonte (lei 3, média 2, fraca 1); valor do pior achado da regra (certo 1, recomendação .75, atenção .4, erro 0).
   nota = 10 × Σ peso × valor ÷ Σ peso, só das regras que se aplicam. impacto = o quanto a nota sobe se a regra ficar certa. */
M7.PESOS = { lei: 3, fisica: 3, media: 2, fraca: 1 }; M7.VALOR = { ok: 1, recomendacao: .75, atencao: .4, erro: 0 };
/* Dev1 r2: o peso é da REGRA (a fonte mais forte dela), não do achado. Antes, a recomendação de 1,50 m (fraca) baixava o peso da
   circulação de 3 para 1, e o "impacto" prometia metade do ganho real (0,2 × 0,4 no caso-limite com um erro de cor). */
M7.NIVEL_REGRA = { circulacao: "lei", acesso: "lei", tipojunto: "media", blocos: "media", grade: "media", look: "media", densidade: "fraca", olhos: "fraca", vitrine: "fraca" };
M7.nota = function (achados) {
  var reg = {};
  achados.forEach(function (a) { var r = reg[a.regra] || (reg[a.regra] = { regra: a.regra, pior: "ok", w: M7.PESOS[M7.NIVEL_REGRA[a.regra]], achado: null });
    if (M7.PESO[a.status] < M7.PESO[r.pior]) { r.pior = a.status; r.achado = a; } });
  var lista = Object.keys(reg).map(function (k) { return reg[k]; }), sw = lista.reduce(function (s, r) { return s + r.w; }, 0);
  lista.forEach(function (r) { r.impacto = Math.round(100 * r.w * (1 - M7.VALOR[r.pior]) / sw) / 10; });
  var nota = lista.length ? Math.round(100 * lista.reduce(function (s, r) { return s + r.w * M7.VALOR[r.pior]; }, 0) / sw) / 10 : null;
  var top = lista.filter(function (r) { return r.impacto > 0; }).sort(function (a, b) { return b.impacto - a.impacto || M7.PESO[a.pior] - M7.PESO[b.pior] || (a.regra < b.regra ? -1 : 1); }).slice(0, 3);
  return { nota: nota, regras: lista, top3: top };
};
