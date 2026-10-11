# Bibliotecas do app Dev1 r2 (cópia local, nenhuma URL externa; mesmas da r2 do Dev2, SHA-256 conferido em 2026-10-11)

Origem: tarball oficial do npm (`npm pack three@0.147.0 gsap@3.12.5`, baixado em 2026-10-10). O SHA-256 de cada arquivo é igual ao da cópia em `../../dev1-r1/libs/ e ao de ../../dev2-r1/libs/`.

| Arquivo | Pacote e versão fixada | Licença | Tamanho | SHA-256 (16 primeiros) |
|---|---|---|---|---|
| three.min.js | three 0.147.0, `build/three.min.js` | MIT (LICENSE-three.txt) | 593,5 KB | f34446bf875b5fb0 |
| OrbitControls.js | three 0.147.0, `examples/js/controls/OrbitControls.js` | MIT (a mesma) | 26,0 KB | b4c6e53f98538535 |
| gsap.min.js | gsap 3.12.5, `dist/gsap.min.js` | GreenSock Standard "no charge" (campo `license` do package.json: gsap.com/standard-license) | 70,5 KB | 28033e449a31ebcc |
| Draggable.min.js | gsap 3.12.5, `dist/Draggable.min.js` | a mesma do gsap | 34,6 KB | 7851a6e073db7e85 |

- three r147 é a última versão com `examples/js` (script clássico); módulo ES não carrega por `file://`.
- Nada de modelo 3D, textura ou fonte baixada: móveis, silhuetas das peças e o chão ponteado são gerados no código.
- Os textos `http(s)://` dentro das libs são cabeçalho de licença ou nome de espaço XML; nenhum é carregado.

- O arquivo único `../simulador.html` (gerado por `../construir.js`) embute estes mesmos quatro arquivos sem alterar um byte; o `#teste` roda igual nele.
