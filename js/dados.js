/* Mindse7 · simulador de área · dados. Script clássico: abre por duplo clique (file://). */
var M7 = window.M7 || (window.M7 = {});

/* Cores: as do guia final (caso mindse7-vm). Tons de tela aproximados: lacuna herdada. */
M7.CORES = {
  offwhite: { nome: "Off white", hex: "#F1EDE3" }, branco: { nome: "Branco", hex: "#FFFFFF" },
  rosa: { nome: "Rosa", hex: "#E7A9B4" }, jeans: { nome: "Jeans médio", hex: "#5A7EA8" },
  marrom: { nome: "Marrom", hex: "#6B4632" }, azul: { nome: "Azul royal", hex: "#2747A6" }, preto: { nome: "Preto", hex: "#1C1B1B" }
};

/* Biblioteca: medidas de partida em cm (largura × profundidade × altura).
   recebe: pendura | dobra | look. alvo: a cliente precisa chegar a ele. frente: só se usa pelo lado +z do item (girar gira a frente).
   obstaculo: false = não ocupa chão (a porta é um vão na parede da área). */
M7.TIPOS = {
  parede:         { nome: "Parede",          larg: 300, prof: 10,  alt: 250, recebe: null,      alvo: false },
  arara_reta:     { nome: "Arara reta",      larg: 120, prof: 50,  alt: 150, recebe: "pendura", alvo: true, frente: true },
  arara_parede:   { nome: "Arara de parede", larg: 120, prof: 40,  alt: 160, recebe: "pendura", alvo: true, frente: true },
  arara_circular: { nome: "Arara circular",  larg: 100, prof: 100, alt: 140, recebe: "pendura", alvo: true },
  mesa:           { nome: "Mesa",            larg: 120, prof: 80,  alt: 75,  recebe: "dobra",   alvo: true },
  gondola:        { nome: "Gôndola",         larg: 120, prof: 50,  alt: 140, recebe: "dobra",   alvo: true, frente: true },
  manequim:       { nome: "Manequim",        larg: 50,  prof: 50,  alt: 175, recebe: "look",    alvo: true },
  vitrine:        { nome: "Vitrine",         larg: 200, prof: 80,  alt: 220, recebe: "look",    alvo: false },
  provador:       { nome: "Provador",        larg: 130, prof: 130, alt: 220, recebe: null,      alvo: true, frente: true },
  caixa:          { nome: "Caixa",           larg: 150, prof: 60,  alt: 100, recebe: null,      alvo: true, frente: true },
  porta:          { nome: "Porta",           larg: 90,  prof: 10,  alt: 210, recebe: null,      alvo: true, obstaculo: false }
};
M7.ARARAS = { arara_reta: 1, arara_parede: 1, arara_circular: 1 };
M7.trilho = function (it) { return it.tipo === "arara_circular" ? Math.PI * it.larg * .82 : it.larg; }; /* cm de trilho útil; o anel fica 18% para dentro */

/* Catálogo: mix real Mindse7 levantado no caso mindse7-vm (cea.com.br/mindset, acesso 2026-10-10).
   modo pelo critério do guia: estica com o próprio peso → dobra; vinca → pendura; jeans aguenta os dois.
   camada (look do manequim): cima, baixo, inteiro (vestido); o blazer também serve de 3ª peça. */
