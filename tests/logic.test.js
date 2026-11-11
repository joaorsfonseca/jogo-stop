'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

test('universo tem 20 categorias com ids únicos', () => {
  assert.equal(L.CATEGORIES.length, 20);
  assert.equal(new Set(L.CAT_IDS).size, 20);
});

test('normalize ignora acentos, maiúsculas e pontuação', () => {
  assert.equal(L.normalize('  Évora!! '), 'evora');
  assert.equal(L.normalize('São   Tomé e Príncipe'), 'sao tome e principe');
  assert.equal(L.normalize(null), '');
});

test('startsWithLetter: letra, acentos e tamanho mínimo', () => {
  assert.ok(L.startsWithLetter('Óbidos', 'O'));
  assert.ok(L.startsWithLetter('angola', 'A'));
  assert.ok(!L.startsWithLetter('A', 'A'));          // 1 caracter não conta
  assert.ok(!L.startsWithLetter('Brasil', 'A'));
  assert.ok(!L.startsWithLetter('', 'A'));
});

test('canStop exige todas as categorias válidas', () => {
  const cats = ['paises', 'cidades'];
  assert.ok(L.canStop({ paises: 'Portugal', cidades: 'Porto' }, cats, 'P'));
  assert.ok(!L.canStop({ paises: 'Portugal' }, cats, 'P'));
  assert.ok(!L.canStop({ paises: 'Portugal', cidades: 'Lisboa' }, cats, 'P'));
  assert.ok(!L.canStop({}, [], 'P'));
});

test('scoreRound: 20 sozinho, 10 diferente, 5 repetido, 0 vazio/inválido', () => {
  const r = L.scoreRound({
    letter: 'B', cats: ['paises', 'cidades', 'animais', 'frutos'], pids: ['a', 'b', 'c'],
    answers: {
      a: { paises: 'Brasil',  cidades: 'Braga',  animais: 'Burro', frutos: 'Banana' },
      b: { paises: 'Bélgica', cidades: 'braga!', animais: '',      frutos: 'Laranja' },
      c: { paises: 'Bolívia', cidades: 'Beja',   animais: '' },
    },
  });
  assert.deepEqual(r.points.a, { paises: 10, cidades: 5, animais: 20, frutos: 20 });
  assert.deepEqual(r.points.b, { paises: 10, cidades: 5, animais: 0,  frutos: 0 });
  assert.deepEqual(r.points.c, { paises: 10, cidades: 10, animais: 0, frutos: 0 });
  assert.deepEqual(r.totals, { a: 55, b: 15, c: 20 });
});

test('scoreRound: overrides do anfitrião anulam ou aceitam respostas', () => {
  const base = { letter: 'C', cats: ['animais'], pids: ['a', 'b'],
    answers: { a: { animais: 'Cão' }, b: { animais: 'Kiwi' } } };
  assert.deepEqual(L.scoreRound(base).totals, { a: 20, b: 0 });
  assert.deepEqual(L.scoreRound({ ...base, overrides: { a: { animais: false } } }).totals, { a: 0, b: 0 });
  assert.deepEqual(L.scoreRound({ ...base, overrides: { b: { animais: true } } }).totals, { a: 10, b: 10 });
});

test('scoreRound: override true não valida resposta vazia', () => {
  const r = L.scoreRound({ letter: 'C', cats: ['animais'], pids: ['a'], answers: { a: {} }, overrides: { a: { animais: true } } });
  assert.equal(r.totals.a, 0);
});

test('drawLetter não repete até esgotar e respeita excluídas', () => {
  const excluded = L.ALPHABET.filter(l => !'ABC'.includes(l));
  let used = [], seen = new Set();
  for (let i = 0; i < 3; i++) { const d = L.drawLetter(excluded, used); used = d.used; seen.add(d.letter); }
  assert.deepEqual([...seen].sort(), ['A', 'B', 'C']);
  const again = L.drawLetter(excluded, used);       // esgotou → recomeça
  assert.ok('ABC'.includes(again.letter));
  assert.equal(again.used.length, 1);
  assert.throws(() => L.drawLetter(L.ALPHABET, []));
});

test('sanitizeCats e randomCats', () => {
  assert.deepEqual(L.sanitizeCats(['cidades', 'xpto', 'paises', 'paises']), ['paises', 'cidades']);
  const r = L.randomCats(6);
  assert.equal(r.length, 6);
  assert.equal(new Set(r).size, 6);
});

test('totalsOf soma ronda a ronda', () => {
  assert.deepEqual(L.totalsOf([{ totals: { a: 20, b: 5 } }, { totals: { a: 10, c: 15 } }]), { a: 30, b: 5, c: 15 });
});
