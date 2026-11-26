# Felipe Souza — Mission Portfolio

Portfólio jogável em português: explore com CJ a pé ou dirija o Infernus pela Grove Street e visite três marcadores para conhecer Açaí Finance, TickiTon e Nix. Também é possível abrir todos os projetos diretamente pelo menu.

## Rodar localmente

Execute `npm run preview` e abra `http://127.0.0.1:8876`. O site é estático, sem instalação de dependências ou build. `npm run check` verifica a sintaxe dos módulos.

- WASD ou setas: andar com CJ; acelerar, dar ré e virar no carro.
- Shift: correr a pé.
- F: entrar ou sair do Infernus; é preciso parar o carro para sair.
- Espaço ou Shift: frear.
- E: abrir a missão ao chegar ao marcador.
- C: alternar a câmera.
- M: mapa; P: projetos; R: retornar à Grove Street.
- No celular: controle circular, E, CARRO/SAIR e CORRER/FREAR.
- SOM: ligar/desligar o áudio; RÁDIO: trocar estação e ajustar efeitos/música separadamente.

As missões concluídas ficam no armazenamento local do navegador. O botão de reinício no painel de ajuda limpa esse progresso. Sem WebGL, os projetos permanecem disponíveis.

## Arquitetura e escopo

`dist/game.js` controla os painéis, o progresso e a entrada. `dist/drive.js` implementa direção e câmera. `dist/gta-world.js` carrega os modelos e texturas, agrupa o cenário por material e usa raios nas malhas originais para verificar chão e paredes. `dist/portfolio.js` contém os dados dos projetos. `dist/character.js` carrega as cinco partes do CJ, o esqueleto e as animações originais; `dist/audio.js` mistura motor, passos e duas rádios instrumentais compostas para esta experiência. O áudio é iniciado por gesto do usuário e suspenso quando a aba fica oculta.

A região reproduz um recorte da Grove Street/Ganton com 478 objetos posicionados e 182 modelos, incluindo o Infernus. É uma experiência de portfólio com física própria; não executa o motor de GTA, suas missões originais, tráfego ou NPCs de pedestres. A exploração fica limitada ao bairro carregado. A primeira carga baixa cerca de 36 MB de arquivos locais do site.

## Origem dos arquivos

Os modelos, texturas e posições foram convertidos da cópia local de GTA San Andreas fornecida pelo proprietário. O processo lê `gta3.img`, IDE/IPL e `vehicle.txd`, sem executar ou modificar o jogo. Esses recursos pertencem aos respectivos titulares; não integram uma licença aberta do portfólio. A publicação usa acesso privado do Sites.

`tools/convert_character_audio.py` converte o CJ normal, com camiseta branca, jeans e tênis, de `player.img`; as animações vêm de `anim/ped.ifp`. O Infernus usa os bancos COBRA 37/38 de `audio/SFX/GENRL`. A conversão se baseia nos formatos documentados pelo [ifp-reader](https://github.com/tmfksoft/ifp-reader), na [tabela de áudio de veículos do gta-reversed](https://github.com/gta-reversed/gta-reversed/blob/master/source/game_sa/Audio/Entities/AEVehicleAudioEntity.VehicleAudioSettings.h) e no [leitor de bancos de áudio do openSA](https://github.com/LakoMoor/openSA/blob/main/sa_port/src/AudioBank.h). A música das estações Grove FM e Night Drive é instrumental original, sintetizada no navegador; não usa gravações das rádios comerciais do GTA.

`tools/convert_gta.py` e `tools/inspect_assets.py` usam o parser [DragonFF](https://github.com/Parik27/DragonFF), incluído em `tools/DragonFF-master`, com sua licença GPL-3.0. O código do conversor é GPL-3.0-or-later. Three.js 0.160.1 usa a licença MIT em `dist/assets/THREE-LICENSE.txt`. Barlow Condensed e DM Sans usam SIL Open Font License, incluídas junto às fontes. Imagens e textos dos projetos vêm do portfólio existente de Felipe.

A instalação original do jogo não faz parte do repositório. Para reconverter, ajuste `GTA_GAME_DIR` para uma instalação local que contenha `models/gta3.img` e execute `/usr/bin/python3 tools/convert_gta.py`.

## Verificação da atualização de personagem e áudio

Conferidos em Chromium isolado: CJ parado e correndo, entrada/saída do carro, condução até a primeira missão, avanço de progresso, mapa, telas de projeto, layout de celular, troca de estação, volumes e silêncio geral. O analisador de áudio confirmou sinal de música e de motor separadamente, com a rádio desligada no teste do motor. A sintaxe de todos os módulos é validada com `npm run check`.
