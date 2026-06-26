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

  const [playMenuOpen, setPlayMenuOpen] = useState(false);
  // Reusable card class for light theme
  const cardClass = "bg-surface-container-lowest border border-border-subtle shadow-sm rounded-2xl";

  // JOIN Phase
  if (phase === PLAY_PHASES.JOIN) {
    return (
      <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-border-subtle shadow-sm">
          <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-6">
              <a href="/" className="font-headline-lg text-headline-lg font-bold text-primary">QuizMaster</a>
              <div className="hidden lg:flex items-center gap-6">
                <a href="/" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Home</a>
                <a href="/builder" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Create Quiz</a>
                <a href="/host" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Host Quiz</a>
                <div className="relative">
                  <a href="/play" className="font-body-md text-body-md text-primary transition-colors">Join Quiz</a>
                  <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-primary"></div>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <button onClick={() => navigate('/login')} className="font-label-bold text-on-surface-variant hover:text-primary transition-colors">Sign In</button>
              <button onClick={() => navigate('/login')} className="bg-primary-container text-white px-6 py-2 rounded-lg font-label-bold hover:opacity-90 transition-opacity shadow-sm">Join</button>
            </div>
            {/* Mobile Hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
              onClick={() => setPlayMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined">{playMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </nav>
          {playMenuOpen && (
            <div className="lg:hidden border-t border-border-subtle bg-surface-container-lowest px-4 pb-4 space-y-1 shadow-md">
              <a href="/" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">Home</a>
              <a href="/builder" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">Create Quiz</a>
              <a href="/host" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">Host Quiz</a>
              <a href="/play" className="block px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10">Join Quiz</a>
              <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
                <button onClick={() => navigate('/login')} className="block text-left px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Sign In</button>
                <button onClick={() => navigate('/login')} className="block text-left px-4 py-2 rounded-lg text-sm font-semibold bg-primary-container text-white text-center hover:opacity-90 transition-opacity">Join</button>
              </div>
            </div>
          )}
        </header>

        <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
          <div className={`w-full max-w-lg ${cardClass} p-8 md:p-12 animate-slide-up`}>
            {/* Card Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4 w-16 h-16 bg-primary/10 rounded-2xl">
                <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-on-surface mb-2 font-display">Join a Quiz</h1>
              <p className="text-on-surface-variant">Enter the room code from your host to begin</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-6">
              {joinError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-error text-sm text-center font-medium">{joinError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1" htmlFor="room-code">Room Code</label>
                <input
                  id="room-code"
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase().slice(0, 6));
                    if (joinError) setJoinError('');
                  }}
                  placeholder="E.G. AB12CD"
                  className="w-full bg-surface border border-border-subtle rounded-xl py-4 px-6 text-2xl font-bold text-center tracking-[0.4em] placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1" htmlFor="nickname">Your Nickname</label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value.slice(0, 20));
                    if (joinError) setJoinError('');
                  }}
                  placeholder="e.g. QuizMaster"
                  className="w-full bg-surface border border-border-subtle rounded-xl py-4 px-6 text-lg placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  maxLength={20}
                  required
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                disabled={!isConnected}
                className="w-full bg-primary-container hover:bg-[#19a463] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-md shadow-primary-container/30 transition-all transform active:scale-[0.98] group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {!isConnected ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <span className="text-lg">Join Game</span>
                    <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 flex items-center gap-2 text-sm text-on-surface-variant font-medium">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary-container pulse-dot' : 'bg-error'}`}></span>
            <span>{isConnected ? 'Connected to server' : 'Connecting to server...'}</span>
          </div>
        </main>
      </div>
    );
  }

  // LOBBY Phase
  if (phase === PLAY_PHASES.LOBBY) {
    return (
      <div className="bg-surface font-body-md text-on-surface min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="relative w-full max-w-md text-center animate-slide-up">
          <div className={`${cardClass} p-10`}>
            {/* Pulsing waiting indicator */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-4xl border border-primary/20">
                ⏳
              </div>
            </div>

            <h2 className="font-display font-black text-3xl text-on-surface mb-2">You're In!</h2>
            <p className="text-primary font-bold text-xl mb-1">{nickname}</p>
            <p className="text-on-surface-variant mb-6">Room: <span className="text-on-surface font-bold tracking-wider">{roomCode}</span></p>

            <div className="p-4 bg-surface rounded-xl mb-6 border border-border-subtle">
              <p className="text-on-surface-variant text-sm animate-pulse">Waiting for the host to start the game...</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-on-surface-variant text-sm font-medium">
              <span className="material-symbols-outlined">group</span>
              <span>{players.length} player{players.length !== 1 ? 's' : ''} in lobby</span>
            </div>

            {hostDisconnected && (
              <div className="mt-6 p-3 bg-error/10 border border-error/20 rounded-xl">
                <p className="text-error text-sm font-medium">⚠️ Host disconnected. The game may not start.</p>
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
      <div className="bg-surface font-body-md text-on-surface min-h-screen pt-16 sm:pt-20 px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Notifications */}
          {tabWarning && (
            <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 p-3 bg-error/90 text-white rounded-xl font-semibold text-sm shadow-xl animate-slide-down max-w-xs sm:max-w-sm text-center">
              ⚠️ {tabWarning}
            </div>
          )}

          {serverError && (
            <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 p-3 bg-error/90 text-white rounded-xl font-semibold text-sm shadow-xl max-w-xs sm:max-w-sm text-center">
              ❌ {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Main content */}
            <div className="lg:col-span-3 space-y-4">
              {/* Player stats bar */}
              <div className={`${cardClass} px-5 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-on-surface font-semibold text-sm">{nickname}</span>
                </div>
                <div className="flex items-center gap-4">
                  {myRank && (
                    <div className="text-center">
                      <p className="text-on-surface-variant text-xs">Rank</p>
                      <p className="text-on-surface font-bold">#{myRank}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-on-surface-variant text-xs">Score</p>
                    <p className="text-primary font-bold font-display">{Math.round(myScore).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Answer Result Banner */}
              {lastResult && (
                <div
                  className={`p-4 rounded-xl text-center animate-bounce-in font-display font-bold ${
                    lastResult.correct
                      ? 'bg-primary-container/20 border border-primary-container/30 text-primary'
                      : 'bg-error/10 border border-error/20 text-error'
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
                <div className={`${cardClass} p-5 text-center`}>
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-on-surface-variant text-sm font-medium">Waiting for everyone else to answer...</p>
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
