import { createContext, useContext, useReducer, useCallback, useEffect, useRef, ReactNode, useState } from 'react';
import { applyPatches } from 'immer';
import type { GameRoom, Player, Round, GamePhase, RoundAnswers, Category, ValidatedAnswer, Reaction, ReactionType, PowerUpType } from '@shared/schema';

// FIX: Persist session info in sessionStorage for reconnection
const SESSION_KEY = 'egyptian_bus_session';

function saveSession(playerId: string, roomCode: string) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ playerId, roomCode, ts: Date.now() })); } catch { }
}
function loadSession(): { playerId: string; roomCode: string; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Session valid for 30 minutes
    if (Date.now() - data.ts > 30 * 60 * 1000) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return data;
  } catch { return null; }
}
function clearSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch { } }

interface GameState {
  room: GameRoom | null;
  playerId: string | null;
  ws: WebSocket | null;
  connected: boolean;
  error: string | null;
  timeLeft: number;
  isRush: boolean;
  reconnecting: boolean; // FIX: show reconnecting indicator
}

type GameAction =
  | { type: 'SET_ROOM'; room: GameRoom }
  | { type: 'SET_PLAYER_ID'; playerId: string }
  | { type: 'SET_WS'; ws: WebSocket }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_TIME_LEFT'; timeLeft: number }
  | { type: 'SET_RUSH'; isRush: boolean }
  | { type: 'UPDATE_PLAYERS'; players: Player[] }
  | { type: 'UPDATE_PHASE'; phase: GamePhase }
  | { type: 'UPDATE_ROUND'; round: Round }
  | { type: 'UPDATE_VOTE_STATE'; payload: any }
  | { type: 'SET_RECONNECTING'; reconnecting: boolean }
  | { type: 'APPLY_PATCHES'; patches: any[] }
  | { type: 'RESET' };

