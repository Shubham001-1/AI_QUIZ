import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import useSocket from '../hooks/useSocket';
import PlayerList from '../components/PlayerList';
import LiveLeaderboard from '../components/LiveLeaderboard';
import QuestionCard from '../components/QuestionCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GAME_PHASES = {
  SETUP: 'setup',
  GENERATING: 'generating',
  LOBBY: 'lobby',
  ACTIVE: 'active',
  BETWEEN: 'between',
  FINISHED: 'finished',
};

const Host = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { isConnected, on, off, emit, removeAllListeners } = useSocket();

  const [phase, setPhase] = useState(GAME_PHASES.SETUP);
  const [topic, setTopic] = useState('');
  const [topicError, setTopicError] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [quizId, setQuizId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');
  const [startError, setStartError] = useState('');
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);

  // Register socket listeners
  useEffect(() => {
    const handleRoomJoined = ({ roomCode: rc, players: p }) => {
      setPlayers(p || []);
    };

    const handlePlayerJoined = ({ players: p }) => {
      setPlayers(p || []);
    };

    const handleGameStarted = () => {
      setPhase(GAME_PHASES.ACTIVE);
    };

    const handleNewQuestion = ({ question, questionIndex: qi, totalQuestions: tq }) => {
      setCurrentQuestion(question);
      setQuestionIndex(qi);
      setTotalQuestions(tq);
      setTimeUp(false);
      setCorrectOptionIndex(null);
      setPhase(GAME_PHASES.ACTIVE);
    };

    const handleTimeUp = ({ correctOptionIndex: coi }) => {
      setTimeUp(true);
      setCorrectOptionIndex(coi);
      setPhase(GAME_PHASES.BETWEEN);
    };

    const handleLeaderboardUpdate = ({ leaderboard: lb }) => {
      setLeaderboard(lb || []);
    };

    const handleGameOver = ({ finalLeaderboard: fl }) => {
      setFinalLeaderboard(fl || []);
      setPhase(GAME_PHASES.FINISHED);
      navigate('/leaderboard', { state: { finalLeaderboard: fl, isHost: true } });
    };

    const handleError = ({ message }) => {
      setStartError(message);
      setTimeout(() => setStartError(''), 5000);
    };

    on('ROOM_JOINED', handleRoomJoined);
    on('PLAYER_JOINED', handlePlayerJoined);
    on('GAME_STARTED', handleGameStarted);
    on('NEW_QUESTION', handleNewQuestion);
    on('TIME_UP', handleTimeUp);
    on('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
    on('GAME_OVER', handleGameOver);
    on('ERROR', handleError);

    return () => {
      off('ROOM_JOINED', handleRoomJoined);
      off('PLAYER_JOINED', handlePlayerJoined);
      off('GAME_STARTED', handleGameStarted);
      off('NEW_QUESTION', handleNewQuestion);
      off('TIME_UP', handleTimeUp);
      off('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
      off('GAME_OVER', handleGameOver);
      off('ERROR', handleError);
    };
  }, [on, off, navigate]);

  // Join room when roomCode is set — guarded to only fire once per roomCode
  const joinedRoomRef = React.useRef(null);
  useEffect(() => {
    if (roomCode && isConnected && user && joinedRoomRef.current !== roomCode) {
      joinedRoomRef.current = roomCode;
      emit('HOST_JOIN_ROOM', { roomCode, userId: user.id, userName: user.name });
    }
  }, [roomCode, isConnected, user, emit]);

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setTopicError('Please enter a topic.');
      return;
    }
    setTopicError('');
    setError('');
    setPhase(GAME_PHASES.GENERATING);

    try {
      const { data } = await axios.post(
        `${API_URL}/api/quiz/generate`,
        { topic: topic.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setRoomCode(data.roomCode);
        setQuizId(data.quizId);
        setQuestions(data.questions);
        setPhase(GAME_PHASES.LOBBY);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz. Please try again.');
      setPhase(GAME_PHASES.SETUP);
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleStartGame = () => {
    if (players.length === 0) {
      setStartError('You need at least one player to start!');
      setTimeout(() => setStartError(''), 3000);
      return;
    }
    emit('START_GAME', { roomCode });
  };

  const handleNextQuestion = () => {
    emit('NEXT_QUESTION', { roomCode });
    setTimeUp(false);
    setCorrectOptionIndex(null);
  };

  const handleEndGame = () => {
    emit('END_GAME', { roomCode });
  };

  const handleReset = () => {
    setPhase(GAME_PHASES.SETUP);
    setTopic('');
    setRoomCode('');
    setQuizId('');
    setQuestions([]);
    setPlayers([]);
    setLeaderboard([]);
    setCurrentQuestion(null);
    setQuestionIndex(-1);
    setError('');
    removeAllListeners();
  };

  // SETUP Phase
  if (phase === GAME_PHASES.SETUP || phase === GAME_PHASES.GENERATING) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-lg animate-slide-up">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">{phase === GAME_PHASES.GENERATING ? '🤖' : '🎯'}</div>
              <h1 className="font-display font-black text-3xl text-white mb-2">
                {phase === GAME_PHASES.GENERATING ? 'AI is working...' : 'Create Your Quiz'}
              </h1>
              <p className="text-white/50 text-sm">
                {phase === GAME_PHASES.GENERATING
                  ? 'Gemini is generating 10 questions. This takes a few seconds.'
                  : 'Enter a topic and let AI generate 10 questions for your game.'}
              </p>
            </div>

            {phase === GAME_PHASES.GENERATING ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto mb-4" style={{ width: 56, height: 56 }} />
                <p className="text-white/50 text-sm animate-pulse">Generating questions about "{topic}"...</p>
              </div>
            ) : (
              <form onSubmit={handleGenerateQuiz} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-white/60 text-sm font-medium mb-1.5">Quiz Topic</label>
                  <input
                    id="quiz-topic-input"
                    type="text"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (topicError) setTopicError('');
                    }}
                    placeholder="e.g. Python basics, World War II, Marvel Movies..."
                    className="input-field text-lg py-4"
                    required
                    autoFocus
                    maxLength={200}
                  />
                  {topicError && <p className="text-red-400 text-xs mt-1">{topicError}</p>}
                  <p className="text-white/30 text-xs mt-1">{topic.length}/200 characters</p>
                </div>

                <button
                  id="generate-quiz-btn"
                  type="submit"
                  className="btn-primary w-full py-4 text-base font-display font-bold flex items-center justify-center gap-2"
                >
                  🤖 Generate Quiz with AI
                </button>
              </form>
            )}
          </div>

          {/* Connection status */}
          <div className={`mt-4 flex items-center justify-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
            {isConnected ? 'Connected to server' : 'Connecting...'}
          </div>
        </div>
      </div>
    );
  }

  // LOBBY Phase
  if (phase === GAME_PHASES.LOBBY) {
    return (
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-slide-down">
            <h1 className="font-display font-black text-4xl text-white mb-2">🎮 Game Lobby</h1>
            <p className="text-white/50">Share the code — start when everyone's in!</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Room Code + Controls */}
            <div className="space-y-5">
              {/* Room Code Card */}
              <div className="glass-card p-6 text-center">
                <p className="text-white/50 text-sm font-medium uppercase tracking-widest mb-3">Room Code</p>
                <div className="font-display font-black text-6xl sm:text-7xl tracking-[0.2em] text-white mb-4 animate-pulse-glow">
                  {roomCode}
                </div>
                <button
                  id="copy-room-code-btn"
                  onClick={handleCopyRoomCode}
                  className={`btn-secondary text-sm py-2.5 px-6 flex items-center gap-2 mx-auto ${copySuccess ? 'border-emerald-500/50 text-emerald-400' : ''}`}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy Code'}
                </button>
                <p className="text-white/30 text-xs mt-3">Players join at quizai.app/play</p>
              </div>

              {/* Quiz Info */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="text-white font-semibold">Topic: {topic}</p>
                    <p className="text-white/50 text-sm">{questions.length} questions · 20 seconds each</p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              {startError && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-sm text-center">{startError}</p>
                </div>
              )}

              <button
                id="start-game-btn"
                onClick={handleStartGame}
                disabled={players.length === 0}
                className="btn-success w-full py-4 text-base font-display font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🚀 Start Game ({players.length} player{players.length !== 1 ? 's' : ''})
              </button>

              <button
                onClick={handleReset}
                className="btn-secondary w-full py-3 text-sm"
              >
                ← Create New Quiz
              </button>
            </div>

            {/* Right: Player List */}
            <PlayerList players={players} />
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE / BETWEEN Phase
  if (phase === GAME_PHASES.ACTIVE || phase === GAME_PHASES.BETWEEN) {
    const isLastQuestion = questionIndex >= totalQuestions - 1;

    return (
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main question area */}
            <div className="lg:col-span-3 space-y-5">
              {/* Host controls bar */}
              <div className="glass-card px-5 py-3 flex items-center justify-between">
                <div className="text-white/60 text-sm">
                  Hosting: <span className="text-white font-semibold">{topic}</span>
                  {' · '}Room <span className="text-brand-400 font-bold">{roomCode}</span>
                </div>
                <button
                  onClick={handleEndGame}
                  className="btn-danger text-xs py-2 px-4"
                >
                  End Game
                </button>
              </div>

              {/* Question Card (read-only for host) */}
              {currentQuestion && (
                <div className="relative">
                  <QuestionCard
                    question={currentQuestion}
                    questionIndex={questionIndex}
                    totalQuestions={totalQuestions}
                    timeLimit={20}
                    onAnswer={() => {}} // host doesn't answer
                    answered={false}
                    selectedOption={null}
                    correctOptionIndex={timeUp ? correctOptionIndex : null}
                    timeUp={timeUp}
                  />
                  {/* Host overlay */}
                  <div className="absolute inset-0 rounded-xl cursor-not-allowed" title="You're the host — you don't answer" />
                </div>
              )}

              {/* Between-question controls */}
              {(phase === GAME_PHASES.BETWEEN || timeUp) && (
                <div className="glass-card p-5 text-center animate-slide-up">
                  <p className="text-white/60 text-sm mb-4">
                    {isLastQuestion ? "That's the last question!" : 'Ready for the next question?'}
                  </p>
                  {isLastQuestion ? (
                    <button
                      id="end-game-btn"
                      onClick={handleEndGame}
                      className="btn-primary py-3 px-8 font-display font-bold flex items-center gap-2 mx-auto"
                    >
                      🏆 Show Final Results
                    </button>
                  ) : (
                    <button
                      id="next-question-btn"
                      onClick={handleNextQuestion}
                      className="btn-primary py-3 px-8 font-display font-bold flex items-center gap-2 mx-auto"
                    >
                      Next Question →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar: Leaderboard */}
            <div className="lg:col-span-1">
              <LiveLeaderboard leaderboard={leaderboard} currentUserId={user?.id} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Host;
