import React from 'react';

const PlayerList = ({ players = [] }) => {
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">groups</span>
          <h3 className="font-display-lg-mobile text-on-surface">Players in Lobby</h3>
        </div>
        <span className="bg-primary/10 text-primary text-xs font-label-bold px-3 py-1.5 rounded-full">
          {players.length} joined
        </span>
      </div>

      {players.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="text-4xl mb-4 opacity-50">⏳</div>
          <p className="text-on-surface font-semibold mb-1">Waiting for players to join...</p>
          <p className="text-on-surface-variant text-sm">Share the room code to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-full overflow-y-auto pr-2 scrollbar-thin pb-4">
          {players.map((player, index) => (
            <div
              key={player.userId || index}
              className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3 animate-fade-in shadow-sm hover:border-primary/30 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                style={{
                  background: `hsl(${(index * 67) % 360}, 70%, 50%)`,
                }}
              >
                {(player.nickname || player.name || 'P').charAt(0).toUpperCase()}
              </div>
              <span className="text-on-surface text-sm font-semibold truncate">
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
