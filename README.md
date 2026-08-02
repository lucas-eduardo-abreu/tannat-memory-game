# TANNAT · Jogo da Memória

Jogo da memória em HTML/CSS/JS puro (sem build, sem dependências), na identidade
visual do **TANNAT wine bar**. Entretenimento por **M2 Entretenimentos**.
Pensado como atração de **totem/evento**: abre em tela cheia, tem modo *attract*
(chamariz quando ocioso) e ranking da noite.

## Como abrir

Basta abrir o `index.html` em qualquer navegador moderno — duplo-clique funciona
(não usa `type="module"`, então roda direto do sistema de arquivos, sem servidor).

Para o totem, recomendo abrir em **tela cheia** (botão ⛶ na tela inicial, ou `F11`).

## Dificuldades

| Nível   | Pares | Tabuleiro | Tempo |
|---------|-------|-----------|-------|
| Fácil   | 6     | 3 × 4     | 60 s  |
| Médio   | 8     | 4 × 4     | 90 s  |
| Difícil | 12    | 6 × 4     | 120 s |

O tamanho das cartas é **calculado dinamicamente** para caber sem scroll em
qualquer tela — celular, notebook ou totem, em retrato ou paisagem.

## Recursos

- Verso das cartas com o **goblet TANNAT**; frentes com ícones vetoriais na
  linguagem da marca (taça, brinde, garrafa, uvas, drink, globo, câmera, etc.).
- Timer com barra, contador de **jogadas** e **pares**.
- **Som** por WebAudio (sem arquivos) — botão liga/desliga, preferência salva.
- **Recorde** por dificuldade + **ranking da noite** (top 8). O nome usado no
  ranking é o mesmo informado na captação de lead — não pede nome de novo na
  tela de vitória.
- **Captação de lead**: antes de cada partida, o jogador informa nome, idade e
  telefone; os dados ficam salvos no `localStorage` (`tannat_leads`).
- **Painel admin (tecla F9)**: mostra a lista de leads capturados neste
  navegador/totem, permite **exportar em CSV** (abre direto no Excel, com
  acentuação correta) e **limpar a lista** (botão "Limpar lista" pede uma
  segunda confirmação em até 4s, para evitar apagar sem querer). Tecla
  **Esc** ou botão "Fechar" para sair do painel.
- **Confete** ouro + prata + vinho na vitória.
- **Modo attract**: após 25 s ocioso na tela inicial, pulsa "Toque para começar".
- Botão **tela cheia**, atalho **Esc** para sair da partida.
- Acessível: navegação por teclado, foco visível, respeita `prefers-reduced-motion`.
- Responsivo (retrato e paisagem).

## Estrutura

```
tannat-memory-game/
├── index.html
├── style.css
├── game.js
└── assets/
    ├── bg/            fundos otimizados (fotos reais do evento no TANNAT)
    ├── cards/         29 fotos usadas nas cartas (1.png … 29.png)
    └── logo/          goblet TANNAT (SVG) + M2 Entretenimentos (PNG)
```

O goblet (marca/verso da carta) é **SVG inline** (dentro do `game.js`). A frente das
cartas usa as **fotos** de `assets/cards/`: a cada partida, `CARD_IMAGES` é embaralhado
e cada dificuldade sorteia quantas fotos precisar (6/8/12 pares), então o conjunto e a
posição das cartas mudam a cada rodada.

## Personalizações rápidas

- **Cores / tipografia:** variáveis no topo do `style.css` (`:root`).
- **Tempo / nº de pares:** objeto `DIFFS` no `game.js`.
- **Fotos das cartas:** troque os arquivos em `assets/cards/` (mantenha 29 imagens
  nomeadas `1`…`29`, mesma extensão por arquivo) — o array `CARD_IMAGES` no `game.js`
  monta a lista automaticamente a partir desses nomes.
- **Fundos:** substitua os arquivos em `assets/bg/`.

## Nota para totem offline

As fontes (Fraunces + Montserrat) carregam via Google Fonts. Se o totem **não**
tiver internet, o jogo continua funcionando com fontes de sistema como fallback.
Se quiser 100% offline com as fontes originais, dá para baixá-las e apontar o
`@font-face` local — posso preparar essa versão se precisar.
