import { createContext, useContext, useReducer, useCallback, useEffect, useRef, ReactNode, useState } from 'react';
import type { GameRoom, Player, Round, GamePhase, RoundAnswers, Category, ValidatedAnswer, Reaction, ReactionType, PowerUpType } from '@shared/schema';

interface GameState {
  room: GameRoom | null;
  playerId: string | null;
  ws: WebSocket | null;
  connected: boolean;
  error: string | null;
  timeLeft: number;
  isRush: boolean;
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
  | { type: 'UPDATE_ROUND'; round: Round }
  | { type: 'UPDATE_VOTE_STATE'; payload: any }
  | { type: 'RESET' };

const initialState: GameState = {
  room: null,
  playerId: null,
  ws: null,
  connected: false,
  error: null,
  timeLeft: 45,
  isRush: false,
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
      return { ...state, connected: action.connected };
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
      return {
        ...state,
        room: {
          ...state.room,
          currentVote: action.payload.vote || action.payload.currentVote || state.room.currentVote,
          voteQueue: action.payload.queue || state.room.voteQueue
        }
      };
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
  joinPublicRoom: (playerName: string) => void;
  setReady: () => void;
  startGame: () => void;
  submitAnswers: (answers: RoundAnswers) => void;
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
  castDemocraticVote: (vote: 'yes' | 'no') => void;
  activatePowerUp: (type: PowerUpType, targetId?: string) => void;
  activePowerUpNotification: { type: PowerUpType; playerName: string } | null;
  isBanished: boolean;
  banishedBy: string | null;
  banishOverlay: boolean;
  setBanishOverlay: (show: boolean) => void;
  appealAnswer: (playerId: string, category: string, word: string) => void;
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

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'room_created':
      case 'room_joined':
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_PLAYER_ID', playerId: message.payload.playerId });
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
        setIsBanished(false); // Reset banished state on new round
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
      case 'game_end':
      case 'sync_state':
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_RUSH', isRush: false });
        break;
      case 'vote_session_start':
      case 'vote_update':
      case 'vote_session_result':
        // Update specific voting fields in room
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
        setActivePowerUpNotification({
          type: message.payload.type,
          playerName: message.payload.playerName
        });
        setTimeout(() => setActivePowerUpNotification(null), 3000);
        break;

      case 'wildcard_activated':
        // Player received wildcard answers
        setActivePowerUpNotification({
          type: 'wildcard',
          playerName: message.payload.playerName || 'You'
        });
        // Auto-fill answers from payload if needed
        if (message.payload.answers) {
          // Answers are already auto-submitted by server
        }
        setTimeout(() => setActivePowerUpNotification(null), 4000);
        break;
      case 'player_banished':
        // This player is banished from the round
        setIsBanished(true);
        setBanishedBy(message.payload.banishedBy);
        // Show notification for 5 seconds then hide
        setTimeout(() => {
          setIsBanished(false);
          setBanishedBy(null);
        }, 5000);
        break;
      case 'referee_review_start':
        // Clear all power-up states when entering referee review
        setIsBanished(false);
        setBanishedBy(null);
        dispatch({ type: 'SET_ROOM', room: message.payload.room });
        dispatch({ type: 'SET_RUSH', isRush: false });
        break;
      case 'toast':
        // Show toast notification
        console.log('[Toast]', message.payload.message);
        break;
      case 'appeal_result':
        // Handle appeal result - room state updated via sync_state
        console.log(message.payload.success ? '[Appeal ✅]' : '[Appeal ❌]', message.payload.message);
        break;
    }
  }, [state.playerId]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', connected: true });
      dispatch({ type: 'SET_ERROR', error: null });
    };

    ws.onclose = () => {
      dispatch({ type: 'SET_CONNECTED', connected: false });
    };

    ws.onerror = () => {
      dispatch({ type: 'SET_ERROR', error: 'فشل الاتصال بالسيرفر' });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    wsRef.current = ws;
    dispatch({ type: 'SET_WS', ws });
    return ws;
  }, [handleMessage]);

  const sendMessage = useCallback((type: string, payload: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const createRoom = useCallback((playerName: string) => {
    const ws = connect();
    ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', connected: true });
      ws.send(JSON.stringify({ type: 'create_room', payload: { playerName } }));
    };
  }, [connect]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const ws = connect();
    ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', connected: true });
      ws.send(JSON.stringify({ type: 'join_room', payload: { roomCode: roomCode.toUpperCase(), playerName } }));
    };
  }, [connect]);

  const joinPublicRoom = useCallback((playerName: string) => {
    const ws = connect();
    ws.onopen = () => {
      dispatch({ type: 'SET_CONNECTED', connected: true });
      ws.send(JSON.stringify({ type: 'join_public_room', payload: { playerName } }));
    };
  }, [connect]);

  const setReady = useCallback(() => {
    sendMessage('player_ready', { playerId: state.playerId });
  }, [sendMessage, state.playerId]);

  const startGame = useCallback(() => {
    sendMessage('start_game', {});
  }, [sendMessage]);

  const submitAnswers = useCallback((answers: RoundAnswers) => {
    sendMessage('submit_answers', { answers });
  }, [sendMessage]);

  const triggerBusComplete = useCallback(() => {
    sendMessage('bus_complete', {});
  }, [sendMessage]);

  const vote = useCallback((playerId: string, category: Category, accepted: boolean) => {
    sendMessage('vote', { playerId, category, accepted });
  }, [sendMessage]);

  const setReferee = useCallback((playerId: string) => {
    sendMessage('set_referee', { playerId });
  }, [sendMessage]);

  const removeReferee = useCallback(() => {
    sendMessage('remove_referee', {});
  }, [sendMessage]);

  const refereeDeduct = useCallback((playerId: string, category: Category, reason: string) => {
    sendMessage('referee_deduct', { playerId, category, reason });
  }, [sendMessage]);

  const refereeToggleUnique = useCallback((playerId: string, category: Category) => {
    sendMessage('referee_toggle_unique', { playerId, category });
  }, [sendMessage]);

  const refereeApprove = useCallback(() => {
    sendMessage('referee_approve', {});
  }, [sendMessage]);

  const nextRound = useCallback(() => {
    sendMessage('next_round', {});
  }, [sendMessage]);

  const playAgain = useCallback(() => {
    sendMessage('play_again', {});
  }, [sendMessage]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    dispatch({ type: 'RESET' });
  }, []);

  const sendReaction = useCallback((reactionType: ReactionType) => {
    sendMessage('send_reaction', { reactionType });
  }, [sendMessage]);



  const updateSettings = useCallback((settings: any) => {
    sendMessage('update_settings', settings);
  }, [sendMessage]);

  const requestVote = useCallback((playerId: string, category: string, word: string) => {
    sendMessage('request_vote', { playerId, category, word });
  }, [sendMessage]);

  const castDemocraticVote = useCallback((vote: 'yes' | 'no') => {
    sendMessage('vote_cast', { vote });
  }, [sendMessage]);

  const activatePowerUp = useCallback((type: PowerUpType, targetId?: string) => {
    if (targetId) {
      sendMessage('activate_powerup', { type, targetPlayerId: targetId });
    } else {
      sendMessage('activate_powerup', { type });
    }
  }, [sendMessage]);

  const appealAnswer = useCallback((playerId: string, category: string, word: string) => {
    sendMessage('appeal_answer', { playerId, category, word });
  }, [sendMessage]);

  // Timer effect
  useEffect(() => {
    if (state.room?.phase === 'playing' && state.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'SET_TIME_LEFT', timeLeft: state.timeLeft - 1 });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.room?.phase, state.timeLeft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const currentPlayer = state.room?.players.find(p => p.id === state.playerId) || null;
  const currentRound = state.room?.rounds[state.room.currentRound] || null;
  const isHost = currentPlayer?.isHost || false;
  const isReferee = state.room?.refereeId === state.playerId;
  const referee = state.room?.players.find(p => p.id === state.room?.refereeId) || null;

  return (
    <GameContext.Provider value={{
      state,
      createRoom,
      joinRoom,
      joinPublicRoom,
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
      castDemocraticVote,
      activatePowerUp,
      activePowerUpNotification,
      isBanished,
      banishedBy,
      banishOverlay,
      setBanishOverlay,
      appealAnswer,
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
