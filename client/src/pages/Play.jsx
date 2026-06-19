import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import QuestionCard from '../components/QuestionCard';
import LiveLeaderboard from '../components/LiveLeaderboard';

const PLAY_PHASES = {
  JOIN: 'join',
  LOBBY: 'lobby',
  ACTIVE: 'active',
  RESULT: 'result',
  FINISHED: 'finished',
};

const Play = () => {
  const navigate = useNavigate();
  const { isConnected, on, off, emit } = useSocket();

  const [phase, setPhase] = useState(PLAY_PHASES.JOIN);
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joinError, setJoinError] = useState('');
  const [userId, setUserId] = useState('');

  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(null);
  const [timeUp, setTimeUp] = useState(false);

  const [lastResult, setLastResult] = useState(null); // { correct, pointsEarned, totalScore }
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(null);

  const [serverError, setServerError] = useState('');
  const [tabWarning, setTabWarning] = useState('');
  const [hostDisconnected, setHostDisconnected] = useState(false);

  // Tab switch detection
  useEffect(() => {
    if (phase === PLAY_PHASES.ACTIVE && userId && roomCode) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          emit('TAB_SWITCH_DETECTED', { userId, roomCode });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [phase, userId, roomCode, emit]);

  // Socket event listeners
  useEffect(() => {
    const handleRoomJoined = ({ players: p, userId: uid }) => {
      setPlayers(p || []);
      if (uid) setUserId(uid);
      setPhase(PLAY_PHASES.LOBBY);
    };

    const handlePlayerJoined = ({ players: p }) => {
      setPlayers(p || []);
    };

    const handleGameStarted = () => {
      setPhase(PLAY_PHASES.ACTIVE);
    };

    const handleNewQuestion = ({ question, questionIndex: qi, totalQuestions: tq }) => {
      setCurrentQuestion(question);
      setQuestionIndex(qi);
      setTotalQuestions(tq);
      setAnswered(false);
      setSelectedOption(null);
      setCorrectOptionIndex(null);
      setTimeUp(false);
      setLastResult(null);
      setPhase(PLAY_PHASES.ACTIVE);
    };

    const handleAnswerResult = ({ correct, pointsEarned, totalScore, correctOptionIndex: coi }) => {
      setLastResult({ correct, pointsEarned, totalScore });
      setMyScore(totalScore);
      setCorrectOptionIndex(coi);
    };

    const handleTimeUp = ({ correctOptionIndex: coi }) => {
      setTimeUp(true);
      setCorrectOptionIndex(coi);
    };

    const handleLeaderboardUpdate = ({ leaderboard: lb }) => {
      setLeaderboard(lb || []);
      // Find my rank
      const me = lb?.find((p) => p.userId === userId);
      if (me) setMyRank(me.rank);
    };

    const handleGameOver = ({ finalLeaderboard }) => {
      setPhase(PLAY_PHASES.FINISHED);
      navigate('/leaderboard', { state: { finalLeaderboard, isHost: false, myUserId: userId } });
    };

    const handleError = ({ message }) => {
      if (phase === PLAY_PHASES.JOIN) {
        setJoinError(message);
      } else {
        setServerError(message);
        setTimeout(() => setServerError(''), 5000);
      }
    };

    const handleTabSwitchWarning = ({ message }) => {
      setTabWarning(message);
      setTimeout(() => setTabWarning(''), 5000);
    };

    const handleTabSwitchPenalty = ({ message, totalScore }) => {
      setTabWarning(message);
      if (totalScore !== undefined) {
        setMyScore(totalScore);
      }
      setTimeout(() => setTabWarning(''), 5000);
    };

    const handleHostDisconnected = () => {
      setHostDisconnected(true);
    };

    on('ROOM_JOINED', handleRoomJoined);
    on('PLAYER_JOINED', handlePlayerJoined);
    on('GAME_STARTED', handleGameStarted);
    on('NEW_QUESTION', handleNewQuestion);
    on('ANSWER_RESULT', handleAnswerResult);
    on('TIME_UP', handleTimeUp);
    on('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
    on('GAME_OVER', handleGameOver);
    on('ERROR', handleError);
    on('TAB_SWITCH_WARNING', handleTabSwitchWarning);
    on('TAB_SWITCH_PENALTY', handleTabSwitchPenalty);
    on('HOST_DISCONNECTED', handleHostDisconnected);

    return () => {
      off('ROOM_JOINED', handleRoomJoined);
      off('PLAYER_JOINED', handlePlayerJoined);
      off('GAME_STARTED', handleGameStarted);
      off('NEW_QUESTION', handleNewQuestion);
      off('ANSWER_RESULT', handleAnswerResult);
      off('TIME_UP', handleTimeUp);
      off('LEADERBOARD_UPDATE', handleLeaderboardUpdate);
      off('GAME_OVER', handleGameOver);
      off('ERROR', handleError);
      off('TAB_SWITCH_WARNING', handleTabSwitchWarning);
      off('TAB_SWITCH_PENALTY', handleTabSwitchPenalty);
      off('HOST_DISCONNECTED', handleHostDisconnected);
    };
  }, [on, off, navigate, phase, userId]);

  const handleJoin = (e) => {
    e.preventDefault();
    setJoinError('');

    const code = roomCode.trim().toUpperCase();
    const name = nickname.trim();

    if (!code || code.length !== 6) {
      setJoinError('Please enter a valid 6-character room code.');
      return;
    }

    if (!name || name.length < 2) {
      setJoinError('Nickname must be at least 2 characters.');
      return;
    }

    if (!isConnected) {
      setJoinError('Not connected to server. Please wait and try again.');
      return;
    }

    emit('PLAYER_JOIN_ROOM', { roomCode: code, nickname: name });
  };

  const handleAnswer = (optionIndex, timeLeft) => {
    if (answered || timeUp) return;
    setAnswered(true);
    setSelectedOption(optionIndex);
    emit('SUBMIT_ANSWER', { roomCode, userId, selectedOption: optionIndex, timeLeft });
  };

  // JOIN Phase
  if (phase === PLAY_PHASES.JOIN) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-slide-up">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎮</div>
              <h1 className="font-display font-black text-3xl text-white mb-2">Join a Quiz</h1>
              <p className="text-white/50 text-sm">Enter the room code from your host</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              {joinError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm text-center">{joinError}</p>
                </div>
              )}

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1.5">Room Code</label>
                <input
                  id="room-code-input"
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase().slice(0, 6));
                    if (joinError) setJoinError('');
                  }}
                  placeholder="e.g. AB12CD"
                  className="input-field text-center text-2xl font-display font-bold tracking-[0.3em] uppercase"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm font-medium mb-1.5">Your Nickname</label>
                <input
                  id="nickname-input"
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value.slice(0, 20));
                    if (joinError) setJoinError('');
                  }}
                  placeholder="e.g. QuizMaster"
                  className="input-field"
                  maxLength={20}
                  required
                  autoComplete="off"
                />
              </div>

              <button
                id="join-game-btn"
                type="submit"
                disabled={!isConnected}
                className="btn-primary w-full py-4 text-base font-display font-bold flex items-center justify-center gap-2 mt-2"
              >
                {!isConnected ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  '🚀 Join Game'
                )}
              </button>
            </form>
          </div>

          <div className={`mt-4 flex items-center justify-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isConnected ? 'Connected to server' : 'Connecting to server...'}
          </div>
        </div>
      </div>
    );
  }

  // LOBBY Phase
  if (phase === PLAY_PHASES.LOBBY) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="relative w-full max-w-md text-center animate-slide-up">
          <div className="glass-card p-10">
            {/* Pulsing waiting indicator */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-brand-500/30 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-4xl">
                ⏳
              </div>
            </div>

            <h2 className="font-display font-black text-3xl text-white mb-2">You're In!</h2>
            <p className="text-brand-300 font-bold text-xl mb-1">{nickname}</p>
            <p className="text-white/50 mb-6">Room: <span className="text-white font-bold tracking-wider">{roomCode}</span></p>

            <div className="p-4 bg-white/5 rounded-xl mb-6">
              <p className="text-white/60 text-sm animate-pulse">Waiting for the host to start the game...</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
              <span>👥</span>
              <span>{players.length} player{players.length !== 1 ? 's' : ''} in lobby</span>
            </div>

            {hostDisconnected && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-sm">⚠️ Host disconnected. The game may not start.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE Phase
  if (phase === PLAY_PHASES.ACTIVE) {
    return (
      <div className="min-h-screen pt-20 px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Notifications */}
          {tabWarning && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3 bg-amber-500/90 text-amber-950 rounded-xl font-semibold text-sm shadow-xl animate-slide-down">
              ⚠️ {tabWarning}
            </div>
          )}

          {serverError && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 p-3 bg-red-500/90 text-white rounded-xl font-semibold text-sm shadow-xl">
              ❌ {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Player stats bar */}
              <div className="glass-card px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                    {nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-semibold text-sm">{nickname}</span>
                </div>
                <div className="flex items-center gap-4">
                  {myRank && (
                    <div className="text-center">
                      <p className="text-white/40 text-xs">Rank</p>
                      <p className="text-white font-bold">#{myRank}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-white/40 text-xs">Score</p>
                    <p className="text-brand-300 font-bold font-display">{Math.round(myScore).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Answer Result Banner */}
              {lastResult && (
                <div
                  className={`p-4 rounded-xl text-center animate-bounce-in font-display font-bold ${
                    lastResult.correct
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/20 border border-red-500/30 text-red-300'
                  }`}
                >
                  {lastResult.correct ? (
                    <span>✅ Correct! +{lastResult.pointsEarned} pts</span>
                  ) : (
                    <span>❌ Wrong answer</span>
                  )}
                </div>
              )}

              {/* Question */}
              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  questionIndex={questionIndex}
                  totalQuestions={totalQuestions}
                  timeLimit={20}
                  onAnswer={handleAnswer}
                  answered={answered}
                  selectedOption={selectedOption}
                  correctOptionIndex={correctOptionIndex}
                  timeUp={timeUp}
                />
              )}

              {/* Waiting banner after answer */}
              {answered && !timeUp && (
                <div className="glass-card p-5 text-center">
                  <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-white/50 text-sm">Waiting for everyone else to answer...</p>
                </div>
              )}
            </div>

            {/* Sidebar leaderboard */}
            <div className="lg:col-span-1">
              <LiveLeaderboard leaderboard={leaderboard} currentUserId={userId} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Play;
