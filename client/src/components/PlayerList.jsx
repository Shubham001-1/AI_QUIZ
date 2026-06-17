import React from 'react';

const PlayerList = ({ players = [] }) => {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <h3 className="font-display font-semibold text-white">Players in Lobby</h3>
        </div>
        <span className="bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-bold px-2.5 py-1 rounded-full">
          {players.length} joined
        </span>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-white/40 text-sm">Waiting for players to join...</p>
          <p className="text-white/30 text-xs mt-1">Share the room code to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
          {players.map((player, index) => (
            <div
              key={player.userId || index}
              className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5 animate-fade-in"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{
                  background: `hsl(${(index * 67) % 360}, 70%, 50%)`,
                }}
              >
                {(player.nickname || player.name || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-white/80 text-xs font-medium truncate">
                {player.nickname || player.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerList;
