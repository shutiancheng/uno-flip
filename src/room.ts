import Peer, { type DataConnection } from 'peerjs';
import { applyMove, botMove, newGame, viewFor, type Move, type Player, type State, type View } from './game';

const PREFIX = 'flipstack-v1:';
type Saved = { state: State; guestToken?: string; names: [string, string]; started: boolean };
export type Snapshot = {
  view: View | null; player: Player; names: [string, string]; connected: boolean; started: boolean;
  status: string; error: string; practice: boolean;
};

function read<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}

export function createRoom(name: string) {
  const id = crypto.randomUUID();
  write(`host:${id}`, { state: newGame(), names: [name.trim().slice(0, 24) || 'Host', 'Guest'], started: false } satisfies Saved);
  return id;
}

export class RoomClient {
  private peer?: Peer;
  private conn?: DataConnection;
  private saved?: Saved;
  private interval?: ReturnType<typeof setInterval>;
  private botTimer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private stopped = false;
  private terminal = false;
  private lastReceived = Date.now();
  private connectingAt = 0;
  private token: string;
  private name: string;
  snapshot: Snapshot;

  constructor(readonly id: string, practice: boolean, name: string) {
    this.name = name.trim().slice(0, 24) || 'Guest';
    this.token = read<string>('guest-token') || crypto.randomUUID();
    write('guest-token', this.token);
    this.saved = practice ? { state: newGame(), names: [name || 'You', 'Nova · practice'], started: true } : read<Saved>(`host:${id}`) || undefined;
    this.snapshot = {
      view: this.saved ? viewFor(this.saved.state, 0) : null,
      player: this.saved ? 0 : 1,
      names: this.saved?.names || ['Host', this.name],
      connected: practice,
      started: this.saved?.started || false,
      status: practice ? 'Practice table' : 'Connecting to the room…',
      error: '', practice,
    };
  }

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.snapshot;
  private update(patch: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(fn => fn()); }

