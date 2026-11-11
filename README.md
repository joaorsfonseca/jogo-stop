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
- `?nofb=1` desliga o Firebase; `?fbemu=127.0.0.1` usa o emulador local.
- `logic.js`: lógica pura (categorias, normalização, pontuação, sorteio de letras) — testes em `tests/` (`npm test`, Node ≥ 20, sem dependências).

## Persistência (Firebase `jogo-stop-6e848`)

Opcional: se o Firebase não estiver configurado ou não carregar, o jogo funciona na mesma (só não grava).
Login anónimo e invisível (1 `uid` por telemóvel). Só o anfitrião escreve na mesa; as regras estão em `firebase/firestore.rules`.

```
devices/{uid}                      name, names[], platform, browser, lang, firstSeen, lastSeen
tables/{tableId}                   code, hostUid, createdAt, lastActivityAt, roundsCount, playerUids[], players.{uid}.name
                                   stats.{uid}  = { name, rounds, points, wins, stops, p20, p10, p5, answers, blank }
                                   letters.{L}  = vezes que a letra saiu      cats.{id} = vezes que a categoria foi jogada
tables/{tableId}/rounds/{roundId}  no, letter, cats[], startedAt, endedAt, durationMs, endedBy ('stop'|'host'), stoppedBy (uid|null)
                                   playerUids[], results[] = { uid, name, total, win, answers.{cat} = { t, v, p } }   (imutável)
```

- `answers.{cat}`: `t` = texto, `v` = válida (após revisão do anfitrião), `p` = pontos. Fica o histórico completo de respostas
  por categoria/letra, base para validação automática e níveis de dificuldade no futuro.
- **Placard da mesa** (botão 🏆, fora das rondas): rondas, pontos, média, rondas ganhas (empates contam), STOPs, respostas de 20;
  letras que mais saíram e categorias mais jogadas.
- **Perfil do telemóvel** (ecrã inicial): soma das mesas onde jogou (`playerUids array-contains uid`).
- A ronda e os agregados são gravados no mesmo batch. Rondas por gravar ficam em fila no `localStorage` do anfitrião e são reenviadas.

### Configurar

1. Consola Firebase → projeto `jogo-stop-6e848`.
2. **Authentication** → Sign-in method → activar **Anónimo**.
3. **Firestore Database** → criar (modo produção, região `eur3`).
4. Definições do projeto → As suas apps → **Web** → copiar o `firebaseConfig` para o fim de `index.html`.
5. Authentication → Settings → **Authorized domains** → adicionar `joaorsfonseca.github.io`.
6. Publicar regras: `cd firebase && firebase deploy --only firestore:rules,firestore:indexes --project jogo-stop-6e848`.

Testes locais: `cd firebase && firebase emulators:start --only auth,firestore --project demo-jogo-stop` e abrir `index.html?fbemu=127.0.0.1`.

## Categorias

Países · Cidades · Nomes próprios · Animais · Frutos · Profissões · Objetos · Comidas e pratos · Cores · Marcas ·
Legumes e vegetais · Desportos · Bebidas · Partes do corpo · Apelidos · Clubes de futebol · Filmes e séries ·
Cantores e bandas · Figuras famosas · Rios, mares e oceanos

Cada categoria tem um `level` (1–3) em `logic.js`, reservado para a futura classificação por dificuldade.
