/* Mindse7 · simulador · #teste (asserções sobre o código real, RG-GLOBAL-027), mutações e #estresse (fps).
   M7.testesRegras e M7.testesSugestao não tocam a tela: rodam também no Node. M7.rodarTestes junta tudo, a interface e as mutações. */
var M7 = window.M7 || (window.M7 = {});

var E_ = function (l, regra) { return l.filter(function (a) { return a.regra === regra; }); };
var S_ = function (l, regra) { return E_(l, regra).map(function (a) { return a.status; }).join(); };
function proj0(itens, area) { var p = M7.novoProjeto(); if (area) { p.area.larg_cm = area[0]; p.area.prof_cm = area[1]; p.area.entrada.x_cm = area[2] === undefined ? Math.round(area[0] / 2) : area[2]; } p.itens = itens; p.proxId = 99; return p; }
function circ(p) { return M7.regraCirculacao(p, M7.rota(p)); }

/* ---------- as 9 regras: 3 cenários fixos + variações; cada linha é [nome, função que devolve verdadeiro] ---------- */
M7.testesRegras = function () {
  var A = M7.validar(M7.CENARIOS.passa()), B = M7.validar(M7.CENARIOS.erro()), C = M7.validar(M7.CENARIOS.limite()), T = [], t = function (n, f) { T.push([n, f]); };
  /* 1 · circulação (NBR 9050 10.17.1, lei) */
  t("[A passa] circulação: caminho de 1,50 m da entrada a todos os itens", function () { return S_(A, "circulacao") === "ok"; });
  t("[B erro] circulação: arara sem caminho de 90 cm; aponta a mesa a 60 cm", function () { var c = E_(B, "circulacao")[0]; return c.status === "erro" && /Arara reta #2/.test(c.msg) && /Mesa #3 \(60 cm\)/.test(c.msg) && c.itens.indexOf("i3") > 0; });
  t("[B erro] o erro de circulação traz NBR 9050 10.17.1, URL, data e a força de lei", function () { var F = E_(B, "circulacao")[0].fonte; return /10\.17\.1/.test(F.texto) && /^https:\/\//.test(F.url) && F.acesso === "2026-10-10" && /Decreto 5\.296/.test(F.forca); });
  t("[C limite] corredor de exatos 90 cm não é erro: o mínimo da norma passa (só recomendação de 1,50 m)", function () { return S_(C, "circulacao") === "recomendacao"; });
  t("[C limite] 5 cm a menos (85 cm) é erro", function () { var p = M7.CENARIOS.limite(); p.itens[2].z_cm = 190; return S_(M7.validar(p), "circulacao") === "erro"; });
  t("[C limite] corredor de 150 cm: certo, sem recomendação", function () { var p = M7.CENARIOS.limite(); p.itens[2].z_cm = 255; return S_(M7.validar(p), "circulacao") === "ok"; });
  t("[A passa] a recomendação de 1,50 m nunca vira atenção nem erro (conflito 6.11.1 c × 10.17.1 sem fonte)", function () { return A.concat(B, C).every(function (a) { return a.fonte !== M7.FONTES.publico || a.status === "recomendacao"; }); });
  t("[geometria] móveis sobrepostos = erro físico, sem norma", function () { var p = M7.CENARIOS.passa(); p.itens[2].x_cm = 160; p.itens[2].z_cm = 40; return circ(p).some(function (a) { return a.status === "erro" && a.fonte === null && /mesmo chão/.test(a.msg); }); });
  t("[geometria] item fora da área = erro físico", function () { var p = M7.CENARIOS.passa(); p.itens[2].x_cm = 900; return circ(p).some(function (a) { return a.status === "erro" && /limite da área/.test(a.msg); }); });
  t("[rota] mesa na boca da entrada = erro que nomeia a mesa (a regra por pares dava ok)", function () { var p = M7.CENARIOS.passa(); p.itens[2].x_cm = 300; p.itens[2].z_cm = 410; return circ(p).some(function (a) { return a.status === "erro" && /entrada está fechada/.test(a.msg) && /Mesa #3/.test(a.msg); }); });
  t("[rota] manequim a 25 cm do canto não é erro: ninguém precisa passar atrás dele (a regra por pares dava erro)", function () { var p = M7.CENARIOS.passa(); p.itens[3].x_cm = 575; p.itens[3].z_cm = 80; return S_({ x: circ(p) }.x, "circulacao") !== "erro"; });
  t("[rota] arara virada para a parede: a frente fica sem acesso = erro", function () { var p = M7.CENARIOS.passa(); p.itens[1].rot = 180; return circ(p).some(function (a) { return a.status === "erro" && /Arara reta #2 \(pela frente\)/.test(a.msg); }); });
  t("[rota] corredor de 95 cm com 15 m e sem espaço de manobra = erro do 10.17.1", function () { var p = proj0([M7.item("i1", "parede", 850, 100, 0, [], { larg: 1700, prof: 10 }), M7.item("i2", "manequim", 1640, 150)], [1700, 200, 60]); p.area.entrada.larg_cm = 100;
    return circ(p).some(function (a) { return a.status === "erro" && /espaço de 1,20 m para manobrar/.test(a.msg); }); });
  t("[rota] o mesmo corredor com 1,60 m de largura não dá erro", function () { var p = proj0([M7.item("i1", "parede", 850, 30, 0, [], { larg: 1700, prof: 10 }), M7.item("i2", "manequim", 1640, 150)], [1700, 200, 60]); p.area.entrada.larg_cm = 100; return S_({ x: circ(p) }.x, "circulacao") !== "erro"; });
  /* 2 · densidade (fraca → recomendação) */
  t("[A passa] densidade: 21 peças em 120 cm = 17,5/m, dentro da faixa", function () { return S_(A, "densidade") === "ok"; });
  t("[B erro] densidade 28,3/m vira recomendação, nunca erro (fonte fraca)", function () { return S_(B, "densidade") === "recomendacao"; });
  t("[C limite] 30 peças em 120 cm = 25/m, o topo da faixa, passa; 31 (25,8/m) já é recomendação", function () { var p = M7.CENARIOS.limite(); p.itens[1].pecas.push("wl-jeans-38"); return S_(C, "densidade") === "ok" && S_(M7.validar(p), "densidade") === "recomendacao"; });
  t("[densidade] arara circular de 100 cm tem 258 cm de trilho: 45 peças = 17,4/m passa, 40 = 15,5/m não", function () { var mk = function (n) { return proj0([M7.item("i1", "arara_circular", 300, 200, 0, M7.rep("wl-jeans-38", n))]); }; return S_(M7.validar(mk(45)), "densidade") === "ok" && S_(M7.validar(mk(40)), "densidade") === "recomendacao"; });
  /* 3 · tipo junto · 4 · blocos de cor · 5 · grade (média: erro) */
  t("[A passa] tipo junto, blocos e grade: certos", function () { return S_(A, "tipojunto") === "ok" && S_(A, "blocos") === "ok" && S_(A, "grade") === "ok"; });
  t("[B erro] tipo junto: jeans em dois trechos = erro, com CottonWorks citado", function () { var a = E_(B, "tipojunto")[0]; return a.status === "erro" && /Calça jeans/.test(a.msg) && /cottonworks/.test(a.fonte.url) && a.fonte.nivel === "media"; });
  t("[blocos] marrom e depois rosa na mesma calça: o mais claro depois do escuro = erro", function () { var p = proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-marrom-38", "alf-rosa-38"])]); return S_(M7.validar(p), "blocos") === "erro"; });
  t("[blocos] rosa, jeans e marrom (claro → escuro) = certo; rosa, marrom, rosa = dois blocos = erro", function () {
    var a = M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-rosa-38", "wl-jeans-38", "wl-marrom-38"])])), b = M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-rosa-38", "alf-marrom-38", "alf-rosa-40"])]));
    return S_(a, "blocos") === "ok" && S_(b, "blocos") === "erro"; });
  t("[blocos] L* com empate: marrom e azul royal (ΔL* < 6) empatam; preto e depois off white (claro depois do escuro) = erro", function () { return Math.abs(M7.lstar(M7.CORES.marrom.hex) - M7.lstar(M7.CORES.azul.hex)) < M7.EMPATE && Math.abs(M7.lstar(M7.CORES.offwhite.hex) - M7.lstar(M7.CORES.branco.hex)) > M7.EMPATE && S_(M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["sl-preto-P", "sl-offwhite-P"])])), "blocos") === "erro"; });
  t("[grade] 38 depois de 36 na mesma peça e cor = ok; 36 depois de 38 = erro", function () { return S_(M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-rosa-36", "alf-rosa-38"])])), "grade") === "ok" && S_(M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-rosa-38", "alf-rosa-36"])])), "grade") === "erro"; });
  t("[grade] P, M, G em letras também vale: G antes de P = erro", function () { return S_(M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["sl-preto-G", "sl-preto-P"])])), "grade") === "erro"; });
  /* 6 · altura dos olhos (fraca) */
  t("[A passa] olhos: manequim de 1,75 m tem o look a 1,31 m, dentro de 1,10–1,60 m", function () { return S_(A, "olhos") === "ok"; });
  t("[olhos] manequim de 2,60 m = recomendação; arara sem nenhum ponto focal = recomendação", function () { var p = M7.CENARIOS.passa(); p.itens[3].alt = 260; var q = proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-rosa-38"])]); return S_(M7.validar(p), "olhos") === "recomendacao" && S_(M7.validar(q), "olhos") === "recomendacao"; });
  /* 7 · manequim com look completo (média; base = atenção, 3ª peça e tamanho = recomendação) */
  t("[A passa] look: cima + baixo + blazer, mesmo tamanho (M = 38) = certo", function () { return S_(A, "look") === "ok"; });
  t("[B erro] look: manequim só com a calça = atenção (falta a parte de cima)", function () { var a = E_(B, "look")[0]; return a.status === "atencao" && /parte de cima/.test(a.msg); });
  t("[look] sem a 3ª peça ou com tamanhos diferentes = recomendação; vestido sozinho conta como base", function () {
    var mk = function (pc) { return M7.validar(proj0([M7.item("i1", "manequim", 300, 200, 0, pc)])); };
    return S_(mk(["cm-branco-M", "wl-jeans-38"]), "look") === "recomendacao" && S_(mk(["cm-branco-P", "wl-jeans-42", "bz-offwhite-M"]), "look") === "recomendacao" && S_(mk(["vm-azul-M"]), "look") === "recomendacao" && S_(mk(["vm-azul-M", "bz-offwhite-M"]), "look") === "ok"; });
  /* 8 · vitrine sem excesso (fraca) */
  t("[vitrine] 8 peças passam; 9 = recomendação (\"se acha que precisa de 12, ponha 8\")", function () { var mk = function (n) { return proj0([M7.item("i1", "vitrine", 300, 380, 0, M7.rep("cm-branco-M", n))]); }; return S_(M7.validar(mk(8)), "vitrine") === "ok" && S_(M7.validar(mk(9)), "vitrine") === "recomendacao"; });
  /* 9 · acesso ao provador e à saída (lei: 0,90 m, porta 0,80 m, provador 1,20 × 1,20 m) */
  t("[A passa] acesso: provador acessível, porta de 90 cm, caminho de 0,90 m", function () { return S_(A, "acesso") === "ok"; });
  t("[B erro] acesso: porta de 70 cm = erro com a NBR 6.11.2.1 e a Emenda 1", function () { var a = E_(B, "acesso")[0]; return a.status === "erro" && /70 cm/.test(a.msg) && /6\.11\.2\.1/.test(a.fonte.texto); });
  t("[C limite] acesso: porta de exatos 80 cm passa; 79 cm é erro", function () { var p = M7.CENARIOS.limite(); p.itens[5].larg = 79; return S_(C, "acesso") !== "erro" && S_(M7.validar(p), "acesso") === "erro"; });
  t("[acesso] provador de 100 × 100 cm tem 92 × 96 por dentro: não é acessível = erro (10.17.2)", function () { var p = M7.CENARIOS.passa(); p.itens[4].larg = 100; p.itens[4].prof = 100; return E_(M7.validar(p), "acesso").some(function (a) { return a.status === "erro" && /Nenhum provador acessível/.test(a.msg); }); });
  t("[acesso] provador de frente para a parede do fundo = erro (sem acesso pela cortina)", function () { var p = M7.CENARIOS.passa(); p.itens[4].x_cm = 540; p.itens[4].z_cm = 70; p.itens[4].rot = 180; return E_(M7.validar(p), "acesso").some(function (a) { return a.status === "erro" && /Provador #5/.test(a.msg); }); });
  t("[acesso] frente do provador sem 1,50 m para girar = recomendação (inferência, fonte fraca)", function () { return E_(C, "acesso").concat(E_(M7.validar(M7.CENARIOS.passa()), "acesso")).every(function (a) { return a.status !== "recomendacao" || a.fonte.nivel === "fraca"; }); });
  t("[corrigir] \"Reordenar a arara\" do cenário B deixa tipo junto, blocos e grade certos; nada mais muda de lugar", function () { var p = M7.CENARIOS.erro(), a = E_(M7.validar(p), "tipojunto")[0]; var antes = JSON.stringify(p.itens.map(function (it) { return [it.id, it.x_cm, it.z_cm]; })); M7.aplicarCorrecao(p, a.corrige); var v = M7.validar(p); return a.corrige.k === "ordenar" && ["tipojunto", "blocos", "grade"].every(function (r) { return S_(v, r) === "ok"; }) && JSON.stringify(p.itens.map(function (it) { return [it.id, it.x_cm, it.z_cm]; })) === antes && p.itens[1].pecas.length === 34; });
  t("[corrigir] \"Alargar a porta para 80 cm\" tira o erro de acesso; \"Aumentar o provador\" também", function () { var p = M7.CENARIOS.erro(), a = E_(M7.validar(p), "acesso").filter(function (x) { return x.corrige; })[0]; M7.aplicarCorrecao(p, a.corrige); var q = M7.CENARIOS.passa(); q.itens[4].larg = 100; q.itens[4].prof = 100; var b = E_(M7.validar(q), "acesso").filter(function (x) { return x.corrige; })[0]; M7.aplicarCorrecao(q, b.corrige); return a.corrige.campos.larg === 80 && S_(M7.validar(p), "acesso") !== "erro" && S_(M7.validar(q), "acesso") === "ok"; });
  t("[corrigir] vitrine com 11 peças: \"Tirar as últimas 3\" deixa 8 e a regra passa", function () { var p = proj0([M7.item("i1", "vitrine", 300, 380, 0, M7.rep("cm-branco-M", 11))]), a = E_(M7.validar(p), "vitrine")[0]; M7.aplicarCorrecao(p, a.corrige); return a.corrige.n === 3 && p.itens[0].pecas.length === 8 && S_(M7.validar(p), "vitrine") === "ok"; });
  t("[corrigir] só há botão de correção onde a correção é objetiva: circulação e densidade não têm", function () { return B.filter(function (a) { return a.regra === "circulacao" || a.regra === "densidade"; }).every(function (a) { return !a.corrige; }); });
  /* nota e fontes */
  t("[nota] A = 10; B abaixo de 5; a nota mais as correções possíveis fecham 10 (±0,2)", function () { var a = M7.nota(A), b = M7.nota(B), soma = b.nota + b.regras.reduce(function (s, r) { return s + r.impacto; }, 0); return a.nota === 10 && b.nota < 5 && Math.abs(soma - 10) <= .2; });
  t("[nota] as 3 correções vêm do maior para o menor impacto, no máximo 3, só de regras com problema", function () { var b = M7.nota(B), i = b.top3.map(function (r) { return r.impacto; }); return b.top3.length === 3 && i[0] >= i[1] && i[1] >= i[2] && b.top3.every(function (r) { return r.pior !== "ok"; }); });
  t("[nota] cenário vazio: sem nota (não inventa 10)", function () { return M7.nota(M7.validar(proj0([]))).nota === null; });
  t("[fontes] fonte fraca nunca é erro; erro só com lei, regra do guia (média) ou física (sem fonte)", function () { return A.concat(B, C).every(function (a) { return a.status !== "erro" || !a.fonte || a.fonte.nivel === "lei" || a.fonte.nivel === "media"; }) && A.concat(B, C).every(function (a) { return !a.fonte || a.fonte.nivel !== "fraca" || a.status === "ok" || a.status === "recomendacao"; }); });
  t("[fontes] toda fonte tem texto, URL, data de acesso e força", function () { return Object.keys(M7.FONTES).every(function (k) { var F = M7.FONTES[k]; return F.texto && F.url && /^2026-\d\d-\d\d$/.test(F.acesso) && F.forca && ["lei", "media", "fraca"].indexOf(F.nivel) >= 0; }); });
  t("[regras] são 9, e cada uma aparece em pelo menos um dos 3 cenários ou nas variações acima", function () { return M7.REGRAS.length === 9 && ["circulacao", "densidade", "tipojunto", "blocos", "grade", "olhos", "look", "acesso"].every(function (r) { return A.concat(B, C).some(function (a) { return a.regra === r; }); }); });
  t("[projeto] checarProjeto aceita os 3 cenários e recusa NaN, tipo desconhecido, peça inventada e peça no modo errado", function () {
    var ok = ["passa", "erro", "limite"].every(function (k) { return M7.checarProjeto(M7.CENARIOS[k]()) === null; }), ruim = function (f) { var p = M7.CENARIOS.passa(); f(p); return typeof M7.checarProjeto(p) === "string"; };
    return ok && ruim(function (p) { p.itens[0].larg = NaN; }) && ruim(function (p) { p.itens[0].tipo = "sofa"; }) && ruim(function (p) { p.itens[1].pecas.push("xx-rosa-36"); }) && ruim(function (p) { p.itens[1].pecas.push("cm-branco-M"); }) && ruim(function (p) { p.area.larg_cm = 5; }) && ruim(function (p) { p.itens[1].id = p.itens[0].id; }); });
  /* ---------- Dev1 r2: o comportamento certo primeiro; cada linha mata uma mutação que sobrevivia aos testes da 05 ---------- */
  t("[rota · Dev1] manequim no canto: as 2 paredes a 90° não são corredor; sem recomendação de 1,50 m", function () { return S_({ x: circ(proj0([M7.item("i1", "manequim", 40, 40, 0, ["cm-branco-M", "wl-jeans-38", "bz-offwhite-M"])])) }.x, "circulacao") === "ok"; });
  t("[rota · Dev1] corredor de 1,40 m entre a arara e a mesa: recomendação que diz a largura medida; com 1,50 m, certo", function () {
    var mk = function (vao) { return proj0([M7.item("i1", "arara_reta", 300, 40, 0, M7.rep("wl-jeans-38", 20)), M7.item("i2", "mesa", 300, 65 + vao + 40, 0, M7.rep("cm-branco-M", 6), { larg: 300 })]); };
    var a = E_(circ(mk(140)), "circulacao")[0]; return a.status === "recomendacao" && /1,40 m no ponto mais estreito/.test(a.msg) && S_({ x: circ(mk(150)) }.x, "circulacao") === "ok"; });
  t("[nota · Dev1] o impacto prometido é o ganho real: corrigir só a circulação (1,50 m) sobe a nota exatamente o impacto dela", function () {
    var p = M7.CENARIOS.limite(); p.itens[1].pecas = ["alf-marrom-38", "alf-rosa-38"].concat(M7.rep("wl-jeans-38", 28)); var n = M7.nota(M7.validar(p)), r = n.regras.filter(function (x) { return x.regra === "circulacao"; })[0];
    var q = JSON.parse(JSON.stringify(p)); q.itens[2].z_cm = 255; var m = M7.nota(M7.validar(q)); return r.pior === "recomendacao" && r.impacto > 0 && Math.abs(m.nota - n.nota - r.impacto) <= .1; });
  t("[acesso · Dev1] 2 provadores, 1 acessível (130×130) e 1 pequeno (100×100): certo, a norma pede pelo menos um", function () { var p = M7.CENARIOS.passa(); p.itens.push(M7.item("i7", "provador", 70, 380, 270, [], { larg: 100, prof: 100 })); return !E_(M7.validar(p), "acesso").some(function (a) { return a.status === "erro"; }); });
  t("[acesso · Dev1] saída a 16 m da entrada por um corredor de 95 cm sem espaço de manobra = erro do 10.17.1 também no acesso", function () { var p = proj0([M7.item("i1", "parede", 850, 100, 0, [], { larg: 1700, prof: 10 }), M7.item("i2", "porta", 1695, 150, 90)], [1700, 200, 60]); p.area.entrada.larg_cm = 100;
    return E_(M7.validar(p), "acesso").some(function (a) { return a.status === "erro" && /espaço de 1,20 m para manobrar/.test(a.msg); }); });
  t("[olhos · Dev1] vitrine com look é ponto focal: arara + vitrine, sem manequim, não pede ponto focal", function () { var p = proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["alf-rosa-38"]), M7.item("i2", "vitrine", 300, 400, 0, ["cm-branco-M", "wl-jeans-38"])]); return S_(M7.validar(p), "olhos") === ""; });
  t("[look · Dev1] cima M + baixo 38 + blazer G: tamanhos diferentes no 3º = recomendação", function () { return S_(M7.validar(proj0([M7.item("i1", "manequim", 300, 200, 0, ["cm-branco-M", "wl-jeans-38", "bz-offwhite-G"])])), "look") === "recomendacao"; });
  t("[blocos · Dev1] empate de L*: cor 2 pontos mais clara depois da escura = certo (ΔL* < 6); o catálogo não tem par assim, a cor de teste entra e sai", function () {
    M7.CORES.t1 = { nome: "T1", hex: "#6B4632" }; M7.CORES.t2 = { nome: "T2", hex: "#704B37" }; M7.MODELOS.push({ mod: "tx", nome: "Teste", tipo: "Teste", modo: "pendura", camada: "cima", cores: ["t1", "t2"], tams: ["M"] });
    try { var d = M7.lstar("#704B37") - M7.lstar("#6B4632"); return d > 0 && d < M7.EMPATE && S_(M7.validar(proj0([M7.item("i1", "arara_reta", 160, 40, 0, ["tx-t1-M", "tx-t2-M"])])), "blocos") === "ok"; }
    finally { M7.MODELOS.pop(); delete M7.CORES.t1; delete M7.CORES.t2; } });
  return T;
};

/* ---------- sugestão: 3 cenários de recursos (o do pedido, uma multimarca e um que não cabe) ---------- */
M7.testesSugestao = function () {
  var T = [], t = function (n, f) { T.push([n, f]); }, R = M7.RECURSOS, cache = {};
  function sug(k) { return cache[k] || (cache[k] = M7.sugerir(JSON.parse(JSON.stringify(R[k])))); }
  function contar(p, tipo) { return p.itens.filter(function (it) { return it.tipo === tipo; }).length; }
  function pedido(k, tipo) { return R[k].itens.filter(function (l) { return l.tipo === tipo; }).reduce(function (s, l) { return s + l.qtd; }, 0); }
  ["pedido", "multi", "naoCabe"].forEach(function (k) {
    t("[" + k + "] mesma entrada, mesma saída: o hash do resultado inteiro é igual em 2 execuções", function () { var a = M7.hash(M7.sugerir(JSON.parse(JSON.stringify(R[k])))), b = M7.hash(M7.sugerir(JSON.parse(JSON.stringify(R[k])))); return a === b && /^[0-9a-f]{8}$/.test(a); });
    t("[" + k + "] devolve de 1 a 3 variações, todas passam no validador sem nenhum erro", function () { var s = sug(k); return s.variacoes.length >= 1 && s.variacoes.length <= 3 && s.variacoes.every(function (v) { return !M7.validar(v.projeto).some(function (a) { return a.status === "erro"; }); }); });
    t("[" + k + "] não inventa item: cada tipo aparece no máximo quantas vezes foi pedido", function () { return sug(k).variacoes.every(function (v) { return Object.keys(M7.TIPOS).every(function (tp) { return contar(v.projeto, tp) <= pedido(k, tp); }); }); });
    t("[" + k + "] não inventa peça: o que está nos itens é subconjunto do que foi informado", function () { var estoque = M7.expandirPecas(R[k].pecas); return sug(k).variacoes.every(function (v) { var e = estoque.slice(); return v.projeto.itens.every(function (it) { return it.pecas.every(function (s) { var i = e.indexOf(s); if (i < 0) return false; e.splice(i, 1); return true; }); }); }); });
    t("[" + k + "] o projeto da variação passa em M7.checarProjeto e tem a área pedida", function () { return sug(k).variacoes.every(function (v) { return M7.checarProjeto(v.projeto) === null && v.projeto.area.larg_cm === R[k].area.larg_cm && v.projeto.area.prof_cm === R[k].area.prof_cm; }); });
    t("[" + k + "] as araras saem ordenadas: tipo junto, blocos de cor e grade certos", function () { return sug(k).variacoes.every(function (v) { var a = M7.validar(v.projeto); return ["tipojunto", "blocos", "grade"].every(function (r) { return E_(a, r).every(function (x) { return x.status === "ok"; }); }); }); });
    t("[" + k + "] toda variação tem nome, nota e assinatura, e o layout difere entre variações", function () { var s = sug(k), l = s.variacoes.map(function (v) { return M7.hash(v.projeto.itens.map(function (it) { return [it.tipo, it.x_cm, it.z_cm, it.rot]; })); }); return s.variacoes.every(function (v) { return v.nome && v.nota >= 0 && v.nota <= 10 && /^[0-9a-f]{8}$/.test(v.hash); }) && l.filter(function (h, i) { return l.indexOf(h) === i; }).length === l.length; });
  });
  t("[pedido] 2 araras de parede, 2 mesas, 1 manequim, 1 provador e 1 parede: usa o que cabe e diz o resto", function () { var v = sug("pedido").variacoes[0].projeto; return contar(v, "parede") === 1 && contar(v, "mesa") === 2 && contar(v, "manequim") === 1 && contar(v, "provador") === 1 && contar(v, "arara_parede") >= 1; });
  t("[pedido] cada item tem ao menos 1 explicação (\"mesa na entrada porque…\") e a mesa cita a entrada", function () { var v = sug("pedido").variacoes[0], ids = {}; v.explicacoes.forEach(function (x) { ids[x.id] = 1; }); return v.projeto.itens.every(function (it) { return ids[it.id]; }) && v.explicacoes.some(function (x) { return /entrada/i.test(x.txt) && /porque|é a primeira|puxa|liga/i.test(x.txt); }) && v.explicacoes.every(function (x) { return x.txt.length > 20; }); });
  t("[pedido] o manequim sai com look completo (cima + baixo + 3ª peça, mesmo tamanho) e o validador concorda", function () { var v = sug("pedido").variacoes[0], mq = v.projeto.itens.filter(function (it) { return it.tipo === "manequim"; })[0], l = M7.avaliarLook(mq.pecas); return l.base && l.terceira && l.mesmoTam && S_(M7.validar(v.projeto), "look") === "ok"; });
  t("[pedido] pendura nas araras só o que pendura e dobra nas mesas só o que dobra", function () { return sug("pedido").variacoes.every(function (v) { return v.projeto.itens.every(function (it) { return it.pecas.every(function (s) { return M7.aceita(it.tipo, s); }); }); }); });
  t("[pedido] as araras ficam entre 16 e 25 peças por metro (a sobra vira \"ficou de fora\", não arara vazia)", function () { return sug("pedido").variacoes.every(function (v) { return v.projeto.itens.filter(function (it) { return M7.ARARAS[it.tipo]; }).every(function (it) { var pm = it.pecas.length / (M7.trilho(it) / 100); return pm >= 16 - 1e-9 && pm <= 25 + 1e-9; }); }); });
  t("[multi] multimarca: a explicação traz a divisa neutra na ponta da vizinha; na C&A não (a divisa só existe na multimarca)", function () { var m = sug("multi").variacoes[0].explicacoes.map(function (x) { return x.txt; }).join(" "), c = sug("pedido").variacoes[0].explicacoes.map(function (x) { return x.txt; }).join(" "); return /divisa neutra/.test(m) && /Multimarca/.test(m) && !/divisa neutra/.test(c) && /sem divisa/.test(c); });
  t("[multi] área pequena: onde o manequim não coube vem dito, com o motivo (90 cm), e nenhuma variação passa de 1 manequim", function () { var s = sug("multi"); return s.faltas.concat.apply(s.faltas, s.variacoes.map(function (v) { return v.soEsta; })).some(function (f) { return /Manequim/.test(f) && /90 cm/.test(f); }) && s.variacoes.some(function (v) { return contar(v.projeto, "manequim") === 0; }) && s.variacoes.every(function (v) { return contar(v.projeto, "manequim") <= 1; }); });
  t("[naoCabe] recurso insuficiente: diz o que falta em cm de arara e as 2 mesas que não couberam (com a contagem), sem inventar item", function () { var s = sug("naoCabe"); return s.faltas.some(function (f) { return /Mesa 120×80: 2 não couberam/.test(f); }) && s.faltas.some(function (f) { return /faltam \d+ cm de arara/.test(f); }) && s.variacoes.every(function (v) { return contar(v.projeto, "mesa") === 0 && contar(v.projeto, "arara_reta") === 1; }); });
  t("[entrada] área menor que 1 m ou sem itens: não monta nada e explica", function () { var a = M7.sugerir({ cenario: "cea", area: { larg_cm: 60, prof_cm: 200 }, itens: [{ tipo: "mesa", qtd: 1 }], pecas: [] }), b = M7.sugerir({ cenario: "cea", area: { larg_cm: 400, prof_cm: 300 }, itens: [], pecas: [] }); return !a.variacoes.length && /100 cm/.test(a.faltas[0]) && !b.variacoes.length && /pelo menos um item/.test(b.faltas[0]); });
  t("[ordem] a ordem da arara: tipo, depois do claro ao escuro, depois do menor ao maior (sku embaralhados voltam certos)", function () { var o = M7.ordenarArara(["wl-marrom-40", "alf-rosa-38", "alf-marrom-36", "wl-jeans-36", "alf-rosa-36", "wl-jeans-38"]); return o.join() === "alf-rosa-36,alf-rosa-38,alf-marrom-36,wl-jeans-36,wl-jeans-38,wl-marrom-40"; });
  /* ---------- Dev1 r2: entradas que não cabem, divisão das araras e descarte ---------- */
  var R2 = function (W, D, itens, pecas, cen) { return { cenario: cen || "cea", area: { larg_cm: W, prof_cm: D }, itens: itens, pecas: pecas }; };
  t("[sugestão · Dev1] 40 calças em 2 araras de 120 cm saem 20 + 20 (mesma densidade), não 30 + 10", function () { var s = M7.sugerir(R2(330, 300, [{ tipo: "arara_reta", qtd: 2 }], [{ mod: "wl", n: 4 }], "multi"));
    return s.variacoes.length && s.variacoes.every(function (v) { return v.projeto.itens.filter(function (it) { return M7.ARARAS[it.tipo]; }).map(function (it) { return it.pecas.length; }).join() === "20,20"; }); });
  t("[sugestão · Dev1] área de 1 × 1 m com arara e mesa: nenhuma variação (nada de projeto vazio com nota), e as faltas dizem o que não coube", function () { var s = M7.sugerir(R2(100, 100, [{ tipo: "arara_reta", qtd: 1 }, { tipo: "mesa", qtd: 1 }], [{ mod: "wl", n: 2 }]));
    return s.variacoes.length === 0 && s.faltas.some(function (f) { return /Arara reta 120×50/.test(f); }) && s.faltas.some(function (f) { return /Mesa 120×80/.test(f); }) && s.faltas.some(function (f) { return /faltam \d+ cm de arara/.test(f); }); });
  t("[sugestão · Dev1] provador 100×100 (92×96 por dentro): as variações saem sem ele, sem erro, e a falta pede um de 128×124", function () { var s = M7.sugerir(R2(500, 400, [{ tipo: "arara_parede", qtd: 1 }, { tipo: "provador", qtd: 1, larg: 100, prof: 100 }], [{ mod: "wl", n: 4 }]));
    return s.variacoes.length >= 1 && s.variacoes.every(function (v) { return !v.projeto.itens.some(function (it) { return it.tipo === "provador"; }); }) && s.faltas.some(function (f) { return /92 × 96/.test(f) && /128 × 124/.test(f); }); });
  t("[sugestão · Dev1] 12 araras em 330×300: a falta diz quantas não couberam (antes: 1 linha para 9 araras)", function () { var s = M7.sugerir(R2(330, 300, [{ tipo: "arara_reta", qtd: 12 }], [{ mod: "wl", n: 4 }], "multi"));
    return s.variacoes.every(function (v) { var l = s.faltas.concat(v.soEsta).join(" "), m = /Arara reta 120×50: (\d+) não couberam/.exec(l), n = v.projeto.itens.filter(function (it) { return it.tipo === "arara_reta"; }).length, f = /Arara reta 120 cm: (\d+) ficaram de fora/.exec(l); return m && f && +m[1] + n + +f[1] === 12; }); });
  t("[sugestão · Dev1] corner 330×300 (recurso multi): a 1ª variação tem corredor de 1,50 m e nota 10; a recomendação apaga quando cabe", function () { var v = sug("multi").variacoes[0]; return v.corredor === 150 && v.nota === 10; });
  t("[sugestão · Dev1] variação com 1 erro no validador é descartada (a outra vira a 1ª)", function () { var orig = M7.validar;
    M7.validar = function (p, r) { var l = orig(p, r); return /Araras em L/.test(p.nome) ? [{ regra: "circulacao", status: "erro", itens: [], msg: "erro de teste", fonte: null }].concat(l) : l; };
    try { var s = M7.sugerir(JSON.parse(JSON.stringify(R.pedido))); return s.variacoes.length >= 1 && s.variacoes.every(function (v) { return v.nome !== "Araras em L"; }) && s.descartadas.some(function (d) { return /Araras em L: erro de teste/.test(d); }); } finally { M7.validar = orig; } });
  t("[sugestão · Dev1] a explicação de cada arara diz a parede onde ela ficou de fato", function () { return ["pedido", "multi"].every(function (k) { return sug(k).variacoes.every(function (v) { return v.projeto.itens.filter(function (it) { return M7.ARARAS[it.tipo]; }).every(function (it) {
    var tx = v.explicacoes.filter(function (e) { return e.id === it.id; }).map(function (e) { return e.txt; }).join(" "), lado = it.rot === 0 ? /no fundo/ : it.rot === 270 ? /lateral esquerda/ : /lateral direita/; return lado.test(tx); }); }); }); });
  return T;
};

/* ---------- mutações: cada regra e a sugestão têm uma sabotagem que o teste precisa pegar ---------- */
M7.MUTACOES = [
  ["circulação: limiar 90 → 80 cm", function () { M7.LIMIAR.rota_min_cm = 80; }, "r", /C limite\] 5 cm/],
  ["circulação: sem espaço de manobra a cada 10 m (10 → 50 m)", function () { M7.LIMIAR.manobra_cada = 5000; }, "r", /corredor de 95 cm/],
  ["circulação: a frente das araras ignorada", function () { M7.naFrente = function () { return true; }; }, "r", /arara virada/],
  ["circulação: sobreposição não detectada", function () { M7.sobrepoe = function () { return false; }; }, "r", /sobrepostos/],
  ["densidade: teto da faixa 25 → 30/m", function () { M7.LIMIAR.faixa_max_m = 30; }, "r", /C limite\] 30 peças/],
  ["densidade: fonte fraca vira erro", function () { M7.TETO.fraca = "erro"; }, "r", /densidade 28,3/],
  ["tipo junto: regra desligada", function () { M7.REGRAS[2] = function () { return []; }; }, "r", /\[A passa\] tipo junto/],
  ["blocos de cor: empate de L* 6 → 60 (nunca acusa claro depois do escuro)", function () { M7.EMPATE = 60; }, "r", /L\* com empate/],
  ["grade de tamanhos: ordem de tamanho cega", function () { M7.ordTam = function () { return 0; }; }, "r", /\[grade\] 38/],
  ["altura dos olhos: faixa até 250 cm", function () { M7.LIMIAR.olho_max = 250; }, "r", /manequim de 2,60/],
  ["look: sempre completo", function () { M7.avaliarLook = function () { return { base: true, terceira: true, mesmoTam: true, n: 3 }; }; }, "r", /\[B erro\] look/],
  ["vitrine: limite 8 → 80 peças", function () { M7.LIMIAR.vitrine_max = 80; }, "r", /\[vitrine\]/],
  ["acesso: porta mínima 80 → 60 cm", function () { M7.LIMIAR.porta_min_cm = 60; }, "r", /C limite\] acesso/],
  ["acesso: provador acessível 120 → 60 cm por dentro", function () { M7.LIMIAR.provador_int = 60; }, "r", /provador de 100/],
  ["fontes: a regra do guia (média) vira só recomendação", function () { M7.TETO.media = "recomendacao"; }, "r", /B erro\] tipo junto/],
  ["nota: pesos todos iguais a 1 (a força da fonte some)", function () { M7.PESOS.lei = M7.PESOS.fisica = M7.PESOS.media = 1; }, "r", /\[nota\]/],
  ["correção: o botão Corrigir não muda nada", function () { M7.aplicarCorrecao = function () { return false; }; }, "r", /\[corrigir\] "Reordenar/],
  ["peça: pendura × dobra desligado", function () { M7.aceita = function () { return true; }; }, "r", /\[projeto\]/],
  ["sugestão: ordem da arara embaralhada", function () { M7.ordenarArara = function (l) { return l.slice().reverse(); }; }, "s", /\[ordem\]/],
  ["sugestão: passagem de 90 → 0 cm entre os itens", function () { M7.SUG.corredor = 0; M7.SUG.largo = 0; }, "s", /\[pedido\] devolve|\[pedido\] 2 araras/],
  ["sugestão: hash muda a cada chamada", function () { M7.hash = function () { return Math.random().toString(16).slice(2, 10).padEnd(8, "0"); }; }, "s", /\[pedido\] mesma entrada/],
  ["sugestão: look sempre vazio", function () { M7.avaliarLook = function () { return { base: false, terceira: false, mesmoTam: false, n: 0 }; }; }, "s", /\[pedido\] o manequim sai/]
];
M7.rodarLista = function (lista, parar) { var out = []; for (var i = 0; i < lista.length; i++) { var ok; try { ok = !!lista[i][1](); } catch (e) { ok = false; } out.push([lista[i][0], ok]); if (parar && !ok) break; } return out; };
M7.mutar = function () {
  var snap = { LIMIAR: Object.assign({}, M7.LIMIAR), TETO: Object.assign({}, M7.TETO), PESOS: Object.assign({}, M7.PESOS), SUG: Object.assign({}, M7.SUG), REGRAS: M7.REGRAS.slice(), EMPATE: M7.EMPATE,
    naFrente: M7.naFrente, sobrepoe: M7.sobrepoe, ordTam: M7.ordTam, avaliarLook: M7.avaliarLook, aceita: M7.aceita, ordenarArara: M7.ordenarArara, hash: M7.hash, aplicarCorrecao: M7.aplicarCorrecao }, saida = [];
  function volta() { Object.keys(snap).forEach(function (k) { var v = snap[k]; if (Array.isArray(v)) { M7[k].length = 0; v.forEach(function (x) { M7[k].push(x); }); } else if (v && typeof v === "object") { Object.keys(M7[k]).forEach(function (c) { delete M7[k][c]; }); Object.assign(M7[k], v); } else M7[k] = v; }); }
  M7.MUTACOES.forEach(function (m) { try { m[1](); var r = M7.rodarLista((m[2] === "s" ? M7.testesSugestao() : M7.testesRegras()).filter(function (x) { return m[3].test(x[0]); }), true), caiu = r.filter(function (x) { return !x[1]; })[0]; saida.push({ nome: m[0], caiu: !!r.length && !!caiu, teste: caiu ? caiu[0] : (r.length ? null : "teste alvo não encontrado") }); } finally { volta(); } });
  return saida;
};

