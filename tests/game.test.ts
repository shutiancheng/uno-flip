import { describe, expect, it } from 'vitest';
import { applyMove, COLORS, faceOf, isPlayable, makeDeck, newGame, viewFor, type Card, type State } from '../src/game';

const card = (id: string, color: Card['day']['color'], kind: Card['day']['kind'], nightColor: Card['night']['color'] = 'aqua', nightKind: Card['night']['kind'] = 1): Card => ({ id, day: { color, kind }, night: { color: nightColor, kind: nightKind } });

function stateWith(hand: Card[], top = card('top', 'coral', 3)): State {
  const state = newGame(() => 0.42);
  state.hands[0] = hand;
  state.hands[1] = [card('opp', 'sky', 9)];
  state.discard = [top];
  state.activeColor = 'coral';
  state.turn = 0;
  return state;
}

describe('UNO Flip deck', () => {
  it('builds 112 paired cards with full color sets', () => {
    const deck = makeDeck(() => 0.37);
    expect(deck).toHaveLength(112);
    expect(new Set(deck.map(item => item.id)).size).toBe(112);
    expect(new Set(deck.map(item => item.day.color))).toEqual(new Set([...COLORS.day, 'wild']));
    expect(new Set(deck.map(item => item.night.color))).toEqual(new Set([...COLORS.night, 'wild']));
  });

  it('deals seven cards to both players without exposing the other hand', () => {
    const state = newGame(() => 0.22);
    expect(state.hands[0]).toHaveLength(7);
    expect(state.hands[1]).toHaveLength(7);
    const view = viewFor(state, 0);
    expect(view.hand).toEqual(state.hands[0]);
    expect(view).not.toHaveProperty('hands');
    expect(view).not.toHaveProperty('deck');
  });
});

describe('moves', () => {
  it('matches either active color or symbol', () => {
    const state = stateWith([]);
    expect(isPlayable(card('a', 'coral', 8), state)).toBe(true);
    expect(isPlayable(card('b', 'sky', 3), state)).toBe(true);
    expect(isPlayable(card('c', 'sky', 8), state)).toBe(false);
    expect(isPlayable(card('d', 'wild', 'wild'), state)).toBe(true);
  });

  it('flips every card to the night side and changes active color', () => {
    const flip = card('flip', 'coral', 'flip', 'violet', 'flip');
    const state = stateWith([flip, card('spare', 'gold', 2)]);
    const next = applyMove(state, 0, { type: 'play', card: flip.id });
    expect(next.side).toBe('night');
    expect(next.activeColor).toBe('violet');
    expect(next.turn).toBe(1);
  });

  it('applies a two-card penalty when the last-card call is missed', () => {
    const state = stateWith([card('play', 'coral', 5), card('last', 'gold', 2)]);
    const next = applyMove(state, 0, { type: 'play', card: 'play' });
    expect(next.hands[0]).toHaveLength(3);
    expect(next.log[0]).toContain('missed');
  });

  it('lets two-player skip cards keep the turn', () => {
    const skip = card('skip', 'coral', 'skip');
    const state = stateWith([skip, card('spare', 'gold', 2), card('extra', 'mint', 4)]);
    const next = applyMove(state, 0, { type: 'play', card: skip.id });
    expect(next.turn).toBe(0);
  });

  it('allows only the drawn card to be played after drawing', () => {
    const state = stateWith([card('held', 'coral', 5), card('spare', 'mint', 7), card('extra', 'sky', 9)]);
    const drawn = applyMove(state, 0, { type: 'draw' });
    expect(drawn.drawnCard).toBeTruthy();
    expect(() => applyMove(drawn, 0, { type: 'play', card: 'held' })).toThrow('only the drawn card');
  });
});
