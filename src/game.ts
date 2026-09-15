export type Player = 0 | 1;
export type Side = 'day' | 'night';
export type DayColor = 'coral' | 'gold' | 'mint' | 'sky';
export type NightColor = 'ember' | 'acid' | 'violet' | 'aqua';
export type Color = DayColor | NightColor;
export type Kind = number | 'draw1' | 'reverse' | 'skip' | 'flip' | 'wild' | 'wildDraw2' | 'draw5' | 'skipAll' | 'wildDrawColor';
export type Face = { color: Color | 'wild'; kind: Kind };
export type Card = { id: string; day: Face; night: Face };
export type State = {
  version: number;
  round: number;
  side: Side;
  turn: Player;
  phase: 'playing' | 'roundOver' | 'finished';
  hands: [Card[], Card[]];
  deck: Card[];
  discard: Card[];
  activeColor: Color;
  drawnCard: string | null;
  winner: Player | null;
  scores: [number, number];
  ready: Player[];
  log: string[];
};
export type View = Omit<State, 'hands' | 'deck'> & { hand: Card[]; handCounts: [number, number]; deckCount: number };
export type Move =
  | { type: 'play'; card: string; color?: Color; uno?: boolean }
  | { type: 'draw' }
  | { type: 'keep' }
  | { type: 'ready' };

export const COLORS: Record<Side, Color[]> = {
  day: ['coral', 'gold', 'mint', 'sky'],
  night: ['ember', 'acid', 'violet', 'aqua'],
};
export const COLOR_LABEL: Record<Color, string> = {
  coral: 'Coral', gold: 'Gold', mint: 'Mint', sky: 'Sky', ember: 'Ember', acid: 'Acid', violet: 'Violet', aqua: 'Aqua',
};
export const other = (player: Player): Player => player === 0 ? 1 : 0;
export const faceOf = (card: Card, side: Side) => card[side];
export const kindLabel = (kind: Kind) => typeof kind === 'number' ? String(kind) : ({
  draw1: '+1', reverse: 'REVERSE', skip: 'SKIP', flip: 'FLIP', wild: 'WILD', wildDraw2: 'WILD +2',
  draw5: '+5', skipAll: 'SKIP ALL', wildDrawColor: 'DRAW COLOR',
} satisfies Record<Exclude<Kind, number>, string>)[kind];