/* ---------- #teste completo: regras, sugestão, mutações, interface real ---------- */
M7.rodarTestes = function () {
  var res = [], ok = function (n, c) { res.push((c ? "ok    " : "FALHA ") + n); }, E = M7.Ed, op = E.op, $ = function (s) { return document.querySelector(s); }, pausa = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var out = document.getElementById("teste-saida"); out.hidden = false; out.textContent = "Rodando o #teste…";
  var guardaProj = JSON.stringify(E.proj()), sec = function (nome, fn) { try { return fn(); } catch (e) { ok(nome + " quebrou no meio: " + e.message, false); } };
  M7.rodarLista(M7.testesRegras()).forEach(function (r) { ok(r[0], r[1]); });
  var nReg = res.length; M7.rodarLista(M7.testesSugestao()).forEach(function (r) { ok(r[0], r[1]); }); var nSug = res.length - nReg;

  /* ---- operações do editor, pela interface real ---- */
  sec("[interface]", function () {
    E.carregar(M7.CENARIOS.passa()); var tipos = Object.keys(M7.TIPOS);
    ok("[editor] a biblioteca tem os 11 tipos do pedido (parede, 3 araras, mesa, gôndola, manequim, vitrine, provador, caixa, porta)", tipos.length === 11 && document.querySelectorAll("#biblio [data-tipo]").length === 11);
    var n0 = E.proj().itens.length; $('#biblio [data-tipo="arara_reta"]').click(); var id = E.sel(), it = function () { return E.proj().itens.filter(function (x) { return x.id === id; })[0]; };
    ok("[editor] botão da biblioteca põe a arara e a escolhe", E.proj().itens.length === n0 + 1 && it().tipo === "arara_reta");
    var g = document.querySelector('#planta .it[data-id="' + id + '"]'); g.focus(); var x0 = it().x_cm, h0 = E.hist();
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    ok("[editor] na planta, seta → move 10 cm e entra no desfazer; o foco continua no item", it().x_cm === x0 + 10 && E.hist() === h0 + 1 && document.activeElement.dataset && document.activeElement.dataset.id === id);
    var campo = function (c, v) { var i = document.querySelector('#painel-item [data-campo="' + c + '"]'); i.value = v; i.dispatchEvent(new Event("change", { bubbles: true })); };
    campo("x_cm", 123); campo("z_cm", 287);
    ok("[editor] encaixe: a borda vai para a grade de 10 cm; centro (123, 287) de uma arara 120×50 vira (120, 285)", it().x_cm === 120 && it().z_cm === 285);
    document.activeElement.blur(); document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "r", bubbles: true }));
    ok("[editor] R gira 15°", it().rot === 15);
    $('#painel-item [data-acao="duplicar"]').click(); var dup = E.sel();
    ok("[editor] duplicar copia medidas e desloca 30 cm", dup !== id && E.proj().itens.length === n0 + 2 && E.proj().itens.filter(function (x) { return x.id === dup; })[0].x_cm === it().x_cm + 30);
    $('#painel-item [data-acao="apagar"]').click(); ok("[editor] apagar tira o item", !E.proj().itens.some(function (x) { return x.id === dup; }));
    $("#b-desfaz").click(); ok("[editor] desfazer devolve o item apagado", E.proj().itens.some(function (x) { return x.id === dup; }));
    $("#b-refaz").click(); ok("[editor] refazer apaga de novo", !E.proj().itens.some(function (x) { return x.id === dup; }));
    E.selecionar(id); campo("larg", 150); campo("alt", 170);
    ok("[editor] largura e altura pelo painel (alternativa às alças do 3D)", it().larg === 150 && it().alt === 170 && M7.Cena.contagem().itens === E.proj().itens.length);
    E.carregar(M7.CENARIOS.passa()); var par = M7.item("tmp", "arara_reta", 300, 300); E.op.adicionar("parede"); var pid = E.sel(); E.op.mover(pid, 300, 300);
    var pp = E.proj().itens.filter(function (x) { return x.id === pid; })[0], antesX = pp.x_cm; E.op.mover(pid, 300, 20); pp = E.proj().itens.filter(function (x) { return x.id === pid; })[0];
    ok("[editor] mover pelo painel/teclado encaixa a borda na grade e não puxa para a parede (só o arrasto gruda): parede de 10 cm em z = 20 vai para 25", pp.z_cm === 25);
    /* peças */
    E.carregar(M7.CENARIOS.passa()); E.selecionar("i2");
    ok("[peças] camiseta (estica com o próprio peso) é recusada na arara, com o motivo", op.porPeca("i2", "cm-branco-M") === false && /dobrar/.test($("#vivo").textContent));
    E.abrirAba("pecas"); var bt = $('[data-mod="cm"] [data-por]'), why = $('[data-mod="cm"] .porque');
    ok("[peças] o botão Pôr da camiseta fica desligado com o motivo à vista (não só no leitor de tela)", bt.disabled && why && why.offsetParent !== null && /dobrar/.test(why.textContent));
    var p0 = M7.Cena.contagem().penduradas; $('[data-mod="alf"] [data-por]').click();
    ok("[peças] o botão Pôr pendura a alfaiataria e o 3D ganha 1 peça", E.proj().itens[1].pecas.length === 22 && M7.Cena.contagem().penduradas === p0 + 1);
    ok("[peças] alfaiataria (vinca) é recusada na mesa; camiseta entra e vira pilha", op.porPeca("i3", "alf-rosa-38") === false && op.porPeca("i3", "cm-preto-M") === true);
    E.carregar(proj0Teste()); E.selecionar("i1");
    ok("[look] manequim recebe peças até 4 (look por camada) e recusa a 5ª com aviso", ["cm-branco-M", "wl-jeans-38", "bz-offwhite-M", "alf-rosa-38"].every(function (s) { return op.porPeca("i1", s); }) && op.porPeca("i1", "sl-preto-M") === false && /4 peças/.test($("#vivo").textContent));
    ok("[look] o painel do manequim lista as peças com Tirar e o validador conclui o look", document.querySelectorAll("#painel-pecas .look li").length === 4 && E.achados().some(function (a) { return a.regra === "look"; }));
    /* trilho do guia */
    E.carregar(M7.CENARIOS.passa()); E.selecionar("i2"); var cab = function (k) { return document.querySelector('#cabides [data-k="' + k + '"]'); }, tecla = function (k) { document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); };
    var ord = E.proj().itens[1].pecas.join(), it2 = function () { return E.proj().itens[1]; }; cab(1).focus(); tecla("ArrowRight");
    ok("[trilho] → sem pegar só move o foco", it2().pecas.join() === ord && document.activeElement === cab(2));
    tecla(" "); tecla("ArrowRight"); ok("[trilho] Espaço pega e → leva a peça", it2().pecas[3] !== undefined && it2().pecas.join() !== ord && /posição 4 de 21/.test($("#vivo").textContent));
    tecla("Escape"); ok("[trilho] Esc devolve a peça à origem", it2().pecas.join() === ord && E.pego() === null && document.activeElement === cab(2));
    var h1 = E.hist(); tecla(" "); tecla("ArrowRight"); tecla(" ");
    ok("[trilho] Espaço solta e a jogada entra no desfazer", E.hist() === h1 + 1 && it2().pecas.join() !== ord);
    /* conferência */
    E.carregar(M7.CENARIOS.erro()); E.abrirAba("conf");
    ok("[conferência] a nota aparece grande e bate com M7.nota; as 3 correções listam regra e ganho", $("#nota-n").textContent === String(M7.nota(E.achados()).nota).replace(".", ",") && document.querySelectorAll("#top3 li").length === 3 && /\+\d/.test($("#top3").textContent));
    ok("[conferência] erro vem antes de atenção e de recomendação; cada achado mostra a fonte e a força", E.achados()[0].status === "erro" && document.querySelector("#achados .ach").classList.contains("erro") && document.querySelectorAll("#achados details").length === E.achados().length);
    var h2 = E.hist(), btc = $("#achados [data-corrige]"); btc.click();
    ok("[conferência] o botão Corrigir do 1º achado com correção muda o projeto (1 passo no desfazer) e o erro some da lista", E.hist() === h2 + 1 && !E.achados().some(function (a) { return a.corrige && a.regra === "tipojunto"; }) && /Corrigido/.test($("#vivo").textContent)); $("#b-desfaz").click();
    $("#top3 [data-ir-regra]").click(); ok("[conferência] \"Ver no lugar\" da 1ª correção escolhe o item com problema", E.sel() !== null);
    ok("[conferência] marca de erro no 3D e na planta (triângulo); o fio do caminho existe nos dois", M7.Cena.contagem().marcas >= 2 && document.querySelectorAll('#planta .marca[href="#i-erro"]').length >= 2 && document.querySelectorAll("#planta .fio").length >= 1 && M7.Cena.contagem().fio > 10);
    ok("[conferência] a aba Conferir mostra a contagem de erros", !$("#n-erros").hidden && +$("#n-erros").textContent === E.achados().filter(function (a) { return a.status === "erro"; }).length);
    /* abas por teclado */
    $("#aba-conf").focus(); $("#aba-conf").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    ok("[abas] → move para a aba Peças, só ela fica com tabindex 0 e o painel certo aparece", $("#aba-pecas").getAttribute("aria-selected") === "true" && $("#aba-pecas").tabIndex === 0 && $("#aba-conf").tabIndex === -1 && $("#p-pecas").hidden === false && $("#p-conf").hidden === true); E.abrirAba("conf");
  });

  /* ---- salvar, abrir, importar, exportar ---- */
  sec("[projeto]", function () {
    E.store.gravar(E.CHAVE, []); E.carregar(M7.CENARIOS.passa()); $("#in-nome").value = "Teste A"; $("#in-nome").dispatchEvent(new Event("change")); E.salvar();
    var l = E.lista(); ok("[salvar] grava no aparelho (localStorage) com nome, data e o projeto inteiro", l.length === 1 && l[0].nome === "Teste A" && l[0].projeto.itens.length === 6 && !isNaN(Date.parse(l[0].quando)));
    E.carregar(M7.CENARIOS.erro()); document.querySelector('#salvos [data-abre]').click();
    ok("[abrir] a lista de salvos reabre o projeto e o Ctrl+Z volta ao anterior", E.proj().nome === "Teste A" && E.proj().itens[1].pecas.length === 21 && E.hist() > 0);
    E.salvar(); ok("[salvar] salvar de novo o mesmo projeto atualiza, não duplica", E.lista().length === 1);
    var exportado = JSON.stringify(E.proj()), antes = JSON.stringify(E.proj());
    var ruins = [["texto que não é JSON", "{isto não é json"], ["JSON que não é projeto", "[1,2,3]"], ["versão desconhecida", JSON.stringify(Object.assign(JSON.parse(exportado), { versao: 9 }))], ["tipo de item desconhecido", exportado.replace('"arara_reta"', '"sofa"')], ["medida absurda", exportado.replace('"larg":120', '"larg":-5')], ["peça inventada", exportado.replace("alf-rosa-36", "zz-rosa-36")], ["vazio", ""]];
    ok("[importar] 7 arquivos inválidos são recusados com aviso e o projeto aberto fica igual (" + ruins.map(function (r) { return r[0]; }).join("; ") + ")", ruins.every(function (r) { return E.importar(r[1]).ok === false; }) && JSON.stringify(E.proj()) === antes && /não foi alterado/.test($("#msg-proj").textContent));
    E.carregar(M7.CENARIOS.limite()); var r = E.importar(exportado);
    ok("[importar] JSON exportado volta idêntico (ida e volta) e entra no desfazer", r.ok && JSON.stringify(E.proj()) === exportado && E.hist() > 0);
    ok("[exportar] a folha A4 tem 1 linha por item, o relatório com fonte e a planta", (function () { M7.Export.preencher(); var f = $("#folha-a4"); return f.querySelectorAll("tbody tr").length === E.proj().itens.length && f.querySelectorAll(".rel li").length === E.achados().length && !!f.querySelector("svg") && /acesso 2026-10-10/.test(f.textContent); })());
    E.store.gravar(E.CHAVE, []);
  });

  /* ---- offline: compara a origem de cada recurso com location.origin (e prova que o teste enxerga um recurso remoto) ---- */
  var remoto = function (u) { try { return new URL(u, location.href).origin !== location.origin; } catch (e) { return true; } };
  ok("[offline] o detector de recurso remoto vê https://exemplo.com e não vê a própria página", remoto("https://exemplo.com/x.js") === true && remoto("js/regras.js") === false && remoto(location.href) === false);
  ok("[offline] nenhum recurso carregado vem de outra origem (location.origin = " + location.origin + "): " + performance.getEntriesByType("resource").length + " recursos medidos", performance.getEntriesByType("resource").every(function (r) { return !remoto(r.name); }) && ![].some.call(document.querySelectorAll("script[src],link[href],img[src],iframe[src]"), function (e) { return remoto(e.src || e.href); }));
  var peq = [].filter.call(document.querySelectorAll(".bt,.cabide,.lista-itens button,.opcoes button,.abas button,.nota summary,.ach summary"), function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); });
  ok("[geral] alvos de toque visíveis ≥ 44 px (" + peq.length + " menores)", peq.length === 0);

  /* ---- 40 itens + 200 peças: chamadas de desenho em movimento ≤ 60 ---- */
  sec("[desempenho]", function () { E.carregar(M7.projetoEstresse()); var c = M7.Cena.contagem(), calls = M7.Cena.quadro();
    ok("[desempenho] 40 itens e 200 peças: " + c.itens + " itens, " + (c.penduradas + 50) + " peças e " + calls + " chamadas de desenho por quadro (limite 60)", c.itens === 40 && c.penduradas === 150 && calls <= 60);
    E.carregar(JSON.parse(guardaProj)); });

  var fim = function () { var n = res.filter(function (l) { return l.indexOf("ok") === 0; }).length; return n; };
  /* ---- assíncronos: tela parada não desenha; sugestão pela interface com a linha do tempo; PNG ---- */
  return (async function () {
    /* Dev1 r2: a pausa fixa de 1,5 s falhou 1 vez em 3 (render de polimento ou câmera ainda chegando). Espera a cena assentar (0,5 s sem quadro, até 6 s) e só então mede */
    for (var esp = 0, qa = -1; esp < 12; esp++) { var qn = M7.Cena.contagem().quadros; if (qn === qa) break; qa = qn; await pausa(500); }
    var q0 = M7.Cena.contagem().quadros; await pausa(700); ok("[desempenho] com a tela parada (depois de assentar), 0 quadros desenhados em 0,7 s", M7.Cena.contagem().quadros === q0);
    try { E.abrirAba("sug"); var f = $("#form-sug"); f.dispatchEvent(new Event("submit", { cancelable: true })); await pausa(60);
      var cards = document.querySelectorAll("#sug-saida .card-var"), v0 = E.sugerir(E.recursosDoForm());
      ok("[sugestão] o formulário (20 m², 2 araras de parede, 2 mesas, manequim, provador, 6 modelos) gera " + cards.length + " variações com miniatura, nota e assinatura", cards.length >= 1 && cards.length <= 3 && cards[0].querySelector("svg") && /\d,\d\/10|10\/10/.test(cards[0].textContent) && v0.variacoes.length === cards.length);
      var antes = JSON.stringify(E.proj()), esperado = M7.hash(v0.variacoes[0].projeto); document.querySelector("#sug-saida [data-monta]").click(); var tl = E.tl();
      ok("[sugestão] \"Montar esta\" começa uma linha do tempo GSAP e a área parte vazia", !!tl && E.proj().itens.length <= 1);
      tl.progress(1); await pausa(50);
      ok("[sugestão] terminada a linha do tempo, o projeto é exatamente o da variação (mesmo hash) e já passa no validador sem erro", M7.hash(E.proj()) === esperado && !E.achados().some(function (a) { return a.status === "erro"; }));
      ok("[sugestão] a lista de passos explica cada escolha e o Ctrl+Z volta ao projeto de antes", document.querySelectorAll("#sug-passos .passos li").length === E.proj().itens.length && (E.op.desfazer(), JSON.stringify(E.proj()) === antes));
    } catch (e) { ok("[sugestão] quebrou: " + e.message, false); }
    try { var b = await M7.Export.png(), buf = new Uint8Array(await b.arrayBuffer());
      ok("[exportar] PNG A4: assinatura PNG, 1240 px de largura e mais de 20 KB (" + Math.round(b.size / 1024) + " KB)", buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && ((buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19]) === 1240 && b.size > 20000);
    } catch (e) { ok("[exportar] PNG quebrou: " + e.message, false); }
    E.carregar(JSON.parse(guardaProj)); E.abrirAba("conf");
    /* ---- mutações ---- */
    var mu = M7.mutar(), caiu = mu.filter(function (m) { return m.caiu; }).length; mu.forEach(function (m) { ok("[mutação] " + m.nome + " → derruba: " + (m.teste || "NADA (o teste não pegou)").slice(0, 70), m.caiu); });
    var n = res.filter(function (l) { return l.indexOf("ok") === 0; }).length, txt = res.join("\n") + "\n" + n + "/" + res.length + " ok  (regras " + nReg + ", sugestão " + nSug + ", mutações " + caiu + "/" + mu.length + ")";
    out.textContent = txt; console.log("[teste] " + n + "/" + res.length + " ok"); return txt;
  })();
};
function proj0Teste() { var p = M7.novoProjeto(); p.itens = [M7.item("i1", "manequim", 300, 200)]; p.proxId = 2; return p; }

