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
    <div className="bg-surface-container-lowest border border-border-subtle shadow-sm rounded-2xl p-5 w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle flex-shrink-0">
        <span className="text-xl">🏆</span>
        <h3 className="font-display font-bold text-on-surface text-sm uppercase tracking-wider">Leaderboard</h3>
      </div>

      {leaderboard.length === 0 ? (
        <p className="text-on-surface-variant/70 text-sm text-center py-4 flex-1">No scores yet...</p>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
          {leaderboard.slice(0, 10).map((player, index) => {
            const isCurrentUser = player.userId === currentUserId;
            const isAnimating = animatingIds.has(player.userId);

            return (
              <div
                key={player.userId}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all duration-300 shadow-sm
                  ${isCurrentUser
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-surface border border-border-subtle hover:bg-surface-container-low'
                  }
                  ${isAnimating ? 'scale-[1.02]' : ''}
                `}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center flex items-center justify-center">
                  {index < 3 ? (
                    <span className="text-xl">{MEDALS[index]}</span>
                  ) : (
                    <span className="text-on-surface-variant text-xs font-bold bg-surface-container px-2 py-1 rounded-full">#{index + 1}</span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-primary' : 'text-on-surface'}`}>
                    {player.name}
                    {isCurrentUser && <span className="text-xs text-primary/70 ml-1">(you)</span>}
                  </p>
                </div>

                {/* Score */}
                <div
                  className={`flex-shrink-0 font-display font-bold text-sm transition-all duration-300 ${
                    isAnimating ? 'text-primary animate-score-pop scale-110' : 'text-on-surface'
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
