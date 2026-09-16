import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, Check, Copy, FlipHorizontal2, HelpCircle, Link, LockKeyhole, Moon, RefreshCw, Sun, Users, Wifi, X } from 'lucide-react';
import { COLORS, COLOR_LABEL, faceOf, isPlayable, kindLabel, other, type Card, type Color, type Side, type View } from './game';
import { createRoom, RoomClient } from './room';
import './styles.css';

function getName() { try { return localStorage.getItem('flipstack-name') || ''; } catch { return ''; } }
function saveName(name: string) { try { localStorage.setItem('flipstack-name', name.trim()); } catch { /* Optional. */ } }

function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X /></button></div>
    {children}
  </dialog>;
}

function Rules({ close }: { close: () => void }) {
  return <Modal title="How to play" close={close}><div className="rules">
    <p>Match the discard by <strong>color, number, or symbol</strong>. Clear your hand first to score the cards left in your opponent’s hand. First to 500 wins.</p>
    <h3>Two-sided deck</h3><p>Every card has a Day and Night face. Play FLIP and the deck, discard pile, and every hand turn over together. Night actions are tougher.</p>
    <div className="rule-grid">
      <div><strong>Day</strong><span>Draw 1 · Skip · Reverse · Wild +2</span></div>
      <div><strong>Night</strong><span>Draw 5 · Skip All · Reverse · Draw Color</span></div>
    </div>
    <h3>Drawing & last card</h3><p>Draw one when you choose not to play. You may play that card immediately if it matches, or keep it and end your turn. Mark the last-card call when playing down to one card—or draw two as a penalty.</p>
    <p className="legal-note">Uno Flip is a trademark of Mattel. This is an unofficial fan-made browser adaptation with original artwork and is not affiliated with or endorsed by Mattel.</p>
  </div></Modal>;
}

function CardFace({ card, side, small = false }: { card: Card; side: Side; small?: boolean }) {
  const face = faceOf(card, side);
  const label = kindLabel(face.kind);
  return <div className={`card face-${face.color} ${small ? 'card-small' : ''}`}>
    <div className="card-grain" />
    <span className="corner top">{label}</span><span className="corner bottom">{label}</span>
    <div className="card-orbit"><span>{label}</span></div>
    <span className="side-mark">{side === 'day' ? 'D' : 'N'}</span>
  </div>;
}

function CardBack({ side, index = 0 }: { side: Side; index?: number }) {
  return <div className={`card card-back ${side}`} style={{ '--i': index } as React.CSSProperties}>
    <div className="back-ring"><FlipHorizontal2 /><b>FLIP</b><span>STACK</span></div>
  </div>;
}

function Landing({ onRules }: { onRules: () => void }) {
  const [name, setName] = useState(getName());
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const go = (path: string) => { saveName(name); history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); };
  const host = () => { const id = createRoom(name); go(`/room/${id}`); };
  const practice = () => go(`/practice/${crypto.randomUUID()}`);
  const join = () => {
    const match = joinCode.trim().match(/(?:room\/)?([a-f0-9-]{36})/i);
    if (match) go(`/room/${match[1]}`);
  };
  return <>
    <header className="site-header"><a className="brand" href="/"><span className="brand-flip">UNO</span><span>FLIP</span></a><nav><button onClick={onRules}>How to play</button><span className="edition">UNOFFICIAL ONLINE EDITION</span></nav></header>
    <main className="landing">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span /> HEADS OR TAILS. DAY OR NIGHT.</div><h1>One deck.<br/><em>Two moods.</em></h1>
          <p className="hero-description">A fast, ruthless card duel that changes its rules—and its colors—in a single flip.</p>
          <div className="start-card"><label htmlFor="name">YOUR TABLE NAME</label><input id="name" value={name} maxLength={24} placeholder="Enter your name" onChange={event => setName(event.target.value)} />
            <button className="primary" onClick={host}>Create private room <ArrowRight /></button>
            <button className="join-link" onClick={() => setJoinOpen(true)}><Link /> Join with an invite</button>
          </div>
          <button className="practice-link" onClick={practice}>Try a practice round <ArrowRight /></button>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="glow day-glow"/><div className="glow night-glow"/>
          <div className="hero-card hero-one"><CardFace card={{ id: 'hero1', day: { color: 'coral', kind: 'flip' }, night: { color: 'aqua', kind: 'flip' } }} side="day" /></div>
          <div className="hero-card hero-two"><CardFace card={{ id: 'hero2', day: { color: 'sky', kind: 7 }, night: { color: 'violet', kind: 7 } }} side="day" /></div>
          <div className="hero-card hero-three"><CardFace card={{ id: 'hero3', day: { color: 'gold', kind: 'wild' }, night: { color: 'ember', kind: 'wild' } }} side="night" /></div>
          <div className="flip-badge"><FlipHorizontal2 /><span>FLIP<br/>THE DECK</span></div>
        </div>
      </section>
      <section className="feature-strip"><div><b>01</b><span><strong>Match & discard</strong>Play by color, number, or symbol.</span></div><div><b>02</b><span><strong>Turn the tables</strong>Flip every card to its other face.</span></div><div><b>03</b><span><strong>Empty your hand</strong>First out scores the round.</span></div></section>
      <div className="landing-note"><span><LockKeyhole /> Private peer-to-peer rooms</span><button onClick={onRules}>Read the full rules <ArrowRight /></button></div>
    </main>
    <footer><span>UNO FLIP · UNOFFICIAL FAN-MADE GAME</span><span>Original artwork · Not affiliated with Mattel</span></footer>
    {joinOpen && <Modal title="Join a room" close={() => setJoinOpen(false)}><div className="join-form"><p>Paste the invite link or room code your friend sent you.</p><input autoFocus value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Invite link or code" onKeyDown={event => { if (event.key === 'Enter') join(); }} /><button className="primary" onClick={join}>Take my seat <ArrowRight /></button></div></Modal>}
  </>;
}

