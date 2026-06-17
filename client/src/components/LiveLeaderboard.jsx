import React, { useState, useEffect, useRef } from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

const LiveLeaderboard = ({ leaderboard = [], currentUserId }) => {
  const [prevScores, setPrevScores] = useState({});
  const [animatingIds, setAnimatingIds] = useState(new Set());

  useEffect(() => {
    // Detect score changes for animation
    const newAnimating = new Set();
    leaderboard.forEach((player) => {
      const prev = prevScores[player.userId];
      if (prev !== undefined && prev !== player.score) {
        newAnimating.add(player.userId);
      }
    });

    if (newAnimating.size > 0) {
      setAnimatingIds(newAnimating);
      const timer = setTimeout(() => setAnimatingIds(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [leaderboard]);

  useEffect(() => {
    const scores = {};
    leaderboard.forEach((p) => { scores[p.userId] = p.score; });
    setPrevScores(scores);
  }, [leaderboard]);

  return (
    <div className="glass-card p-4 w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏆</span>
        <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider">Leaderboard</h3>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-4">No scores yet...</p>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((player, index) => {
            const isCurrentUser = player.userId === currentUserId;
            const isAnimating = animatingIds.has(player.userId);

            return (
              <div
                key={player.userId}
                className={`
                  flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300
                  ${isCurrentUser
                    ? 'bg-brand-500/20 border border-brand-500/30'
                    : 'bg-white/5 hover:bg-white/10'
                  }
                  ${isAnimating ? 'scale-[1.02]' : ''}
                `}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-7 text-center">
                  {index < 3 ? (
                    <span className="text-base">{MEDALS[index]}</span>
                  ) : (
                    <span className="text-white/40 text-xs font-bold">#{index + 1}</span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-brand-300' : 'text-white'}`}>
                    {player.name}
                    {isCurrentUser && <span className="text-xs text-brand-400 ml-1">(you)</span>}
                  </p>
                </div>

                {/* Score */}
                <div
                  className={`flex-shrink-0 font-display font-bold text-sm transition-all duration-300 ${
                    isAnimating ? 'text-emerald-400 animate-score-pop scale-110' : 'text-white'
                  }`}
                >
                  {Math.max(0, Math.round(player.score)).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveLeaderboard;