  start() {
    if (this.snapshot.practice) { this.scheduleBot(); return; }
    const options = { debug: 0, config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      ...(import.meta.env.VITE_TURN_URL ? [{
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      }] : []),
    ] } };
    this.peer = this.saved ? new Peer(`flipstack-${this.id}`, options) : new Peer(options);
    this.peer.on('open', () => {
      if (this.saved) this.update({ status: this.saved.started ? 'Waiting for your friend to reconnect…' : 'Your room is ready. Invite a friend.' });
      else this.connectGuest();
    });
    this.peer.on('connection', conn => {
      if (!this.saved) { conn.on('open', () => conn.close()); return; }
      this.bindHost(conn);
    });
    this.peer.on('disconnected', () => { if (!this.conn?.open) this.update({ connected: false, status: 'Reconnecting…' }); });
    this.peer.on('error', error => {
      if (error.type === 'unavailable-id') {
        this.terminal = true;
        this.update({ error: 'This room is already open in another host tab.', status: 'Room already open' });
      } else if (!this.conn?.open) {
        this.update({ connected: false, status: this.saved ? 'Connection interrupted. Retrying…' : 'Looking for the host…' });
      }
    });
    this.interval = setInterval(() => {
      if (this.stopped || this.terminal) return;
      if (this.peer?.disconnected && !this.peer.destroyed) this.peer.reconnect();
      if (this.conn?.open) {
        if (Date.now() - this.lastReceived > 16000) {
          this.conn.close(); this.conn = undefined; this.update({ connected: false, status: 'Connection interrupted. Reconnecting…' });
        } else this.send(this.conn, { type: 'ping' });
      } else if (!this.saved && this.peer?.open && Date.now() - this.connectingAt > 8000) this.connectGuest();
    }, 3000);
  }

  private send(conn: DataConnection | undefined, data: unknown) { if (conn?.open) { try { conn.send(data); } catch { /* Retry loop recovers. */ } } }

  private connectGuest() {
    if (!this.peer?.open || this.terminal) return;
    this.conn?.close(); this.connectingAt = Date.now();
    const conn = this.peer.connect(`flipstack-${this.id}`, { reliable: true, serialization: 'json' });
    this.conn = conn;
    conn.on('open', () => { this.lastReceived = Date.now(); this.send(conn, { type: 'hello', token: this.token, name: this.name }); });
    conn.on('data', raw => {
      if (!raw || typeof raw !== 'object' || conn !== this.conn) return;
      const message = raw as Record<string, unknown>; this.lastReceived = Date.now();
      if (message.type === 'ping') this.send(conn, { type: 'pong' });
      if (message.type === 'state' && message.view && Array.isArray(message.names)) {
        this.update({ view: message.view as View, names: message.names as [string, string], started: true, connected: true, status: 'Connected live', error: '' });
      }
      if (message.type === 'error') this.update({ error: String(message.message) });
      if (message.type === 'full') {
        this.terminal = true; this.update({ connected: false, status: 'Room full', error: 'Both seats are already taken.' }); conn.close();
      }
    });
    conn.on('close', () => { if (this.conn === conn && !this.terminal) this.update({ connected: false, status: 'Waiting for the host to reconnect…' }); });
  }

  private bindHost(conn: DataConnection) {
    let accepted = false;
    const timeout = setTimeout(() => { if (!accepted) conn.close(); }, 10000);
    conn.on('data', raw => {
      if (!raw || typeof raw !== 'object' || !this.saved) return;
      const message = raw as Record<string, unknown>;
      if (message.type === 'hello') {
        if (typeof message.token !== 'string' || !/^[a-f0-9-]{36}$/.test(message.token)) { conn.close(); return; }
        if ((this.saved.guestToken && this.saved.guestToken !== message.token) || (this.conn?.open && this.conn !== conn)) {
          this.send(conn, { type: 'full' }); setTimeout(() => conn.close(), 200); return;
        }
        accepted = true; clearTimeout(timeout); this.conn = conn; this.lastReceived = Date.now();
        this.saved.guestToken = message.token;
        this.saved.names[1] = typeof message.name === 'string' ? message.name.trim().slice(0, 24) || 'Guest' : 'Guest';
        this.saved.started = true;
        this.update({ connected: true, started: true, status: 'Connected live', error: '' });
        this.publish(); return;
      }
      if (!accepted || this.conn !== conn) return;
      this.lastReceived = Date.now();
      if (message.type === 'ping') this.send(conn, { type: 'pong' });
      if (message.type === 'move') {
        if (message.version !== this.saved.state.version) { this.publish(); return; }
        this.execute(1, message.move as Move);
      }
    });
    conn.on('close', () => { clearTimeout(timeout); if (this.conn === conn) { this.conn = undefined; this.update({ connected: false, status: 'Your friend disconnected. Their seat is saved.' }); } });
  }

  private publish() {
    if (!this.saved) return;
    if (!this.snapshot.practice) write(`host:${this.id}`, this.saved);
    this.update({ view: viewFor(this.saved.state, 0), names: [...this.saved.names] });
    this.send(this.conn, { type: 'state', view: viewFor(this.saved.state, 1), names: this.saved.names });
    if (this.snapshot.practice) this.scheduleBot();
  }

  move(move: Move) {
    if (!this.snapshot.connected || !this.snapshot.started) { this.update({ error: 'Wait for your friend to connect.' }); return; }
    this.update({ error: '' });
    if (this.saved) this.execute(0, move);
    else this.send(this.conn, { type: 'move', version: this.snapshot.view?.version, move });
  }

  private execute(player: Player, move: Move) {
    if (!this.saved) return;
    try { this.saved.state = applyMove(this.saved.state, player, move); this.publish(); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid move.';
      if (player === 0) this.update({ error: message }); else this.send(this.conn, { type: 'error', message });
    }
  }

  private scheduleBot() {
    clearTimeout(this.botTimer);
    const state = this.saved!.state;
    if ((state.phase === 'playing' && state.turn === 1) || (state.phase !== 'playing' && !state.ready.includes(1))) {
      this.botTimer = setTimeout(() => { if (!this.stopped && this.saved) this.execute(1, botMove(this.saved.state, 1)); }, 650);
    }
  }

  stop() { this.stopped = true; clearInterval(this.interval); clearTimeout(this.botTimer); this.conn?.close(); this.peer?.destroy(); }
}