function PlayerRow({ name, count, score, active, you }: { name: string; count: number; score: number; active: boolean; you?: boolean }) {
  return <div className={`player-row ${active ? 'active' : ''}`}><div className="avatar">{name.slice(0, 1).toUpperCase()}</div><div><strong>{name}{you ? ' · YOU' : ''}</strong><span>{count} card{count === 1 ? '' : 's'} left</span></div><div className="player-score"><b>{score}</b><span>PTS</span></div></div>;
}

function ColorPicker({ side, choose, cancel }: { side: Side; choose: (color: Color) => void; cancel: () => void }) {
  return <Modal title="Choose the active color" close={cancel}><div className="color-picker">{COLORS[side].map(color => <button className={`color-choice color-${color}`} key={color} onClick={() => choose(color)}><span />{COLOR_LABEL[color]}</button>)}</div></Modal>;
}

function Game({ roomId, practice, name, onRules }: { roomId: string; practice: boolean; name: string; onRules: () => void }) {
  const client = useMemo(() => new RoomClient(roomId, practice, name), [roomId, practice, name]);
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [wild, setWild] = useState<Card | null>(null);
  const [uno, setUno] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const invite = `${location.origin}/room/${roomId}`;
  const copy = async () => { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  if (!snap.view) return <div className="game-shell"><header className="game-header"><a href="/" className="back"><ArrowLeft /> Home</a><span className="brand"><span className="brand-flip">UNO</span>FLIP</span></header><div className="connection-screen"><RefreshCw className="spin"/><h2>{snap.status}</h2><p>{snap.error || 'Keep this page open while we find the table.'}</p></div></div>;
  const view = snap.view;
  const me = snap.player, them = other(me), myTurn = view.phase === 'playing' && view.turn === me;
  const top = view.discard[view.discard.length - 1];
  const play = (card: Card, color?: Color) => { client.move({ type: 'play', card: card.id, color, uno }); setUno(false); setWild(null); };
  const clickCard = (card: Card) => {
    if (!myTurn || !isPlayable(card, view) || (view.drawnCard && view.drawnCard !== card.id)) return;
    if (faceOf(card, view.side).color === 'wild') setWild(card); else play(card);
  };
  const status = view.phase !== 'playing' ? (view.winner === me ? 'You took the round' : `${snap.names[view.winner!]} took the round`) : myTurn ? 'Your move' : `${snap.names[them]} is playing`;
  return <div className={`game-shell side-${view.side}`}>
    <header className="game-header"><a href="/" className="back"><ArrowLeft /> Home</a><span className="brand"><span className="brand-flip">UNO</span>FLIP</span><button className="rules-button" onClick={onRules}><HelpCircle /> Rules</button></header>
    <main className="game-main">
      <div className="table-title"><div><span>PRIVATE ROOM · ROUND {view.round}</span><h1>{practice ? 'Practice duel' : 'Two-player duel'}</h1></div><div className={`live ${snap.connected ? 'online' : ''}`}><i />{snap.status}</div></div>
      {!snap.started && !practice ? <section className="invite-state"><Users /><h2>Your table is ready</h2><p>Send this private link to one friend. The game begins when they arrive.</p><div className="invite-box"><input readOnly value={invite}/><button className="primary" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy invite'}</button></div><span><LockKeyhole /> The first guest keeps the second seat.</span></section> : <>
        <section className="table">
          <PlayerRow name={snap.names[them]} count={view.handCounts[them]} score={view.scores[them]} active={view.turn === them && view.phase === 'playing'} />
          <div className="opponent-hand">{Array.from({ length: Math.min(view.handCounts[them], 18) }, (_, index) => <CardBack key={index} side={view.side} index={index} />)}</div>
          <div className="center-play">
            <button className="draw-pile" onClick={() => myTurn && !view.drawnCard && client.move({ type: 'draw' })} disabled={!myTurn || !!view.drawnCard} aria-label="Draw a card"><CardBack side={view.side}/><span>{view.deckCount} cards</span></button>
            <div className="discard-pile"><CardFace card={top} side={view.side}/><span>Active · {COLOR_LABEL[view.activeColor]}</span></div>
            <div className={`side-indicator ${view.side}`}><span>{view.side === 'day' ? <Sun/> : <Moon/>}</span><div><b>{view.side.toUpperCase()} SIDE</b><small>{view.side === 'day' ? 'Bright rules' : 'No mercy'}</small></div></div>
          </div>
          <div className="turn-callout"><span>{status}</span><strong>{myTurn ? (view.drawnCard ? 'Play the drawn card or keep it.' : 'Match the color or symbol—or draw.') : 'Your hand is hidden from your opponent.'}</strong></div>
          <div className="my-hand">{view.hand.map((card, index) => {
            const playable = myTurn && isPlayable(card, view) && (!view.drawnCard || view.drawnCard === card.id);
            return <button key={card.id} className={`hand-card ${playable ? 'playable' : ''} ${view.drawnCard === card.id ? 'drawn' : ''}`} style={{ '--n': index - (view.hand.length - 1) / 2 } as React.CSSProperties} onClick={() => clickCard(card)} disabled={!playable}><CardFace card={card} side={view.side}/></button>;
          })}</div>
          <div className="hand-actions"><label className={view.hand.length === 2 && myTurn ? 'armed' : ''}><input type="checkbox" checked={uno} onChange={event => setUno(event.target.checked)} disabled={!myTurn || view.hand.length !== 2}/><span>LAST CARD!</span></label>{view.drawnCard && myTurn && <button className="secondary" onClick={() => client.move({ type: 'keep' })}>Keep card <ArrowRight /></button>}</div>
          <PlayerRow name={snap.names[me]} count={view.handCounts[me]} score={view.scores[me]} active={myTurn} you />
        </section>
        {snap.error && <div className="error">{snap.error}</div>}
        {view.phase !== 'playing' && <section className="result"><div><span>{view.phase === 'finished' ? 'MATCH COMPLETE' : 'ROUND COMPLETE'}</span><h2>{status}</h2><p>{view.phase === 'finished' ? `${snap.names[view.winner!]} reached 500 points.` : 'Both players continue when ready.'}</p></div><button className="primary" disabled={view.ready.includes(me)} onClick={() => client.move({ type: 'ready' })}>{view.ready.includes(me) ? <><Check/> Ready</> : <>Play again <RefreshCw/></>}</button></section>}
        <section className="game-log"><h3>Table notes</h3>{view.log.slice(0, 5).map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}</section>
      </>}
    </main>
    {wild && <ColorPicker side={view.side} choose={color => play(wild, color)} cancel={() => setWild(null)} />}
  </div>;
}

function App() {
  const [path, setPath] = useState(location.pathname);
  const [rules, setRules] = useState(false);
  useEffect(() => { const update = () => setPath(location.pathname); addEventListener('popstate', update); return () => removeEventListener('popstate', update); }, []);
  const room = path.match(/^\/room\/([a-f0-9-]{36})$/i);
  const practice = path.match(/^\/practice\/([a-f0-9-]{36})$/i);
  return <>{room || practice ? <Game roomId={(room || practice)![1]} practice={!!practice} name={getName()} onRules={() => setRules(true)} /> : <Landing onRules={() => setRules(true)} />}{rules && <Rules close={() => setRules(false)} />}</>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