const initialState: GameState = {
  room: null,
  playerId: null,
  ws: null,
  connected: false,
  error: null,
  timeLeft: 45,
  isRush: false,
  reconnecting: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_ROOM':
      return { ...state, room: action.room, error: null };
    case 'SET_PLAYER_ID':
      return { ...state, playerId: action.playerId };
    case 'SET_WS':
      return { ...state, ws: action.ws };
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected, reconnecting: false };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.timeLeft };
    case 'SET_RUSH':
      return { ...state, isRush: action.isRush };
    case 'UPDATE_PLAYERS':
      return state.room ? { ...state, room: { ...state.room, players: action.players } } : state;
    case 'UPDATE_PHASE':
      return state.room ? { ...state, room: { ...state.room, phase: action.phase } } : state;
    case 'UPDATE_ROUND':
      if (!state.room) return state;
      const rounds = [...state.room.rounds];
      rounds[state.room.currentRound] = action.round;
      return { ...state, room: { ...state.room, rounds } };
    case 'UPDATE_VOTE_STATE':
      if (!state.room) return state;
      let newCurrentVote = state.room.currentVote;
      let newVoteQueue = state.room.voteQueue;
      if (action.payload.yes !== undefined && state.room.currentVote) {
        newCurrentVote = { ...state.room.currentVote, votes: { yes: action.payload.yes, no: action.payload.no }, voterIds: state.room.currentVote.voterIds };
      } else if (action.payload.requestId) {
        newCurrentVote = action.payload;
      } else {
        if (action.payload.vote) newCurrentVote = action.payload.vote;
        if (action.payload.currentVote) newCurrentVote = action.payload.currentVote;
        if (action.payload.queue) newVoteQueue = action.payload.queue;
      }
      return { ...state, room: { ...state.room, currentVote: newCurrentVote, voteQueue: newVoteQueue } };
    case 'SET_RECONNECTING':
      return { ...state, reconnecting: action.reconnecting };
    case 'APPLY_PATCHES':
      if (!state.room) return state;
      try {
        return { ...state, room: applyPatches(state.room, action.patches) };
      } catch (e) {
        console.error("Failed to apply patches", e);
        return state;
      }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  setReady: () => void;
  startGame: () => void;
  submitAnswers: (answers: RoundAnswers) => void;
  sendDraftUpdate: (answers: RoundAnswers) => void;
  triggerBusComplete: () => void;
  vote: (playerId: string, category: Category, accepted: boolean) => void;
  setReferee: (playerId: string) => void;
  removeReferee: () => void;
  refereeDeduct: (playerId: string, category: Category, reason: string) => void;
  refereeToggleUnique: (playerId: string, category: Category) => void;
  refereeApprove: () => void;
  nextRound: () => void;
  playAgain: () => void;
  disconnect: () => void;
  sendReaction: (reactionType: ReactionType) => void;
  reactions: Reaction[];
  currentPlayer: Player | null;
  currentRound: Round | null;
  isHost: boolean;
  isReferee: boolean;
  referee: Player | null;
  updateSettings: (settings: any) => void;
  requestVote: (playerId: string, category: string, word: string) => void;
  // FIX: New parallel vote cast (per-answer)
  castParallelVote: (requesterId: string, category: string, vote: 'yes' | 'no') => void;
  // FIX: Host can force resolve all votes
  hostResolveVotes: () => void;
  // FIX: Host can kick a player
  kickPlayer: (playerId: string) => void;
  activatePowerUp: (type: PowerUpType, targetId?: string) => void;
  activePowerUpNotification: { type: PowerUpType; playerName: string } | null;
  isBanished: boolean;
  banishedBy: string | null;
  banishOverlay: boolean;
  setBanishOverlay: (show: boolean) => void;

  refereeToggleValidity: (playerId: string, category: Category) => void;
  refereeOverride: (requestId: string, category: string, accepted: boolean) => void;
  hostAdjustScore: (playerId: string, delta: number) => void;
  sendMessage: (type: string, payload: any) => void;
  sendAppeal: (targetPlayerId: string, category: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [activePowerUpNotification, setActivePowerUpNotification] = useState<{ type: PowerUpType; playerName: string } | null>(null);
  const [isBanished, setIsBanished] = useState(false);
  const [banishedBy, setBanishedBy] = useState<string | null>(null);
  const [banishOverlay, setBanishOverlay] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // FIX: Reconnection tracking
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionalDisconnectRef = useRef(false);
  // BUG-5 FIX: Always-current state ref to avoid stale closures in handleMessage
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'room_created':
      case 'room_joined':
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_PLAYER_ID', playerId: message.payload.playerId });
        // FIX: Save session for reconnection
        saveSession(message.payload.playerId, message.payload.room.code);
        break;
      case 'player_submitted':
        // BUG-5 FIX: use stateRef.current to avoid stale closure reading null room
        if (stateRef.current.room && message.payload?.playerId) {
          const submittingPlayer = stateRef.current.room.players.find(p => p.id === message.payload.playerId);
          const updatedRounds = stateRef.current.room.rounds.map((r, i) => {
            if (i !== stateRef.current.room!.currentRound) return r;
            const alreadySubmitted = r.submissions.some(s => s.playerId === message.payload.playerId);
            if (alreadySubmitted) return r;
            return {
              ...r,
              submissions: [
                ...r.submissions,
                {
                  playerId: message.payload.playerId,
                  playerName: submittingPlayer?.name || '',
                  answers: {},
                  submittedAt: Date.now(),
                  busComplete: false,
                }
              ]
            };
          });
          dispatch({ type: 'SET_ROOM', room: { ...stateRef.current.room, rounds: updatedRounds } });
        }
        break;

      case 'player_joined':
      case 'player_left':
      case 'player_ready':

        dispatch({ type: 'UPDATE_PLAYERS', players: message.payload.players });
        break;
      case 'round_start':
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_TIME_LEFT', timeLeft: 45 });
        dispatch({ type: 'SET_RUSH', isRush: false });
        setIsBanished(false);
        setBanishedBy(null);
        break;
      case 'rush_mode':
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_RUSH', isRush: true });
        dispatch({ type: 'SET_TIME_LEFT', timeLeft: 10 });
        break;
      case 'voting_start':
      case 'round_results':
      case 'game_end':
      case 'sync_state':
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_RUSH', isRush: false });
        break;
      case 'patch_update':
        dispatch({ type: 'APPLY_PATCHES', patches: message.payload.patches });
        break;
      case 'vote_session_start':
      case 'vote_update':
      case 'vote_session_result':
        dispatch({ type: 'UPDATE_VOTE_STATE', payload: message.payload });
        break;
      case 'error':
        dispatch({ type: 'SET_ERROR', error: message.payload.message });
        break;
      case 'reaction_received':
        setReactions(prev => {
          const newReactions = [...prev, message.payload.reaction];
          setTimeout(() => {
            setReactions(r => r.filter(reaction => reaction.id !== message.payload.reaction.id));
          }, 3000);
          return newReactions;
        });
        break;
      case 'powerup_activated':
        setActivePowerUpNotification({ type: message.payload.type, playerName: message.payload.playerName });
        setTimeout(() => setActivePowerUpNotification(null), 3000);
        break;
      case 'wildcard_activated':
        setActivePowerUpNotification({ type: 'wildcard', playerName: message.payload.playerName || 'You' });
        setTimeout(() => setActivePowerUpNotification(null), 4000);
        break;
      case 'player_banished':
        setIsBanished(true);
        setBanishedBy(message.payload.banishedBy);
        break;
      case 'referee_review_start':
        setIsBanished(false);
        setBanishedBy(null);
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_RUSH', isRush: false });
        break;
      case 'toast':
        // FIX: Show server toast messages in the UI (was only console.log before)
        if (typeof message.payload?.message === 'string') {
          // Use a custom event so Toaster can pick it up without hook dependency here
          window.dispatchEvent(new CustomEvent('game-toast', { detail: message.payload }));
        }
        break;
      case 'appeal_result':
        window.dispatchEvent(new CustomEvent('game-toast', {
          detail: {
            message: message.payload.success ? '✅ ' + (message.payload.message || 'تم قبول الاستئناف') : '❌ ' + (message.payload.message || 'تم رفض الاستئناف'),
            type: message.payload.success ? 'success' : 'error'
          }
        }));
        break;

      // FIX: Handle being kicked
      case 'kicked':
        clearSession();
        dispatch({ type: 'RESET' });
        dispatch({ type: 'SET_ERROR', error: message.payload.reason || 'تم طردك من الغرفة' });
        isIntentionalDisconnectRef.current = true; // Don't reconnect
        break;
    }
  }, []);

  // FIX: Robust reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (isIntentionalDisconnectRef.current) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

    const attempt = reconnectAttemptRef.current;
    if (attempt >= 8) {
      // Give up after 8 attempts (~4 minutes total)
      dispatch({ type: 'SET_ERROR', error: 'انتهت محاولات الاتصال. حاول مجدداً.' });
      dispatch({ type: 'SET_RECONNECTING', reconnecting: false });
      return;
    }

    // Exponential backoff: 2s, 4s, 8s, 16s, 30s, 30s, 30s, 30s
    const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
    dispatch({ type: 'SET_RECONNECTING', reconnecting: true });

    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptRef.current++;
      connectWs();
    }, delay);
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return wsRef.current;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      reconnectAttemptRef.current = 0; // Reset backoff
      dispatch({ type: 'SET_CONNECTED', connected: true });
      dispatch({ type: 'SET_ERROR', error: null });

      // FIX (#5): Attempt silent rejoin if session exists
      const session = loadSession();
      if (session && session.playerId && session.roomCode) {
        ws.send(JSON.stringify({
          type: 'rejoin_room',
          payload: { roomCode: session.roomCode, playerId: session.playerId }
        }));
      }
    };

    ws.onclose = () => {
      dispatch({ type: 'SET_CONNECTED', connected: false });
      if (!isIntentionalDisconnectRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      dispatch({ type: 'SET_ERROR', error: 'مشكلة في الاتصال...' });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // FIX: Respond to server pings with pong
        if (message.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: message.payload?.timestamp } }));
          }
          return;
        }
        handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    wsRef.current = ws;
    dispatch({ type: 'SET_WS', ws });
    return ws;
  }, [handleMessage, scheduleReconnect]);

  const connect = useCallback(() => {
    isIntentionalDisconnectRef.current = false;
    return connectWs();
  }, [connectWs]);

  const sendMessage = useCallback((type: string, payload: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const createRoom = useCallback((playerName: string) => {
    clearSession();
    const ws = connect();
    const doCreate = () => {
      ws.send(JSON.stringify({ type: 'create_room', payload: { playerName } }));
    };
    if (ws.readyState === WebSocket.OPEN) doCreate();
    else ws.addEventListener('open', doCreate, { once: true });
  }, [connect]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    clearSession();
    const ws = connect();
    const doJoin = () => {
      ws.send(JSON.stringify({ type: 'join_room', payload: { roomCode: roomCode.toUpperCase(), playerName } }));
    };
    if (ws.readyState === WebSocket.OPEN) doJoin();
    else ws.addEventListener('open', doJoin, { once: true });
  }, [connect]);

  const setReady = useCallback(() => { sendMessage('player_ready', { playerId: state.playerId }); }, [sendMessage, state.playerId]);
  const startGame = useCallback(() => { sendMessage('start_game', {}); }, [sendMessage]);
  const submitAnswers = useCallback((answers: RoundAnswers) => { sendMessage('submit_answers', { answers }); }, [sendMessage]);
  const triggerBusComplete = useCallback(() => { sendMessage('bus_complete', {}); }, [sendMessage]);
  const sendDraftUpdate = useCallback((answers: RoundAnswers) => { sendMessage('draft_update', { answers }); }, [sendMessage]);
  const vote = useCallback((playerId: string, category: Category, accepted: boolean) => {
    // FIX: Route to parallel vote
    sendMessage('cast_parallel_vote', { requesterId: playerId, category, vote: accepted ? 'yes' : 'no' });
  }, [sendMessage]);
  const setReferee = useCallback((playerId: string) => { sendMessage('set_referee', { playerId }); }, [sendMessage]);
  const removeReferee = useCallback(() => { sendMessage('remove_referee', {}); }, [sendMessage]);
  const refereeDeduct = useCallback((playerId: string, category: Category, reason: string) => { sendMessage('referee_deduct', { playerId, category, reason }); }, [sendMessage]);
  // P1-6 FIX: Was 'referee_toggle_unique' which the server doesn't handle — must match server handler
  const refereeToggleUnique = useCallback((playerId: string, category: Category) => { sendMessage('referee_toggle_validity', { playerId, category }); }, [sendMessage]);
  const refereeToggleValidity = useCallback((playerId: string, category: Category) => { sendMessage('referee_toggle_validity', { playerId, category }); }, [sendMessage]);
  const refereeApprove = useCallback(() => { sendMessage('referee_approve', {}); }, [sendMessage]);
  const nextRound = useCallback(() => { sendMessage('next_round', {}); }, [sendMessage]);
  const playAgain = useCallback(() => { sendMessage('play_again', {}); }, [sendMessage]);
  const sendReaction = useCallback((reactionType: ReactionType) => { sendMessage('send_reaction', { reactionType }); }, [sendMessage]);
  const updateSettings = useCallback((settings: any) => { sendMessage('update_settings', settings); }, [sendMessage]);
  const requestVote = useCallback((playerId: string, category: string, word: string) => { sendMessage('request_vote', { playerId, category, word }); }, [sendMessage]);
  // Sequential voting removed — use castParallelVote only
  const castParallelVote = useCallback((requesterId: string, category: string, vote: 'yes' | 'no') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cast_parallel_vote',
        payload: { requesterId, category, vote }
      }));
    }
  }, []);

  const refereeOverride = useCallback((requestId: string, category: string, accepted: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'referee_override',
        payload: { requestId, category, accepted }
      }));
    }
  }, []);
  const hostAdjustScore = useCallback((playerId: string, delta: number) => {
    sendMessage('host_adjust_score', { targetPlayerId: playerId, delta });
  }, [sendMessage]);

  const hostResolveVotes = useCallback(() => { sendMessage('host_resolve_votes', {}); }, [sendMessage]);
  // FIX: Host kick
  const kickPlayer = useCallback((playerId: string) => { sendMessage('kick_player', { playerId }); }, [sendMessage]);
  const activatePowerUp = useCallback((type: PowerUpType, targetId?: string) => {
    sendMessage('activate_powerup', targetId ? { type, targetPlayerId: targetId } : { type });
  }, [sendMessage]);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    clearSession();
    dispatch({ type: 'RESET' });
  }, []);

  // GC1: Fix stale closure — use a ref to always read latest timeLeft
  const timeLeftRef = useRef(state.timeLeft);
  useEffect(() => {
    timeLeftRef.current = state.timeLeft;
  }, [state.timeLeft]);

  // Timer effect — only re-created when phase changes, never on every tick
  useEffect(() => {
    if (state.room?.phase === 'playing') {
      timerRef.current = setInterval(() => {
        const current = timeLeftRef.current;
        if (current > 0) {
          dispatch({ type: 'SET_TIME_LEFT', timeLeft: current - 1 });
        } else {
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [state.room?.phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isIntentionalDisconnectRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentPlayer = state.room?.players.find(p => p.id === state.playerId) || null;
  const currentRound = state.room?.rounds[state.room.currentRound] || null;
  const isHost = currentPlayer?.isHost || false;
  const isReferee = state.room?.refereeId === state.playerId;
  const referee = state.room?.players.find(p => p.id === state.room?.refereeId) || null;

  const sendAppeal = useCallback((targetPlayerId: string, category: string) => {
    sendMessage('player_appeal', { targetPlayerId, category });
  }, [sendMessage]);

  return (
    <GameContext.Provider value={{
      state,
      createRoom,
      joinRoom,
      setReady,
      startGame,
      submitAnswers,
      triggerBusComplete,
      vote,
      setReferee,
      removeReferee,
      refereeDeduct,
      refereeToggleUnique,
      refereeApprove,
      nextRound,
      playAgain,
      disconnect,
      sendReaction,
      reactions,
      currentPlayer,
      currentRound,
      isHost,
      isReferee,
      referee,
      updateSettings,
      requestVote,
      castParallelVote,
      hostResolveVotes,
      kickPlayer,
      activatePowerUp,
      activePowerUpNotification,
      isBanished,
      banishedBy,
      banishOverlay,
      setBanishOverlay,

      sendDraftUpdate,
      refereeToggleValidity,
      refereeOverride,
      hostAdjustScore,
      sendMessage,
      sendAppeal,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
