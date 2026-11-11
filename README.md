# Jogo do STOP

Web app multijogador do "jogo dos países": um anfitrião cria a mesa, os outros entram com um código de 4 letras. Abre no browser do telemóvel.

## Regras

1. O anfitrião escolhe as categorias (de um universo de 20) e sorteia uma letra (3 s de contagem decrescente).
2. Cada jogador preenche as categorias com palavras começadas por essa letra, pela ordem que quiser. Pode deixar em branco.
3. Quem preencher **todas** (válidas: ≥ 2 caracteres e a começar pela letra) carrega em **STOP**: o relógio pára e todos ficam bloqueados.
4. Se a letra for difícil, o anfitrião pode **terminar a ronda** (conta o que estiver preenchido) ou **anulá-la** (sem pontos).
5. Revisão: o anfitrião vê todas as respostas e pode anular / aceitar cada uma.
6. Pontos por categoria (só visíveis no fim da ronda):
   - **20** — preencheste e mais ninguém preencheu (com resposta válida)
   - **10** — preencheste e a tua resposta é diferente das outras
   - **5** — preencheste e é igual à de outro jogador
   - **0** — vazia ou anulada
   Comparação sem acentos, maiúsculas ou pontuação (`Évora` = `evora`).
7. Os pontos somam ronda a ronda (placard por ronda/jogador).

## Anfitrião

- Selecciona categorias (manual, ao acaso 5/8/10/12, todas/nenhuma) e as letras em jogo (por omissão sem K, W, Y). As letras não se repetem até saírem todas.
- Pode remover jogadores (✕), reiniciar a pontuação e voltar à configuração entre rondas.
- Entram jogadores novos entre rondas (não durante uma ronda); reentrada pelo mesmo nickname se o jogador estiver desligado.

## Técnico

- `index.html` + `logic.js`, sem build. Publicar via GitHub Pages (`.nojekyll` incluído).
- Tempo real via MQTT sobre WebSocket em brokers públicos (EMQX, HiveMQ, Mosquitto), em paralelo; MQTT.js embutido.
- O anfitrião é autoritativo: guarda o estado, valida STOP/respostas e envia a cada jogador só as suas respostas durante a ronda
  (as dos outros só aparecem depois do STOP; os pontos só no fim). Após o STOP há 2 s de tolerância para receber respostas em trânsito.
- Estado do anfitrião em `localStorage` (botão "Retomar mesa"); rascunho das respostas do jogador também (sobrevive a recarregar).
- `?broker=ws://host:porta` troca os brokers (útil para testes com um broker local).
- `logic.js`: lógica pura (categorias, normalização, pontuação, sorteio de letras) — testes em `tests/` (`npm test`, Node ≥ 20, sem dependências).

## Categorias

Países · Cidades · Nomes próprios · Animais · Frutos · Profissões · Objetos · Comidas e pratos · Cores · Marcas ·
Legumes e vegetais · Desportos · Bebidas · Partes do corpo · Apelidos · Clubes de futebol · Filmes e séries ·
Cantores e bandas · Figuras famosas · Rios, mares e oceanos

Cada categoria tem um `level` (1–3) em `logic.js`, reservado para a futura classificação por dificuldade.
