/* Jogo do STOP — lógica pura (sem rede nem DOM). Usada no browser (window.StopLogic) e nos testes (Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StopLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Universo de categorias. `level` (1 fácil … 3 difícil) fica reservado para evoluções futuras.
  const CATEGORIES = [
    { id: 'paises',     name: 'Países',                level: 1 },
    { id: 'cidades',    name: 'Cidades',               level: 1 },
    { id: 'nomes',      name: 'Nomes próprios',        level: 1 },
    { id: 'animais',    name: 'Animais',               level: 1 },
    { id: 'frutos',     name: 'Frutos',                level: 1 },
    { id: 'profissoes', name: 'Profissões',            level: 1 },
    { id: 'objetos',    name: 'Objetos',               level: 1 },
    { id: 'comidas',    name: 'Comidas e pratos',      level: 1 },
    { id: 'cores',      name: 'Cores',                 level: 2 },
    { id: 'marcas',     name: 'Marcas',                level: 2 },
    { id: 'legumes',    name: 'Legumes e vegetais',    level: 2 },
    { id: 'desportos',  name: 'Desportos',             level: 2 },
    { id: 'bebidas',    name: 'Bebidas',               level: 2 },
    { id: 'corpo',      name: 'Partes do corpo',       level: 2 },
    { id: 'apelidos',   name: 'Apelidos',              level: 2 },
    { id: 'clubes',     name: 'Clubes de futebol',     level: 2 },
    { id: 'filmes',     name: 'Filmes e séries',       level: 3 },
    { id: 'musica',     name: 'Cantores e bandas',     level: 3 },
    { id: 'famosos',    name: 'Figuras famosas',       level: 3 },
    { id: 'agua',       name: 'Rios, mares e oceanos', level: 3 },
  ];
  const CAT_IDS = CATEGORIES.map(c => c.id);
  const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
  const DEFAULT_CATS = CATEGORIES.slice(0, 8).map(c => c.id);

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const DEFAULT_EXCLUDED = ['K', 'W', 'Y'];
  const MIN_LETTERS = 5;            // mínimo de letras sorteáveis
  const MAX_ANSWER = 40;
  const POINTS = { ALONE: 20, UNIQUE: 10, SHARED: 5, NONE: 0 };

  /** Normaliza para comparação: sem acentos, minúsculas, só [a-z0-9] e espaços simples. */
  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  const isFilled = s => normalize(s).length > 0;
  /** Resposta aceitável à partida: ≥ 2 caracteres e começa pela letra sorteada (ignora acentos). */
  function startsWithLetter(text, letter) {
    const n = normalize(text);
    return n.length >= 2 && !!letter && n[0] === String(letter).toLowerCase();
  }
  /** O jogador pode carregar em STOP: todas as categorias preenchidas e válidas. */
  function canStop(answers, cats, letter) {
    return cats.length > 0 && cats.every(c => startsWithLetter((answers || {})[c], letter));
  }

  /** Validade efectiva: override do anfitrião (true/false) ou, por omissão, a validação automática. */
  function isValid(text, letter, override) {
    if (!isFilled(text)) return false;
    if (override === true || override === false) return override;
    return startsWithLetter(text, letter);
  }

  /**
   * Pontua uma ronda.
   * - única resposta válida na categoria → 20
   * - resposta válida diferente das restantes → 10
   * - resposta válida repetida (igual à de outro jogador) → 5
   * - vazia / inválida → 0
   * @param {{cats:string[], letter:string, pids:string[], answers:Object, overrides?:Object}} r
   * @returns {{points:Object, totals:Object, valid:Object}}
   */
  function scoreRound({ cats, letter, pids, answers, overrides }) {
    const points = {}, totals = {}, valid = {};
    pids.forEach(p => { points[p] = {}; valid[p] = {}; totals[p] = 0; });
    for (const c of cats) {
      const ok = pids.filter(p => {
        const v = isValid(answers?.[p]?.[c], letter, overrides?.[p]?.[c]);
        valid[p][c] = v; return v;
      });
      const count = {};
      ok.forEach(p => { const k = normalize(answers[p][c]); count[k] = (count[k] || 0) + 1; });
      pids.forEach(p => {
        let pts = POINTS.NONE;
        if (valid[p][c]) {
          if (ok.length === 1) pts = POINTS.ALONE;
          else pts = count[normalize(answers[p][c])] > 1 ? POINTS.SHARED : POINTS.UNIQUE;
        }
        points[p][c] = pts; totals[p] += pts;
      });
    }
    return { points, totals, valid };
  }

  /** Letras sorteáveis (alfabeto menos as excluídas). */
  const letterPool = excluded => ALPHABET.filter(l => !(excluded || []).includes(l));

  /** Sorteia uma letra sem repetir até esgotar o conjunto; devolve a letra e a nova lista de usadas. */
  function drawLetter(excluded, used, rng) {
    const pool = letterPool(excluded);
    if (!pool.length) throw new Error('Sem letras disponíveis.');
    let avail = pool.filter(l => !(used || []).includes(l)), nextUsed = (used || []).filter(l => pool.includes(l));
    if (!avail.length) { avail = pool; nextUsed = []; }
    const letter = avail[Math.floor((rng || Math.random)() * avail.length) % avail.length];
    return { letter, used: nextUsed.concat(letter) };
  }

  /** Sanitiza o conjunto de categorias pedido (só ids conhecidos, sem duplicados, ordem do universo). */
  const sanitizeCats = ids => CAT_IDS.filter(id => (ids || []).includes(id));

  /** Escolhe n categorias ao acaso. */
  function randomCats(n, rng) {
    const a = CAT_IDS.slice(), r = rng || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return sanitizeCats(a.slice(0, Math.max(1, Math.min(n, a.length))));
  }

  /** Soma acumulada por jogador ao longo das rondas. */
  function totalsOf(rounds) {
    const t = {};
    (rounds || []).forEach(r => Object.entries(r.totals || {}).forEach(([p, n]) => { t[p] = (t[p] || 0) + n; }));
    return t;
  }

  return {
    CATEGORIES, CAT_IDS, CAT_BY_ID, DEFAULT_CATS, ALPHABET, DEFAULT_EXCLUDED, MIN_LETTERS, MAX_ANSWER, POINTS,
    normalize, isFilled, startsWithLetter, canStop, isValid, scoreRound, letterPool, drawLetter, sanitizeCats, randomCats, totalsOf,
  };
});