/* ---------- #estresse: 40 itens + 200 peças (150 penduradas, 50 dobradas) ---------- */
M7.projetoEstresse = function () {
  var p = M7.novoProjeto(), k = 1; p.nome = "Estresse · 40 itens + 200 peças"; p.area = { forma: "retangulo", larg_cm: 1600, prof_cm: 1200, entrada: { lado: "frente", x_cm: 800, larg_cm: 200 } };
  var add = function (t, x, z, pc, m) { p.itens.push(M7.item("i" + k++, t, x, z, 0, pc, m)); }, sk = ["alf-rosa-38", "alf-marrom-40", "wl-jeans-38", "wl-marrom-40", "sl-preto-M", "bz-offwhite-M"];
  for (var i = 0; i < 10; i++) add("parede", 160 * i + 80, 5, [], { larg: 160 });
  for (i = 0; i < 10; i++) { var pc = []; for (var j = 0; j < 15; j++) pc.push(sk[(i + Math.floor(j / 4)) % sk.length]); add("arara_reta", 160 * i + 80, 40, pc, { larg: 80 }); }
  for (i = 0; i < 5; i++) { pc = []; for (j = 0; j < 10; j++) pc.push(j < 5 ? "cm-branco-M" : "cm-preto-M"); add("mesa", 300 * i + 200, 420, pc); }
  for (i = 0; i < 10; i++) add("manequim", 150 * i + 120, 700);
  for (i = 0; i < 5; i++) add("provador", 300 * i + 200, 1000);
  p.proxId = k; return p;
};
M7.estresse = function (seg, pronto, ui) {
  var out = ui ? document.getElementById("saida-fps") : document.getElementById("teste-saida"); out.hidden = false;
  var t = performance.now(); M7.Ed.carregar(M7.projetoEstresse()); var tv = Math.round(performance.now() - t), c = M7.Cena.contagem(), dob = 50;
  out.textContent = "Medindo " + seg + " s com " + c.itens + " itens e " + (c.penduradas + dob) + " peças…";
  M7.Cena.medir(seg, function (r) {
    var txt = "fps com " + c.itens + " itens e " + (c.penduradas + dob) + " peças (" + c.penduradas + " penduradas + " + dob + " dobradas), câmera girando " + seg + " s:\n" +
      "  média " + r.media + " fps · p5 " + r.p5 + " fps (" + r.quadros + " quadros)\n" +
      "  chamadas de desenho em movimento: " + r.chamadas + (r.chamadas <= 60 ? " (≤ 60 ✔)" : " (> 60 ✘)") + " · " + r.triangulos + " triângulos · quadro " + r.px + "\n" +
      "  JS por quadro (atualizar + mandar desenhar): mediana " + r.jsMed + " ms · p95 " + r.jsP95 + " ms, de 16,7 ms que o 60 fps permite\n" +
      "  com 1/4 dos pixels (" + r.quarto.px + "): média " + r.quarto.media + " fps · p5 " + r.quarto.p5 + " fps · JS " + r.quarto.jsMed + " ms\n" +
      "  com a tela parada por 3 s: " + r.paradoQuadros + " quadros desenhados" + (r.paradoQuadros === 0 ? " (custo 0 ✔)" : " ✘") + "\n" +
      "  carregar + validar + desenhar: " + tv + " ms\n  placa de vídeo: " + M7.Cena.gpu() + "\n  navegador: " + navigator.userAgent.replace(/\s+/g, " ").slice(0, 110) + "\n" +
      "Para medir no seu notebook: 1) abra este arquivo no Chrome; 2) vá em Projeto → Medir fps (ou acrescente #estresse ao endereço); 3) espere 15 s e me mande este texto.";
    out.textContent = txt; console.log("[estresse] " + txt.replace(/\n/g, " | ")); if (pronto) pronto(r, c, txt);
  });
};
if (typeof location !== "undefined") {
  if (location.hash === "#teste") setTimeout(M7.rodarTestes, 400);
  if (location.hash === "#estresse") setTimeout(function () { M7.estresse(10); }, 400);
}
