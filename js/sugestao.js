/* Mindse7 · simulador · parte 4: sugestão automática. Determinística: regras + pontuação, sem sorteio e sem IA.
   recursos → até 3 variações, cada uma um projeto no mesmo esquema do editor, conferido pelo mesmo M7.validar. */
var M7 = window.M7 || (window.M7 = {});
(function () {
  M7.SUG = { corredor: 90, largo: 150, entradaFundo: 120 }; /* passagem livre exigida em volta e na frente de cada item; boca da entrada */

  /* ---------- pequenas ferramentas ---------- */
  M7.hash = function (o) { var s = JSON.stringify(o), h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); };
  function caixaDe(it) { var P = M7.cantos(it), xs = P.map(function (p) { return p[0]; }), zs = P.map(function (p) { return p[1]; }); return { x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), z0: Math.min.apply(0, zs), z1: Math.max.apply(0, zs) }; }
  function cruza(a, b) { return a.x0 < b.x1 - .5 && b.x0 < a.x1 - .5 && a.z0 < b.z1 - .5 && b.z0 < a.z1 - .5; }
  /* zona que precisa ficar livre: 90 cm na frente (itens de frente) ou em volta (os outros); a porta não tem zona dentro da parede */
  function zonaDe(it) { var T = M7.TIPOS[it.tipo], c = caixaDe(it);
    if (it.tipo === "parede") return null;
    if (T.frente || it.tipo === "porta" || it.tipo === "vitrine") { var a = it.rot * Math.PI / 180, o = it.prof / 2 + M7.SUG.corredor / 2, z = { x_cm: it.x_cm - o * Math.sin(a), z_cm: it.z_cm + o * Math.cos(a), rot: it.rot, larg: it.larg + (it.tipo === "porta" ? 0 : 0), prof: M7.SUG.corredor };
      if (it.tipo === "vitrine") return null; return caixaDe(z); }
    return { x0: c.x0 - M7.SUG.corredor, x1: c.x1 + M7.SUG.corredor, z0: c.z0 - M7.SUG.corredor, z1: c.z1 + M7.SUG.corredor }; }
  function cabe(p, it) {
    var A = p.area, c = caixaDe(it), z = zonaDe(it);
    if (c.x0 < -.5 || c.z0 < -.5 || c.x1 > A.larg_cm + .5 || c.z1 > A.prof_cm + .5) return false;
    var e = A.entrada, boca = { x0: e.x_cm - e.larg_cm / 2, x1: e.x_cm + e.larg_cm / 2, z0: A.prof_cm - M7.SUG.entradaFundo, z1: A.prof_cm };
    if (M7.ocupa(it) && cruza(c, boca)) return false;
    return p.itens.every(function (o) { var co = caixaDe(o), zo = zonaDe(o);
      if (M7.ocupa(it) && M7.ocupa(o) && cruza(c, co)) return false;
      if (zo && M7.ocupa(it) && cruza(c, zo)) return false;
      if (z && M7.ocupa(o) && o.tipo !== "parede" && cruza(z, co)) return false;
      return true; });
  }
  function novoId(p) { return "i" + p.proxId++; }

  /* ---------- lugares candidatos por tipo, em ordem de preferência; cada variação muda a ordem ---------- */
  function encostados(A, w, d, lado, passo) { /* posições de um item de frente encostado numa parede da área, a frente para dentro */
    var out = [], W = A.larg_cm, D = A.prof_cm, s = passo || 10;
    if (lado === "fundo") for (var x = w / 2; x <= W - w / 2; x += s) out.push({ x: x, z: 10 + d / 2, rot: 0, lado: "fundo" });
    if (lado === "esq") for (var z = 10 + w / 2; z <= D - w / 2; z += s) out.push({ x: d / 2, z: z, rot: 270, lado: "esq" });
    if (lado === "dir") for (z = 10 + w / 2; z <= D - w / 2; z += s) out.push({ x: W - d / 2, z: z, rot: 90, lado: "dir" });
    return out;
  }
  function soltos(A, w, d, ordem) { var out = [], W = A.larg_cm, D = A.prof_cm;
    for (var z = d / 2 + M7.SUG.corredor; z <= D - d / 2; z += 10) for (var x = w / 2 + M7.SUG.corredor; x <= W - w / 2 - M7.SUG.corredor; x += 10) out.push({ x: x, z: z, rot: 0 });
    var cx = A.entrada.x_cm;
    return out.sort(ordem === "entrada" ? function (a, b) { return (Math.abs(a.x - cx) + (D - a.z)) - (Math.abs(b.x - cx) + (D - b.z)) || a.x - b.x; }
      : ordem === "centro" ? function (a, b) { return (Math.hypot(a.x - W / 2, a.z - D / 2) - Math.hypot(b.x - W / 2, b.z - D / 2)) || a.x - b.x || a.z - b.z; }
      : function (a, b) { return a.z - b.z || a.x - b.x; }); }
  function porta(A, w) { var out = [], W = A.larg_cm, D = A.prof_cm; for (var z = D - 60 - w / 2; z >= w / 2 + 10; z -= 10) out.push({ x: W - 5, z: z, rot: 90 }); for (z = D - 60 - w / 2; z >= w / 2 + 10; z -= 10) out.push({ x: 5, z: z, rot: 270 }); return out; }
  function frenteFora(A, w, d) { var out = [], e = A.entrada, D = A.prof_cm; /* vitrine: na frente, ao lado da entrada, olhando para o corredor da loja */
    for (var x = e.x_cm - e.larg_cm / 2 - w / 2 - 10; x >= w / 2; x -= 10) out.push({ x: x, z: D - d / 2, rot: 0 });
    for (x = e.x_cm + e.larg_cm / 2 + w / 2 + 10; x <= A.larg_cm - w / 2; x += 10) out.push({ x: x, z: D - d / 2, rot: 0 }); return out; }

  /* Dev1 r2: a explicação sai do lado onde a arara de fato ficou (antes: "araras nas duas laterais" com 1 arara só) */
  var ONDE_ARARA = function (l) { return { fundo: "Arara no fundo, de frente para a entrada: as peças ficam à vista de quem entra.", esq: "Arara na lateral esquerda: é a primeira parede que o olho encontra ao entrar.",
    dir: "Arara na lateral direita, de frente para o corredor do meio, que fica livre." }[l.lado]; };
  var VARIACOES = [
    { nome: "Mesa na entrada", araras: ["fundo", "esq", "dir"], mesa: "entrada", manequim: "entrada", provador: "dir",
      porque: { mesa: "Mesa na entrada: é a primeira parada da cliente e o lugar dos dobrados de giro (camiseta, jeans dobrado).", araras: "Araras no fundo, de frente para a entrada: o corredor fica no meio e todas as peças ficam à vista de quem entra." } },
    { nome: "Araras em L", araras: ["esq", "fundo", "dir"], mesa: "centro", manequim: "entrada", provador: "dir",
      porque: { mesa: "Mesa no centro: a cliente circula em volta dela, e ela fica à vista de todas as araras.", araras: "Araras em L (lateral esquerda e fundo): a parede da esquerda é a primeira que o olho encontra ao entrar." } },
    { nome: "Corredor central", araras: ["dir", "esq", "fundo"], mesa: "fundo", manequim: "entrada", provador: "esq",
      porque: { mesa: "Mesa no fundo: puxa a cliente pelo corredor central até o fim da área.", araras: "Araras nas duas laterais, frente a frente: um corredor central reto, fácil de manter livre." } }
  ];

  /* ---------- ordem da arara: tipo junto → cor do claro ao escuro (L*) → tamanho do menor ao maior ---------- */
  M7.ordenarArara = function (pecas) {
    var tipos = M7.MODELOS.map(function (m) { return m.tipo; });
    return pecas.slice().sort(function (a, b) { var p = M7.sku(a), q = M7.sku(b);
      return tipos.indexOf(p.tipo) - tipos.indexOf(q.tipo) || M7.lstar(M7.CORES[q.cor].hex) - M7.lstar(M7.CORES[p.cor].hex) || (p.cor < q.cor ? -1 : p.cor > q.cor ? 1 : 0) || (p.mod < q.mod ? -1 : p.mod > q.mod ? 1 : 0) || M7.ordTam(p.tam) - M7.ordTam(q.tam); });
  };
  M7.expandirPecas = function (linhas) { var out = []; (linhas || []).forEach(function (l) { var m = M7.MODELOS.filter(function (x) { return x.mod === l.mod; })[0]; if (!m) return;
    (l.cores || m.cores).forEach(function (c) { (l.tams || m.tams).forEach(function (t) { var s = m.mod + "-" + c + "-" + t; if (M7.sku(s)) for (var i = 0; i < (l.n || 1); i++) out.push(s); }); }); }); return out; };

  /* ---------- montar uma variação ---------- */
  function montar(rec, V) {
    var p = M7.novoProjeto(), A = p.area, ex = [], faltas = [], ordemPost = [];
    p.nome = "Sugestão · " + V.nome; p.cenario = rec.cenario === "multi" ? "multi" : "cea";
    A.larg_cm = rec.area.larg_cm; A.prof_cm = rec.area.prof_cm; A.entrada = { lado: "frente", x_cm: rec.area.entrada_x || Math.round(A.larg_cm / 2 / 10) * 10, larg_cm: rec.area.entrada_larg || 120 };
    var pedidos = []; (rec.itens || []).forEach(function (l) { for (var i = 0; i < (l.qtd || 1); i++) pedidos.push({ tipo: l.tipo, larg: l.larg, prof: l.prof, alt: l.alt }); });
    /* Dev1 r2: recurso fora da norma não derruba as 3 variações (antes: 0 variações e nenhuma falta); fica de fora e a falta diz o que trazer */
    var provs = pedidos.filter(function (q) { return q.tipo === "provador"; }), Lm = M7.LIMIAR, por0 = function (q) { var T = M7.TIPOS[q.tipo]; return { larg: q.larg || T.larg, prof: q.prof || T.prof }; };
    if (provs.length && !provs.some(function (q) { var d = M7.interno(por0(q)); return d[0] >= Lm.provador_int && d[1] >= Lm.provador_int; })) { var d0 = M7.interno(por0(provs[0]));
      pedidos = pedidos.filter(function (q) { return q.tipo !== "provador"; });
      faltas.push("Provador " + por0(provs[0]).larg + "×" + por0(provs[0]).prof + " tem " + d0.join(" × ") + " cm por dentro: a NBR 9050 (10.17.2) pede ao menos um com 1,20 × 1,20 m. Ficou de fora; falta um provador de " + (Lm.provador_int + 8) + " × " + (Lm.provador_int + 4) + " cm ou maior."); }
    pedidos = pedidos.filter(function (q) { if (q.tipo !== "porta" || (q.larg || M7.TIPOS.porta.larg) >= Lm.porta_min_cm) return true;
      faltas.push("Porta de " + q.larg + " cm: a NBR 9050 (6.11.2.1) pede vão de " + Lm.porta_min_cm + " cm ou mais. Ficou de fora da planta; alargue o vão."); return false; });
    var naoCoube = 0;
    function pega(tipo) { return pedidos.filter(function (q) { return q.tipo === tipo; }); }
    function por(q, lugares, porque) { var T = M7.TIPOS[q.tipo], it = M7.item("tmp", q.tipo, 0, 0, 0, [], { larg: q.larg || T.larg, prof: q.prof || T.prof, alt: q.alt || T.alt });
      for (var i = 0; i < lugares.length; i++) { it.x_cm = lugares[i].x; it.z_cm = lugares[i].z; it.rot = lugares[i].rot;
        if (cabe(p, it)) { it.id = novoId(p); p.itens.push(it); ordemPost.push(it.id); if (porque) ex.push({ id: it.id, txt: typeof porque === "function" ? porque(lugares[i]) : porque }); return it; } }
      naoCoube++; faltas.push(T.nome + " " + it.larg + "×" + it.prof + " não coube com " + M7.SUG.corredor + " cm de passagem na frente" + (T.frente ? "" : " e em volta") + "."); return null; }
    /* paredes do pedido vão para o fundo (as araras de parede se apoiam nelas) */
    pega("parede").forEach(function (q) { var w = q.larg || 300; por({ tipo: "parede", larg: Math.min(w, A.larg_cm), prof: 10 }, [{ x: Math.min(w, A.larg_cm) / 2, z: 5, rot: 0 }, { x: A.larg_cm - Math.min(w, A.larg_cm) / 2, z: 5, rot: 0 }], "Parede de " + (q.larg || 300) + " cm no fundo: é o apoio das araras de parede e o pano de fundo da área."); });
    var fundo = p.itens.some(function (it) { return it.tipo === "parede"; }) ? 10 : 0;
    pega("porta").forEach(function (q) { por(q, porta(A, q.larg || 90), "Porta na lateral, perto da frente: saída sem cruzar a área inteira."); });
    pega("provador").forEach(function (q) { var T = M7.TIPOS.provador, w = q.larg || T.larg, d = q.prof || T.prof;
      por(q, encostados(A, w, d, V.provador).concat(encostados(A, w, d, V.provador === "dir" ? "esq" : "dir")), "Provador no canto do fundo, cortina para o salão: quem prova não fica no caminho de quem chega."); });
    var araras = [];
    ["arara_parede", "arara_reta"].forEach(function (t) { pega(t).forEach(function (q) { var T = M7.TIPOS[t], w = q.larg || T.larg, d = q.prof || T.prof, lug = [];
      V.araras.forEach(function (l) { lug = lug.concat(encostados(A, w, d, l).map(function (c) { if (l === "fundo") c.z += fundo; return c; })); });
      var it = por(q, lug, ONDE_ARARA); if (it) araras.push(it); }); });
    pega("gondola").forEach(function (q) { var T = M7.TIPOS.gondola, w = q.larg || T.larg, d = q.prof || T.prof, lug = [];
      V.araras.slice().reverse().forEach(function (l) { lug = lug.concat(encostados(A, w, d, l)); }); por(q, lug, "Gôndola na parede oposta às araras: dobrados à mão, sem fechar o corredor."); });
    pega("caixa").forEach(function (q) { var T = M7.TIPOS.caixa, w = q.larg || T.larg, d = q.prof || T.prof;
      por(q, encostados(A, w, d, V.provador === "dir" ? "esq" : "dir").reverse(), "Caixa na lateral perto da frente: a fila não entra na área de venda."); });
    pega("vitrine").forEach(function (q) { var T = M7.TIPOS.vitrine; por(q, frenteFora(A, q.larg || T.larg, q.prof || T.prof), "Vitrine na frente, ao lado da entrada, olhando para o corredor da loja: é o convite."); });
    pega("arara_circular").forEach(function (q) { var T = M7.TIPOS.arara_circular, w = q.larg || T.larg; var it = por(q, soltos(A, w, w, "centro"), "Arara circular solta no salão: mostra a novidade de todos os lados."); if (it) araras.push(it); });
    pega("mesa").forEach(function (q, i) { var T = M7.TIPOS.mesa, w = q.larg || T.larg, d = q.prof || T.prof; var lug = soltos(A, w, d, i ? "centro" : V.mesa);
      if (por(q, lug, i ? "Segunda mesa no centro, com " + M7.SUG.corredor + " cm em volta." : V.porque.mesa)) return;
      faltas.pop(); naoCoube--; por(q, encostados(A, w, d, "esq").concat(encostados(A, w, d, "dir")), "Mesa encostada na lateral: sem espaço para " + M7.SUG.corredor + " cm em volta, ela usa a parede e deixa o centro livre."); });
    pega("manequim").forEach(function (q, i) { var T = M7.TIPOS.manequim, w = q.larg || T.larg, d = q.prof || T.prof, cx = A.entrada.x_cm;
      var lug = soltos(A, w, d, V.manequim).filter(function (c, k) { return i ? k % 3 === 0 : true; }), canto = encostados(A, w, d, "esq").concat(encostados(A, w, d, "dir")).sort(function (a, b) { return b.z - a.z || Math.abs(a.x - cx) - Math.abs(b.x - cx); });
      if (por(q, lug, i ? "Segundo manequim: o 2º look, longe do primeiro para cada um ter o seu ponto focal." : "Manequim perto da entrada: é o 1º ponto focal, olha para o corredor da loja.")) return;
      faltas.pop(); naoCoube--; por(q, canto, "Manequim no canto da frente, encostado: é o 1º ponto focal sem tirar passagem."); });

    /* ---------- peças: pendura nas araras, dobra nas mesas e gôndolas, look nos manequins e na vitrine ---------- */
    var estoque = M7.expandirPecas(rec.pecas), sobras = [];
    var manequins = p.itens.filter(function (it) { return it.tipo === "manequim" || it.tipo === "vitrine"; });
    manequins.forEach(function (mq) { var look = escolherLook(estoque);
      if (!look.length && mq.tipo === "manequim") faltas.push(M7.rotulo(mq) + " ficou sem look: falta uma peça de cima e uma de baixo no mesmo tamanho (ou um vestido)."); /* Dev1 r2 */
      if (look.length) { look.forEach(function (s) { estoque.splice(estoque.indexOf(s), 1); }); mq.pecas = look;
      ex.push({ id: mq.id, txt: M7.rotulo(mq) + ": look " + look.map(function (s) { var k = M7.sku(s); return k.nome.split(" ")[0].toLowerCase() + " " + M7.CORES[k.cor].nome.toLowerCase(); }).join(" + ") + ", mesmo tamanho." }); } });
    var temDobra = p.itens.some(function (it) { return it.tipo === "mesa" || it.tipo === "gondola"; });
    var pend = estoque.filter(function (s) { var k = M7.sku(s); return k.modo === "pendura" || (k.modo === "ambos" && (araras.length || !temDobra)); }),
      dob = estoque.filter(function (s) { return pend.indexOf(s) < 0; });
    pend = M7.ordenarArara(pend);
    /* Dev1 r2: as peças, já na ordem da arara (tipo → cor → tamanho), são cortadas em trechos seguidos, um por arara, com a mesma densidade.
       k = o maior número de araras que fica entre 16 e 25/m; o corte vai para a troca de tipo (ou de cor) mais perto, se as duas partes
       continuam na faixa. Antes, cada tipo ia inteiro para uma arara: 40 jeans em 2 araras saíam 30 + 10 (25/m e 8,3/m). */
    var tr = araras.map(function (it) { return M7.trilho(it) / 100; }), soma = function (a, b) { return tr.slice(a, b).reduce(function (s, x) { return s + x; }, 0); }, k = 0, kk;
    for (kk = araras.length; kk >= 1 && !k; kk--) { var dk = pend.length / soma(0, kk); if (dk >= 16 - 1e-9 && dk <= 25 + 1e-9) k = kk; }
    if (!k && araras.length) k = !pend.length || pend.length > 25 * soma(0, araras.length) ? araras.length : 1; /* peças demais: todas a 25/m; de menos: 1 arara abaixo da faixa */
    var cabeK = Math.min(pend.length, tr.slice(0, k).reduce(function (s, x) { return s + Math.floor(25 * x + 1e-9); }, 0)), usar = pend.slice(0, cabeK), ini = 0;
    sobras = sobras.concat(pend.slice(cabeK));
    var chaves = [function (s) { return M7.sku(s).tipo; }, function (s) { var q = M7.sku(s); return q.tipo + q.cor; }];
    araras.forEach(function (it, i) { if (i >= k) return;
      var fim = i === k - 1 ? usar.length : ini + Math.round((usar.length - ini) * tr[i] / soma(i, k)), corte = fim, lo = Math.ceil(16 * tr[i] - 1e-9), hi = Math.floor(25 * tr[i] + 1e-9);
      var naFaixa = function (c) { var n = c - ini, dr = (usar.length - c) / soma(i + 1, k); return n >= lo && n <= hi && dr >= 16 - 1e-9 && dr <= 25 + 1e-9; };
      for (var q = 0; i < k - 1 && q < chaves.length && corte === fim; q++) for (var d = 0; d <= hi - lo && corte === fim; d++)
        [fim - d, fim + d].forEach(function (c) { if (corte === fim && c > ini && c < usar.length && chaves[q](usar[c - 1]) !== chaves[q](usar[c]) && naFaixa(c)) corte = c; });
      it.pecas = usar.slice(ini, corte); ini = corte; });
    araras.filter(function (it, i) { return i >= k; }).forEach(function (it) { p.itens.splice(p.itens.indexOf(it), 1); ex = ex.filter(function (e) { return e.id !== it.id; }); faltas.push(M7.TIPOS[it.tipo].nome + " " + it.larg + " cm ficou de fora: as peças enchem " + k + (k === 1 ? " arara" : " araras") + " entre 16 e 25 por metro; com mais uma, todas ficariam abaixo de 16."); });
    araras = araras.slice(0, k);
    araras.forEach(function (it) { it.pecas = M7.ordenarArara(it.pecas); });
    if (rec.cenario === "multi" && araras.length) { var dir = araras.slice().sort(function (a, b) { return b.x_cm - a.x_cm; })[0]; ex.push({ id: dir.id, txt: "Multimarca: " + M7.rotulo(dir) + " fica na ponta da vizinha e termina no tom mais escuro (divisa neutra, proposta do guia). Na C&A não há divisa: a sinalização da loja marca o espaço." }); }
    else if (araras.length) ex.push({ id: araras[0].id, txt: "Espaço na C&A: sem divisa, a sinalização da loja marca o espaço (tabela C&A × multimarca do guia)." });
    var mesas = p.itens.filter(function (it) { return it.tipo === "mesa" || it.tipo === "gondola"; }), capM = function (it) { return it.tipo === "mesa" ? Math.max(1, Math.floor((it.larg - 10) / 34)) * Math.max(1, Math.floor((it.prof - 8) / 32)) * 12 : Math.max(1, Math.floor((it.larg - 16) / 34)) * 3 * 10; };
    dob.forEach(function (s) { var alvo = mesas.filter(function (it) { return it.pecas.length < capM(it); })[0]; if (alvo) alvo.pecas.push(s); else sobras.push(s); });
    mesas.forEach(function (it) { it.pecas = M7.ordenarArara(it.pecas); });
    araras.forEach(function (it) { if (it.pecas.length) ex.push({ id: it.id, txt: M7.rotulo(it) + ": " + it.pecas.length + " peças em " + Math.round(M7.trilho(it)) + " cm, tipo junto, cor do claro ao escuro, tamanho do menor ao maior." }); });
    if (sobras.length) { var porTipo = {}; sobras.forEach(function (s) { var k = M7.sku(s); porTipo[k.tipo] = (porTipo[k.tipo] || 0) + 1; });
      var cmFalta = Math.ceil(sobras.filter(function (s) { return M7.sku(s).modo !== "dobra"; }).length / 25 * 100);
      faltas.push("Não couberam " + sobras.length + " peças (" + Object.keys(porTipo).map(function (t) { return porTipo[t] + " " + t.toLowerCase(); }).join(", ") + ")" + (cmFalta ? ": faltam " + cmFalta + " cm de arara a 25 peças por metro." : ": falta mesa ou gôndola.")); }
    return { projeto: p, explicacoes: ex, faltas: juntar(faltas), ordem: ordemPost, naoCoube: naoCoube };
  }
  function juntar(l) { /* Dev1 r2: faltas iguais viram 1 linha com a contagem (antes: 12 araras pedidas, 9 sem lugar, 1 linha só) */
    var n = {}, ordem = []; l.forEach(function (f) { if (!n[f]) { n[f] = 0; ordem.push(f); } n[f]++; });
    return ordem.map(function (f) { return n[f] > 1 ? f.replace(" não coube", ": " + n[f] + " não couberam").replace(" ficou de fora", ": " + n[f] + " ficaram de fora") : f; }); }
  function escolherLook(estoque) { /* 1 de cima + 1 de baixo (ou vestido) + 1 terceira, todas no mesmo tamanho de look (P = 36) */
    var ps = estoque.map(M7.sku), tamanhos = [1, 2, 3, 0, 4];
    for (var t = 0; t < tamanhos.length; t++) { var T = tamanhos[t], de = function (cam) { return ps.filter(function (p) { return p.camada === cam && M7.tamLook(p.tam) === T; }); };
      var cima = de("cima").filter(function (p) { return p.tipo !== "Blazer"; })[0] || de("cima")[0], baixo = de("baixo")[0], inteiro = de("inteiro")[0];
      var terc = de("cima").filter(function (p) { return p.tipo === "Blazer" && (!cima || p.sku !== cima.sku); })[0];
      if (cima && baixo) return [cima.sku, baixo.sku].concat(terc ? [terc.sku] : []);
      if (inteiro) return [inteiro.sku].concat(terc ? [terc.sku] : []); }
    return [];
  }

  /* ---------- sugerir: até 3 variações que passam no validador sem erro, da maior nota para a menor ---------- */
  M7.sugerir = function (rec) {
    var erroEntrada = validarRecursos(rec); if (erroEntrada) return { variacoes: [], faltas: [erroEntrada], descartadas: [] };
    var ok = [], desc = [], todas = [], base = M7.SUG.corredor;
    /* Dev1 r2: tenta primeiro corredor de 1,50 m (o 6.11.1 c, recomendação); se algum item não cabe, monta com 0,90 m (10.17.1, lei) */
    function tenta(V, c) { M7.SUG.corredor = c; try { return montar(rec, V); } finally { M7.SUG.corredor = base; } }
    VARIACOES.forEach(function (V) { var largo = M7.SUG.largo > base ? tenta(V, M7.SUG.largo) : null, r = largo && !largo.naoCoube ? largo : tenta(V, base);
      var ach = M7.validar(r.projeto), erros = ach.filter(function (a) { return a.status === "erro"; });
      r.nota = M7.nota(ach).nota; r.achados = ach; r.nome = V.nome; r.hash = M7.hash(r.projeto); r.corredor = r === largo ? M7.SUG.largo : base;
      todas.push(r);
      if (!r.projeto.itens.some(function (it) { return M7.ocupa(it) && it.tipo !== "parede"; })) { desc.push(V.nome + ": nada coube na área."); return; } /* Dev1 r2: antes saía 1 "variação" vazia, nota nula */
      if (erros.length) { desc.push(V.nome + ": " + erros[0].msg); return; }
      ok.push(r); });
    ok.sort(function (a, b) { return b.nota - a.nota || b.projeto.itens.length - a.projeto.itens.length; });
    var vistas = {}; ok = ok.filter(function (r) { var k = M7.hash(r.projeto.itens.map(function (it) { return [it.tipo, it.x_cm, it.z_cm, it.rot]; })); if (vistas[k]) return false; vistas[k] = 1; return true; }).slice(0, 3);
    /* faltas: as que valem para todas as variações mostradas ficam no topo; as de uma só ficam no cartão dela. Sem variação, todas as faltas. */
    var faltas = ok.length ? ok[0].faltas.filter(function (f) { return ok.every(function (r) { return r.faltas.indexOf(f) >= 0; }); }) : todas.reduce(function (l, r) { r.faltas.forEach(function (f) { if (l.indexOf(f) < 0) l.push(f); }); return l; }, []);
    ok.forEach(function (r) { r.soEsta = r.faltas.filter(function (f) { return faltas.indexOf(f) < 0; }); });
    return { variacoes: ok, faltas: faltas, descartadas: desc.filter(function (d, i) { return desc.indexOf(d) === i; }) };
  };
  function validarRecursos(rec) {
    if (!rec || !rec.area || !(rec.area.larg_cm >= 100) || !(rec.area.prof_cm >= 100)) return "A área precisa de largura e profundidade de pelo menos 100 cm.";
    if (rec.area.larg_cm > 3000 || rec.area.prof_cm > 3000) return "Área acima de 30 m de lado: confira as medidas (em cm).";
    if (!(rec.itens || []).some(function (l) { return (l.qtd || 0) > 0 && M7.TIPOS[l.tipo]; })) return "Diga pelo menos um item disponível (arara, mesa...).";
    return null;
  }

  /* os 3 cenários de recursos do #teste: o exemplo do pedido (C&A), um corner de multimarca e um que não cabe */
  M7.RECURSOS = {
    pedido: { cenario: "cea", area: { larg_cm: 500, prof_cm: 400 }, itens: [{ tipo: "parede", qtd: 1, larg: 400 }, { tipo: "arara_parede", qtd: 2 }, { tipo: "mesa", qtd: 2, larg: 120, prof: 80 }, { tipo: "manequim", qtd: 1 }, { tipo: "provador", qtd: 1 }],
      pecas: [{ mod: "cm", cores: ["branco", "preto"], tams: ["P", "M", "G"], n: 2 }, { mod: "bz", cores: ["offwhite"], tams: ["P", "M", "G"], n: 2 }, { mod: "wl", cores: ["jeans"], tams: [36, 38, 40, 42, 44], n: 3 }, { mod: "alf", cores: ["rosa", "marrom"], tams: [36, 38, 40, 42], n: 2 }, { mod: "sl", cores: ["offwhite", "preto"], tams: ["P", "M", "G"], n: 1 }, { mod: "vm", cores: ["azul"], tams: ["P", "M", "G"], n: 1 }] },
    multi: { cenario: "multi", area: { larg_cm: 330, prof_cm: 300 }, itens: [{ tipo: "arara_parede", qtd: 1, larg: 100 }, { tipo: "mesa", qtd: 1, larg: 100, prof: 60 }, { tipo: "manequim", qtd: 1 }],
      pecas: [{ mod: "sl", cores: ["offwhite", "preto"], tams: ["P", "M", "G"], n: 2 }, { mod: "cm", cores: ["branco"], tams: ["P", "M", "G"], n: 2 }, { mod: "wl", cores: ["jeans"], tams: [36, 38, 40, 42], n: 2 }, { mod: "bz", cores: ["offwhite"], tams: ["P", "M", "G"], n: 1 }] },
    naoCabe: { cenario: "cea", area: { larg_cm: 250, prof_cm: 220 }, itens: [{ tipo: "arara_reta", qtd: 1 }, { tipo: "mesa", qtd: 2 }],
      pecas: [{ mod: "alf", cores: ["rosa", "marrom"], tams: [36, 38, 40, 42], n: 5 }] }
  };
})();
