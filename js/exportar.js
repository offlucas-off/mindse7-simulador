/* Mindse7 · simulador · exportar: folha A4 (PDF pelo window.print) e PNG A4 (canvas). Sem biblioteca. */
var M7 = window.M7 || (window.M7 = {});
M7.Export = (function () {
  var ST = { erro: "ERRO", atencao: "ATENÇÃO", recomendacao: "RECOMENDAÇÃO", ok: "OK" }, SIG = { erro: "▲", atencao: "◌", recomendacao: "◇", ok: "●" };
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function dados(proj, achados, rota) {
    var n = M7.nota(achados), hoje = new Date().toLocaleDateString("pt-BR");
    return { proj: proj, achados: achados, rota: rota, n: n, hoje: hoje, cen: proj.cenario === "multi" ? "Corner em multimarca" : "Espaço Mindse7 na C&A" };
  }
  function linhasItens(proj) { return proj.itens.map(function (it) { return [it.id.replace("i", "#"), M7.TIPOS[it.tipo].nome, it.larg + " × " + it.prof + " × " + it.alt, it.x_cm + ", " + it.z_cm + (it.rot ? " · " + it.rot + "°" : ""), String(it.pecas.length)]; }); }
  function fonteCurta(a) { return a.fonte ? a.fonte.texto.split(":")[0] + " · " + a.fonte.url.replace(/^https?:\/\//, "").split("/")[0] + " · acesso " + a.fonte.acesso : "regra física (sem norma)"; }
  function folhaHTML(proj, achados, rota) {
    var d = dados(proj, achados, rota), cab = '<h1>' + esc(proj.nome) + '</h1><p class="sub">' + esc(d.cen) + ' · área ' + proj.area.larg_cm + ' × ' + proj.area.prof_cm + ' cm (' + (proj.area.larg_cm * proj.area.prof_cm / 10000).toFixed(1).replace(".", ",") + ' m²) · ' + d.hoje + ' · nota ' + (d.n.nota === null ? "sem itens" : String(d.n.nota).replace(".", ",") + " de 10") + '</p>';
    return '<div class="a4">' + cab + M7.Planta.estatico(proj, 720, 470, achados, rota, "a") +
      '<h2>Itens</h2><table><thead><tr><th>Item</th><th>Tipo</th><th>L × P × A (cm)</th><th>Posição x, z</th><th>Peças</th></tr></thead><tbody>' + linhasItens(proj).map(function (l) { return '<tr>' + l.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table>' +
      '<h2>Conferência</h2>' + (d.n.top3.length ? '<p class="sub">Maiores correções: ' + d.n.top3.map(function (r, i) { return (i + 1) + ") " + esc(M7.NOMES[r.regra]) + " (+" + String(r.impacto).replace(".", ",") + ")"; }).join("  ") + '</p>' : "") +
      '<ul class="rel">' + achados.map(function (a) { return '<li><b>' + SIG[a.status] + '</b>' + ST[a.status] + ' · ' + esc(M7.NOMES[a.regra]) + ': ' + esc(a.msg) + ' <i>(' + esc(fonteCurta(a)) + ')</i></li>'; }).join("") + '</ul></div>';
  }
  function preencher() { var E = M7.Ed; document.getElementById("folha-a4").innerHTML = folhaHTML(E.proj(), E.achados(), E.rota()); }
  window.addEventListener("beforeprint", function () { if (M7.Ed) preencher(); });
  function pdf() { preencher(); window.print(); }

  /* PNG A4 a 150 dpi (1240 × 1754): título, planta (SVG vira imagem), itens e relatório, tudo desenhado no canvas */
  function quebra(x, t, larg, ctx) { var pal = String(t).split(" "), l = [], atual = ""; pal.forEach(function (p) { var teste = atual ? atual + " " + p : p; if (ctx.measureText(teste).width > larg && atual) { l.push(atual); atual = p; } else atual = teste; }); if (atual) l.push(atual); return l; }
  function png() {
    var E = M7.Ed, proj = E.proj(), achados = E.achados(), rota = E.rota(), d = dados(proj, achados, rota), W = 1240, M = 70, H = 1754;
    return new Promise(function (ok, falha) {
      var svg = M7.Planta.estatico(proj, 1100, 720, achados, rota, "p", true), img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      img.onload = function () {
        var itens = linhasItens(proj), rel = achados.map(function (a) { return a.status + "|" + SIG[a.status] + " " + ST[a.status] + " · " + M7.NOMES[a.regra] + ": " + a.msg; });
        var tmp = document.createElement("canvas").getContext("2d"); tmp.font = "22px Helvetica, Arial, sans-serif";
        var linhas = []; rel.forEach(function (r) { var st = r.split("|")[0], t = r.slice(st.length + 1); quebra(0, t, W - 2 * M - 30, tmp).forEach(function (l, i) { linhas.push({ st: st, t: l, cont: i > 0 }); }); });
        var alto = Math.max(H, 150 + 720 + 60 + 40 + itens.length * 34 + 90 + linhas.length * 30 + 70), c = document.createElement("canvas"); c.width = W; c.height = alto; var x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, W, alto); x.fillStyle = "#141414"; x.font = "800 52px 'Arial Narrow', Arial, sans-serif"; x.fillText(proj.nome.toUpperCase(), M, 90);
        x.font = "22px ui-monospace, Menlo, Consolas, monospace"; x.fillStyle = "#4A4B4D"; x.fillText(d.cen + " · " + proj.area.larg_cm + " × " + proj.area.prof_cm + " cm · " + d.hoje + " · nota " + (d.n.nota === null ? "sem itens" : String(d.n.nota).replace(".", ",") + "/10"), M, 128);
        x.drawImage(img, M, 150, 1100, 720); x.strokeStyle = "#141414"; x.lineWidth = 2; x.strokeRect(M, 150, 1100, 720); URL.revokeObjectURL(url);
        var y = 920; x.fillStyle = "#141414"; x.font = "800 30px 'Arial Narrow', Arial, sans-serif"; x.fillText("ITENS", M, y); y += 14;
        x.font = "20px ui-monospace, Menlo, Consolas, monospace"; var cols = [M, M + 90, M + 330, M + 640, M + 960]; ["#", "Tipo", "L × P × A (cm)", "x, z", "Peças"].forEach(function (h, i) { x.fillStyle = "#4A4B4D"; x.fillText(h, cols[i], y + 24); }); y += 34;
        itens.forEach(function (l) { x.fillStyle = "#141414"; x.fillRect(M, y, W - 2 * M, 1.5); l.forEach(function (cel, i) { x.fillText(cel, cols[i], y + 25); }); y += 34; });
        y += 40; x.font = "800 30px 'Arial Narrow', Arial, sans-serif"; x.fillStyle = "#141414"; x.fillText("CONFERÊNCIA", M, y); y += 36; x.font = "22px Helvetica, Arial, sans-serif";
        linhas.forEach(function (l) { x.fillStyle = l.st === "erro" ? "#A3231B" : "#141414"; x.fillText(l.t, M + (l.cont ? 30 : 0), y); y += 30; });
        c.toBlob(function (b) { b ? ok(b) : falha(new Error("toBlob")); }, "image/png");
      };
      img.onerror = function () { falha(new Error("svg")); }; img.src = url;
    });
  }
  function baixar(blob, nome) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  return { folhaHTML: folhaHTML, preencher: preencher, pdf: pdf, png: png, baixar: baixar };
})();