M7.MODELOS = [
  { mod: "alf", nome: "Calça alfaiataria com linho", tipo: "Calça alfaiataria", g: "g-calca-reta", modo: "pendura", camada: "baixo",   cores: ["rosa", "marrom"],    tams: [36, 38, 40, 42] },
  { mod: "wl",  nome: "Calça wide leg Chicago",      tipo: "Calça jeans",       g: "g-calca-wide", modo: "ambos",   camada: "baixo",   cores: ["jeans", "marrom"],   tams: [36, 38, 40, 42, 44] },
  { mod: "sl",  nome: "Saia longa de algodão",       tipo: "Saia longa",        g: "g-saia-longa", modo: "pendura", camada: "baixo",   cores: ["offwhite", "preto"], tams: ["P", "M", "G"] },
  { mod: "vm",  nome: "Vestido midi franzido",       tipo: "Vestido",           g: "g-vestido",    modo: "pendura", camada: "inteiro", cores: ["azul"],              tams: ["P", "M", "G"] },
  { mod: "bz",  nome: "Blazer de linho manga curta", tipo: "Blazer",            g: "g-blazer",     modo: "pendura", camada: "cima",    cores: ["offwhite"],          tams: ["P", "M", "G"] },
  { mod: "cm",  nome: "Camiseta classic de algodão", tipo: "Camiseta",          g: "g-camiseta",   modo: "dobra",   camada: "cima",    cores: ["branco", "preto"],   tams: ["P", "M", "G"] }
];
M7.GRADE = { PP: 0, P: 1, M: 2, G: 3, GG: 4 };
M7.ordTam = function (t) { return typeof t === "number" ? t : M7.GRADE[t]; };
/* P = 36 no look: equivalência proposta pelo guia (sem fonte) */
M7.tamLook = function (t) { return typeof t === "number" ? Math.round((t - 36) / 2) + 1 : M7.GRADE[t]; };
/* SKU = modelo-cor-tamanho */
M7.sku = function (s) {
  var p = String(s).split("-"), m = M7.MODELOS.filter(function (x) { return x.mod === p[0]; })[0];
  if (!m || m.cores.indexOf(p[1]) < 0) return null;
  var t = isNaN(+p[2]) ? p[2] : +p[2]; if (m.tams.indexOf(t) < 0) return null;
  return { sku: s, mod: m.mod, nome: m.nome, tipo: m.tipo, g: m.g, modo: m.modo, camada: m.camada, cor: p[1], tam: t };
};
M7.aceita = function (tipoItem, s) { var r = M7.TIPOS[tipoItem].recebe, k = M7.sku(s); return !!(r && k && (r === "look" || k.modo === r || k.modo === "ambos")); };
/* L* (CIE) da cor: claro → escuro com empate abaixo de 6 (regra do guia) */
M7.lstar = function (hex) { var v = [1, 3, 5].map(function (i) { var c = parseInt(hex.substr(i, 2), 16) / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
  var Y = .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; return Y > .008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
M7.EMPATE = 6;

/* Projeto: o mesmo esquema da r1 (e da 02). x_cm, z_cm = centro; z cresce do fundo (0) para a frente (prof_cm), onde fica a entrada. */
M7.novoProjeto = function () {
  return { versao: 2, nome: "Corner Mindse7", cenario: "cea",
    area: { forma: "retangulo", larg_cm: 600, prof_cm: 450, entrada: { lado: "frente", x_cm: 300, larg_cm: 120 } },
    itens: [], proxId: 1 };
};
M7.item = function (id, tipo, x, z, rot, pecas, med) {
  var T = M7.TIPOS[tipo], m = med || {};
  return { id: id, tipo: tipo, x_cm: x, z_cm: z, rot: rot || 0, larg: m.larg || T.larg, prof: m.prof || T.prof, alt: m.alt || T.alt, pecas: pecas || [] };
};
M7.rep = function (s, n) { var a = []; for (var i = 0; i < n; i++) a.push(s); return a; };

/* Três cenários fixos do #teste: passa, erro, caso-limite (todos os 9 tipos de regra aparecem). */
M7.CENARIOS = {
  passa: function () {
    var p = M7.novoProjeto(); p.nome = "A · passa";
    p.itens = [
      M7.item("i1", "parede", 300, 5, 0, [], { larg: 600 }),
      M7.item("i2", "arara_reta", 160, 40, 0, [].concat(M7.rep("alf-rosa-36", 3), M7.rep("alf-rosa-38", 3), M7.rep("alf-marrom-38", 4),
        M7.rep("wl-jeans-36", 4), M7.rep("wl-jeans-38", 4), M7.rep("wl-marrom-40", 3))),   /* 21 em 120 cm = 17,5/m */
      M7.item("i3", "mesa", 250, 240, 0, [].concat(M7.rep("cm-branco-M", 6), M7.rep("cm-preto-M", 6))),
      M7.item("i4", "manequim", 470, 45, 0, ["cm-branco-M", "wl-jeans-38", "bz-offwhite-M"]),
      M7.item("i5", "provador", 535, 300, 90),   /* girado: a cortina (frente) dá para o salão; 122 × 126 cm por dentro (NBR 10.17.2) */
      M7.item("i6", "porta", 595, 130, 90)       /* saída lateral: vão de 90 cm na parede da direita */
    ];
    p.proxId = 7; return p;
  },
  erro: function () {
    var p = M7.CENARIOS.passa(); p.nome = "B · com erro";
    p.itens[2].x_cm = 160; p.itens[2].z_cm = 165;   /* mesa a 60 cm da frente da arara: ninguém chega às peças */
    p.itens[1].pecas = [].concat(M7.rep("wl-jeans-38", 10), M7.rep("alf-rosa-38", 10), M7.rep("wl-jeans-40", 14)); /* 34 em 120 cm; jeans em 2 trechos */
    p.itens[3].pecas = ["wl-jeans-38"];               /* manequim só com a calça */
    p.itens[5].larg = 70;                             /* porta de 70 cm */
    return p;
  },
  limite: function () {
    var p = M7.CENARIOS.passa(); p.nome = "C · caso-limite";
    p.itens[2].x_cm = 160; p.itens[2].z_cm = 195; p.itens[2].larg = 200;   /* corredor de exatos 90 cm entre a arara e uma mesa de 2 m */
    p.itens[1].pecas = M7.rep("wl-jeans-38", 30);   /* 30 em 120 cm = 25/m, o topo da faixa */
    p.itens[5].larg = 80;                            /* porta no mínimo da norma */
    return p;
  }
};

/* Confere um projeto vindo de fora (JSON importado): devolve o texto do 1º defeito, ou null se está tudo bem. Nada é gravado antes disso. */
M7.checarProjeto = function (o) {
  var num = function (v, a, b) { return typeof v === "number" && isFinite(v) && v >= a && v <= b; };
  if (!o || typeof o !== "object" || Array.isArray(o)) return "o arquivo não é um projeto (esperava um objeto JSON).";
  if (o.versao !== 1 && o.versao !== 2) return "versão do projeto desconhecida (" + String(o.versao).slice(0, 10) + ").";
  if (typeof o.nome !== "string" || !o.nome.trim() || o.nome.length > 60) return "o nome do projeto falta ou passa de 60 letras.";
  if (o.cenario !== "cea" && o.cenario !== "multi") return "o cenário deve ser \"cea\" ou \"multi\".";
  var A = o.area; if (!A || !num(A.larg_cm, 100, 3000) || !num(A.prof_cm, 100, 3000)) return "a área precisa de larg_cm e prof_cm entre 100 e 3000.";
  if (!A.entrada || !num(A.entrada.x_cm, 0, A.larg_cm) || !num(A.entrada.larg_cm, 60, A.larg_cm)) return "a entrada precisa de x_cm dentro da área e larg_cm de pelo menos 60.";
  if (!Array.isArray(o.itens) || o.itens.length > 300) return "a lista de itens falta ou passa de 300.";
  var ids = {};
  for (var i = 0; i < o.itens.length; i++) { var it = o.itens[i], r = "item " + (i + 1) + ": ";
    if (!it || typeof it.id !== "string" || !/^i\d{1,6}$/.test(it.id) || ids[it.id]) return r + "id ausente, fora do formato iN ou repetido."; ids[it.id] = 1;
    if (!M7.TIPOS[it.tipo]) return r + "tipo desconhecido (" + String(it.tipo).slice(0, 20) + ").";
    if (!num(it.x_cm, -3000, 6000) || !num(it.z_cm, -3000, 6000) || !num(it.rot, 0, 360)) return r + "posição ou giro fora do intervalo.";
    if (!num(it.larg, 5, 3000) || !num(it.prof, 5, 3000) || !num(it.alt, 5, 1000)) return r + "medidas fora do intervalo (5 a 3000 cm).";
    if (!Array.isArray(it.pecas) || it.pecas.length > 600) return r + "a lista de peças falta ou passa de 600.";
    for (var j = 0; j < it.pecas.length; j++) if (typeof it.pecas[j] !== "string" || !M7.sku(it.pecas[j])) return r + "peça desconhecida (" + String(it.pecas[j]).slice(0, 24) + ").";
    if (it.pecas.length && !M7.TIPOS[it.tipo].recebe) return r + M7.TIPOS[it.tipo].nome + " não recebe peças.";
    for (j = 0; j < it.pecas.length; j++) if (!M7.aceita(it.tipo, it.pecas[j])) return r + "a peça " + it.pecas[j] + " não é do modo de " + M7.TIPOS[it.tipo].nome + ".";
  }
  if (!num(o.proxId, 1, 1e7)) return "proxId ausente.";
  return null;
};
