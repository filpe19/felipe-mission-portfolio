# Felipe Souza — Mission Portfolio

Portfólio jogável em português: dirija o Infernus pela Grove Street e visite três marcadores para conhecer Açaí Finance, TickiTon e Nix. Também é possível abrir todos os projetos diretamente pelo menu.

## Rodar localmente

Execute `npm run preview` e abra `http://127.0.0.1:8876`. O site é estático, sem instalação de dependências ou build. `npm run check` verifica a sintaxe dos módulos.

- WASD ou setas: acelerar, dar ré e virar.
- Espaço ou Shift: frear.
- E: abrir a missão ao chegar ao marcador.
- C: alternar a câmera.
- M: mapa; P: projetos; R: retornar à Grove Street.
- No celular: controle circular, E e botão de freio.

As missões concluídas ficam no armazenamento local do navegador. O botão de reinício no painel de ajuda limpa esse progresso. Sem WebGL, os projetos permanecem disponíveis.

## Arquitetura e escopo

`dist/game.js` controla os painéis, o progresso e a entrada. `dist/drive.js` implementa direção e câmera. `dist/gta-world.js` carrega os modelos e texturas, agrupa o cenário por material e usa raios nas malhas originais para verificar chão e paredes. `dist/portfolio.js` contém os dados dos projetos.

A região reproduz um recorte da Grove Street/Ganton com 478 objetos posicionados e 182 modelos, incluindo o Infernus. É uma experiência de portfólio com física própria; não executa o motor de GTA, suas missões originais, tráfego ou pedestres. A exploração fica limitada ao bairro carregado. A primeira carga baixa cerca de 35 MB de arquivos locais do site.

## Origem dos arquivos

Os modelos, texturas e posições foram convertidos da cópia local de GTA San Andreas fornecida pelo proprietário. O processo lê `gta3.img`, IDE/IPL e `vehicle.txd`, sem executar ou modificar o jogo. Esses recursos pertencem aos respectivos titulares; não integram uma licença aberta do portfólio. A publicação inicial usa acesso privado do Sites.

`tools/convert_gta.py` e `tools/inspect_assets.py` usam o parser [DragonFF](https://github.com/Parik27/DragonFF), incluído em `tools/DragonFF-master`, com sua licença GPL-3.0. O código do conversor é GPL-3.0-or-later. Three.js 0.160.1 usa a licença MIT em `dist/assets/THREE-LICENSE.txt`. Barlow Condensed e DM Sans usam SIL Open Font License, incluídas junto às fontes. Imagens e textos dos projetos vêm do portfólio existente de Felipe.

A instalação original do jogo não faz parte do repositório. Para reconverter, ajuste `GTA_GAME_DIR` para uma instalação local que contenha `models/gta3.img` e execute `/usr/bin/python3 tools/convert_gta.py`.
