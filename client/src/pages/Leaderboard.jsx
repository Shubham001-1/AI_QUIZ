import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = [
  'from-yellow-500/30 to-yellow-600/10 border-yellow-500/30',
  'from-slate-400/30 to-slate-500/10 border-slate-400/30',
  'from-amber-700/30 to-amber-800/10 border-amber-700/30',
];

// Confetti particle component
const Confetti = () => {
  const particles = useRef(
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e'][Math.floor(Math.random() * 6)],
      size: `${6 + Math.random() * 8}px`,
      rotation: `${Math.random() * 360}deg`,
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          <div
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              transform: `rotate(${p.rotation})`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

const Leaderboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showConfetti, setShowConfetti] = useState(true);
  const [animateEntries, setAnimateEntries] = useState(false);

  const { finalLeaderboard = [], isHost = false, myUserId = null } = location.state || {};

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    // Stagger entry animations
    const animTimer = setTimeout(() => setAnimateEntries(true), 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(animTimer);
    };
  }, []);

  // If navigated directly without state, show empty state
  if (!finalLeaderboard || finalLeaderboard.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="text-center glass-card p-10 max-w-md animate-slide-up">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-display font-black text-3xl text-white mb-4">No Game Data</h1>
          <p className="text-white/50 mb-6">It looks like you navigated here directly. Join or host a game to see the leaderboard!</p>
          <Link to="/" className="btn-primary inline-block px-8 py-3 font-display font-bold">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const topThree = finalLeaderboard.slice(0, 3);
  const rest = finalLeaderboard.slice(3);
  const winner = topThree[0];

  return (
    <div className="min-h-screen pt-20 px-4 pb-16 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
      </div>

      {/* Confetti */}
      {showConfetti && <Confetti />}

      <div className="relative z-20 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-down">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-display font-black text-5xl sm:text-6xl text-white mb-3">
            Game <span className="gradient-text">Over!</span>
          </h1>
          {winner && (
            <p className="text-white/60 text-lg">
              <span className="text-yellow-400 font-bold">{winner.name}</span> takes the crown! 👑
            </p>
          )}
        </div>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="mb-10">
            <div className="flex items-end justify-center gap-4 mb-6">
              {/* Reorder: 2nd, 1st, 3rd for podium effect */}
              {[topThree[1], topThree[0], topThree[2]].map((player, displayIndex) => {
                if (!player) return <div key={displayIndex} className="w-32" />;
                const realIndex = displayIndex === 0 ? 1 : displayIndex === 1 ? 0 : 2;
                const heights = ['h-28', 'h-40', 'h-20'];
                const isMe = player.userId === myUserId;

                return (
                  <div
                    key={player.userId}
                    className={`flex-1 max-w-[160px] text-center animate-bounce-in`}
                    style={{ animationDelay: `${displayIndex * 0.15}s` }}
                  >
                    {/* Player card */}
                    <div className={`glass-card bg-gradient-to-b ${MEDAL_COLORS[realIndex]} p-4 mb-2 ${isMe ? 'ring-2 ring-brand-400' : ''}`}>
                      <div className="text-3xl mb-1">{MEDALS[realIndex]}</div>
                      <div
                        className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                        style={{ background: `hsl(${realIndex * 120 + 60}, 70%, 50%)` }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <p className={`font-display font-bold text-sm truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
                        {player.name}
                        {isMe && ' (you)'}
                      </p>
                      <p className="font-display font-black text-lg text-white mt-1">
                        {Math.round(player.score).toLocaleString()}
                      </p>
                      <p className="text-white/40 text-xs">pts</p>
                    </div>

                    {/* Podium block */}
                    <div
                      className={`${heights[realIndex]} rounded-t-lg w-full ${
                        realIndex === 0
                          ? 'bg-gradient-to-t from-yellow-600/40 to-yellow-500/20 border-t-2 border-yellow-500/50'
                          : realIndex === 1
                          ? 'bg-gradient-to-t from-slate-600/40 to-slate-500/20 border-t-2 border-slate-400/50'
                          : 'bg-gradient-to-t from-amber-800/40 to-amber-700/20 border-t-2 border-amber-600/50'
                      } flex items-end justify-center pb-2`}
                    >
                      <span className="text-white/50 font-bold text-2xl font-display">#{realIndex + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Rankings Table */}
        {finalLeaderboard.length > 0 && (
          <div className="glass-card overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-display font-bold text-white text-lg">Full Rankings</h2>
            </div>
            <div className="divide-y divide-white/5">
              {finalLeaderboard.map((player, index) => {
                const isMe = player.userId === myUserId;
                return (
                  <div
                    key={player.userId}
                    className={`
                      flex items-center gap-4 px-6 py-4 transition-all duration-300
                      ${isMe ? 'bg-brand-500/10' : 'hover:bg-white/5'}
                      ${animateEntries ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
                    `}
                    style={{ transitionDelay: `${index * 0.05}s` }}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center flex-shrink-0">
                      {index < 3 ? (
                        <span className="text-xl">{MEDALS[index]}</span>
                      ) : (
                        <span className="text-white/40 font-bold font-display">#{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: `hsl(${index * 47 + 30}, 65%, 50%)` }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isMe ? 'text-brand-300' : 'text-white'}`}>
                        {player.name}
                        {isMe && <span className="text-xs text-brand-400 ml-2">(you)</span>}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-display font-black text-lg text-white">
                        {Math.round(player.score).toLocaleString()}
                      </p>
                      <p className="text-white/30 text-xs">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isHost && (
            <Link
              to="/host"
              id="play-again-btn"
              className="btn-primary py-4 px-8 font-display font-bold text-base text-center flex items-center justify-center gap-2"
            >
              🎯 Host Another Quiz
            </Link>
          )}
          <Link
            to="/play"
            id="join-another-btn"
            className="btn-secondary py-4 px-8 font-display font-bold text-base text-center"
          >
            🎮 Join Another Game
          </Link>
          <Link
            to="/"
            className="btn-secondary py-4 px-8 font-display font-bold text-base text-center"
          >
            🏠 Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