export function shuffle<T>(items: T[], random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildFaces(side: Side): Face[] {
  const colors = COLORS[side];
  const faces: Face[] = [];
  for (const color of colors) {
    faces.push({ color, kind: 0 });
    for (let value = 1; value <= 9; value++) faces.push({ color, kind: value }, { color, kind: value });
    const twice: Kind[] = side === 'day' ? ['draw1', 'reverse', 'skip'] : ['draw5', 'reverse', 'skipAll'];
    for (const kind of twice) faces.push({ color, kind }, { color, kind });
    faces.push({ color, kind: 'flip' });
  }
  for (let i = 0; i < 4; i++) {
    faces.push({ color: 'wild', kind: 'wild' });
    faces.push({ color: 'wild', kind: side === 'day' ? 'wildDraw2' : 'wildDrawColor' });
  }
  return faces;
}

export function makeDeck(random?: () => number): Card[] {
  const day = shuffle(buildFaces('day'), random);
  const night = shuffle(buildFaces('night'), random);
  return day.map((face, index) => ({ id: `c${index}`, day: face, night: night[index] }));
}

function drawInto(state: State, player: Player, count: number) {
  for (let i = 0; i < count; i++) {
    if (!state.deck.length) {
      const top = state.discard.pop()!;
      state.deck = shuffle(state.discard);
      state.discard = [top];
    }
    const card = state.deck.pop();
    if (card) state.hands[player].push(card);
  }
}

function startRound(previous?: State, random?: () => number): State {
  const deck = makeDeck(random);
  const hands: [Card[], Card[]] = [[], []];
  for (let i = 0; i < 7; i++) { hands[0].push(deck.pop()!); hands[1].push(deck.pop()!); }
  let firstIndex = -1;
  for (let index = deck.length - 1; index >= 0; index--) {
    if (typeof deck[index].day.kind === 'number') { firstIndex = index; break; }
  }
  if (firstIndex < 0) firstIndex = deck.length - 1;
  const [first] = deck.splice(firstIndex, 1);
  const starter = previous ? other(previous.turn) : 0;
  return {
    version: previous ? previous.version + 1 : 0,
    round: previous ? previous.round + 1 : 1,
    side: 'day', turn: starter, phase: 'playing', hands, deck, discard: [first], activeColor: first.day.color as Color,
    drawnCard: null, winner: null, scores: previous ? [...previous.scores] : [0, 0], ready: [],
    log: [`Round ${previous ? previous.round + 1 : 1}. ${starter === 0 ? 'Host' : 'Guest'} leads.`],
  };
}

export function newGame(random?: () => number) { return startRound(undefined, random); }

export function isPlayable(card: Card, state: Pick<State, 'side' | 'activeColor' | 'discard'>): boolean {
  const face = faceOf(card, state.side);
  const top = faceOf(state.discard[state.discard.length - 1], state.side);
  return face.color === 'wild' || face.color === state.activeColor || face.kind === top.kind;
}

function points(card: Card, side: Side): number {
  const kind = faceOf(card, side).kind;
  if (typeof kind === 'number') return kind;
  if (kind === 'wild' || kind === 'wildDraw2' || kind === 'wildDrawColor') return 50;
  return 20;
}

function endRound(state: State, player: Player) {
  const gained = state.hands[other(player)].reduce((sum, card) => sum + points(card, state.side), 0);
  state.scores[player] += gained;
  state.winner = player;
  state.phase = state.scores[player] >= 500 ? 'finished' : 'roundOver';
  state.log.unshift(`${player === 0 ? 'Host' : 'Guest'} cleared their hand and scored ${gained}.`);
}

function validateWildColor(side: Side, color: Color | undefined): Color {
  if (!color || !COLORS[side].includes(color)) throw new Error('Choose a color for the wild card.');
  return color;
}

export function applyMove(state: State, player: Player, move: Move): State {
  const s: State = structuredClone(state);
  if (!move || typeof move !== 'object') throw new Error('Invalid move.');
  if (move.type === 'ready') {
    if (s.phase === 'playing' || s.ready.includes(player)) throw new Error('The round is still active.');
    s.ready.push(player); s.version++;
    if (s.ready.length === 2) return s.phase === 'finished' ? newGame() : startRound(s);
    return s;
  }
  if (s.phase !== 'playing' || s.turn !== player) throw new Error('Wait for your turn.');
  if (move.type === 'draw') {
    if (s.drawnCard) throw new Error('You already drew a card.');
    drawInto(s, player, 1);
    s.drawnCard = s.hands[player][s.hands[player].length - 1].id;
    s.log.unshift(`${player === 0 ? 'Host' : 'Guest'} drew a card.`);
  } else if (move.type === 'keep') {
    if (!s.drawnCard) throw new Error('Draw before ending your turn.');
    s.drawnCard = null;
    s.turn = other(player);
  } else if (move.type === 'play') {
    const card = s.hands[player].find(item => item.id === move.card);
    if (!card) throw new Error('That card is not in your hand.');
    if (s.drawnCard && card.id !== s.drawnCard) throw new Error('After drawing, only the drawn card may be played.');
    if (!isPlayable(card, s)) throw new Error('Match the active color or symbol.');
    const face = faceOf(card, s.side);
    if ((face.kind === 'wildDraw2') && s.hands[player].some(item => item.id !== card.id && faceOf(item, s.side).color === s.activeColor)) {
      throw new Error('Wild +2 can only be played without the active color in hand.');
    }
    const chosen = face.color === 'wild' ? validateWildColor(s.side, move.color) : face.color;
    s.hands[player] = s.hands[player].filter(item => item.id !== card.id);
    s.discard.push(card); s.drawnCard = null; s.activeColor = chosen as Color;
    const label = kindLabel(face.kind);
    s.log.unshift(`${player === 0 ? 'Host' : 'Guest'} played ${label}${face.color === 'wild' ? ` · ${COLOR_LABEL[chosen as Color]}` : ''}.`);
    if (s.hands[player].length === 1 && !move.uno) {
      drawInto(s, player, 2);
      s.log.unshift(`${player === 0 ? 'Host' : 'Guest'} missed the last-card call and drew 2.`);
    }
    if (!s.hands[player].length) endRound(s, player);
    else if (face.kind === 'flip') {
      s.side = s.side === 'day' ? 'night' : 'day';
      const flipped = faceOf(card, s.side);
      s.activeColor = (flipped.color === 'wild' ? COLORS[s.side][0] : flipped.color) as Color;
      s.turn = other(player);
      s.log.unshift(`The whole deck flipped to the ${s.side} side.`);
    } else if (face.kind === 'draw1' || face.kind === 'wildDraw2' || face.kind === 'draw5') {
      const amount = face.kind === 'draw1' ? 1 : face.kind === 'wildDraw2' ? 2 : 5;
      drawInto(s, other(player), amount); s.turn = player;
      s.log.unshift(`${other(player) === 0 ? 'Host' : 'Guest'} drew ${amount} and lost the turn.`);
    } else if (face.kind === 'wildDrawColor') {
      const target = other(player); let count = 0; let found = false;
      while (!found && count < 112) {
        const before = s.hands[target].length; drawInto(s, target, 1);
        if (s.hands[target].length === before) break;
        const drawn = s.hands[target][s.hands[target].length - 1]; count++;
        found = faceOf(drawn, s.side).color === chosen;
      }
      s.turn = player; s.log.unshift(`${target === 0 ? 'Host' : 'Guest'} drew ${count} to find ${COLOR_LABEL[chosen as Color]}.`);
    } else if (face.kind === 'skip' || face.kind === 'skipAll' || face.kind === 'reverse') {
      s.turn = player;
    } else s.turn = other(player);
  } else throw new Error('Unknown move.');
  s.version++; s.log = s.log.slice(0, 30); return s;
}

export function viewFor(state: State, player: Player): View {
  const { hands, deck, ...visible } = state;
  return structuredClone({ ...visible, hand: hands[player], handCounts: [hands[0].length, hands[1].length], deckCount: deck.length });
}

export function botMove(state: State, player: Player): Move {
  if (state.phase !== 'playing') return { type: 'ready' };
  if (state.turn !== player) return { type: 'keep' };
  if (state.drawnCard) {
    const card = state.hands[player].find(item => item.id === state.drawnCard)!;
    if (!isPlayable(card, state)) return { type: 'keep' };
    const face = faceOf(card, state.side);
    return { type: 'play', card: card.id, color: face.color === 'wild' ? COLORS[state.side][0] : undefined, uno: state.hands[player].length === 2 };
  }
  const playable = state.hands[player].filter(card => isPlayable(card, state));
  if (!playable.length) return { type: 'draw' };
  const card = playable[Math.floor(Math.random() * playable.length)];
  const face = faceOf(card, state.side);
  return { type: 'play', card: card.id, color: face.color === 'wild' ? COLORS[state.side][Math.floor(Math.random() * 4)] : undefined, uno: state.hands[player].length === 2 };
}
