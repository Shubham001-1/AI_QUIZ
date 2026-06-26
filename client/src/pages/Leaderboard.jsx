import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';

// Confetti particle component
const Confetti = () => {
  const particles = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: ['#006948', '#85f8c4', '#c3ecd7', '#002114', '#00855d'][Math.floor(Math.random() * 5)],
    }))
  ).current;

  return (
    <div className="absolute inset-0 pointer-events-none" id="confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
};

const Leaderboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showConfetti, setShowConfetti] = useState(true);

  const { finalLeaderboard = [], isHost = false, myUserId = null } = location.state || {};

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!finalLeaderboard || finalLeaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4 pt-16">
        <div className="text-center bg-surface-container-lowest border border-border-subtle p-10 max-w-md animate-slide-up rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-display text-3xl font-bold text-on-surface mb-4">No Game Data</h1>
          <p className="text-on-surface-variant mb-6">It looks like you navigated here directly. Join or host a game to see the leaderboard!</p>
          <Link to="/" className="bg-primary-container text-white inline-block px-8 py-3 rounded-xl font-bold hover:bg-[#19a463] shadow-md transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const winner = finalLeaderboard[0] || { name: 'Player', score: 0 };
  const myPlayerIndex = finalLeaderboard.findIndex(p => p.userId === myUserId);
  const myPlayer = myPlayerIndex !== -1 ? finalLeaderboard[myPlayerIndex] : null;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #006948;
          border-radius: 10px;
        }
        .card-shadow {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .card-hover-shadow:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          border-color: #006948;
        }
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #006948;
          top: -20px;
          opacity: 0;
          animation: confetti-fall 3s ease-in-out infinite;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="bg-surface text-on-surface min-h-screen flex flex-col">
        {/* Main Game Over Content */}
        <main className="flex flex-col lg:flex-row overflow-auto lg:overflow-hidden max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-4 sm:py-6 gap-4 sm:gap-6 flex-grow pb-32 lg:pb-[88px]">
          {/* Left Side: Celebration Area */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
            
            {/* Confetti container */}
            {showConfetti && <Confetti />}

            <div className="z-10 text-center animate-bounce duration-[2000ms] mb-6">
              <div className="inline-flex items-center justify-center p-6 bg-secondary-container rounded-full mb-6 shadow-lg border border-primary/10">
                <span className="material-symbols-outlined text-[64px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>emoji_events</span>
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface mb-3">Game <span className="text-primary">Over!</span></h1>
              <p className="font-headline-md text-headline-md text-primary opacity-90"><span className="font-bold">{winner.name}</span> takes the crown! 👑</p>
            </div>
            
            {/* Winner Card */}
            <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-xl p-10 card-shadow transition-all duration-300 transform hover:scale-[1.02] border-t-4 border-t-primary">
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center border-4 border-white shadow-md">
                    <span className="text-headline-lg font-bold text-primary">{winner.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-white">
                    <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>workspace_premium</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary mb-1 uppercase tracking-widest">Grand Champion</p>
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">{winner.name}</h2>
                <div className="flex flex-col items-center bg-surface-container rounded-lg px-16 py-6 w-full">
                  <span className="font-display-lg text-display-lg text-on-surface font-black">{Math.round(winner.score)}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">Points</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Full Rankings Leaderboard */}
          <div className="w-full lg:w-[450px] flex-shrink-0 flex flex-col">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden card-shadow h-[400px] sm:h-[480px] lg:h-full">
              <div className="px-6 py-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
                <h3 className="font-headline-md text-headline-md text-on-surface">Full Rankings</h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-tighter">{finalLeaderboard.length} Players</span>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar px-6">
                
                {myPlayerIndex !== -1 && (
                  <div className="mb-6 mt-6 p-6 bg-primary-container/10 border-2 border-primary/20 rounded-xl card-shadow">
                    <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-3">Your Performance</p>
                    <div className="flex items-center gap-6">
                      <span className="font-display-lg text-display-lg text-primary font-black">#{myPlayerIndex + 1}</span>
                      <div className="flex-grow">
                        <p className="font-headline-md text-headline-md text-on-surface">{myPlayer.name}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{myPlayerIndex === 0 ? 'Grand Champion' : 'Player'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display-lg text-display-lg text-on-surface font-black">{Math.round(myPlayer.score)}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">Points</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leaderboard Rows */}
                <div className="space-y-2 py-6">
                  {finalLeaderboard.map((player, index) => {
                    const isFirst = index === 0;
                    
                    if (isFirst) {
                      return (
                        <div key={player.userId} className="flex items-center gap-6 p-3 bg-secondary-container/30 rounded-lg border border-primary/10">
                          <span className="w-8 font-headline-md text-primary text-center">#1</span>
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{player.name.charAt(0).toUpperCase()}</div>
                          <div className="flex-grow">
                            <p className="text-sm font-semibold text-on-surface">{player.name}</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">Winner</p>
                          </div>
                          <div className="text-right">
                            <p className="font-headline-md text-headline-md text-on-surface">{Math.round(player.score)}</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">PTS</p>
                          </div>
                        </div>
                      );
                    } else if (index === 1) {
                      return (
                        <div key={player.userId} className="flex items-center gap-6 p-3 rounded-lg border border-transparent hover:bg-surface-container-high transition-colors">
                          <span className="w-8 font-headline-md text-on-surface-variant text-center opacity-60">#2</span>
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold">{player.name.charAt(0).toUpperCase()}</div>
                          <div className="flex-grow">
                            <p className="text-sm font-semibold text-on-surface">{player.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-headline-md text-headline-md text-on-surface">{Math.round(player.score)}</p>
                          </div>
                        </div>
                      );
                    } else if (index === 2) {
                      return (
                        <div key={player.userId} className="flex items-center gap-6 p-3 rounded-lg border border-transparent hover:bg-surface-container-high transition-colors">
                          <span className="w-8 font-headline-md text-on-surface-variant text-center opacity-60">#3</span>
                          <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-white font-bold">{player.name.charAt(0).toUpperCase()}</div>
                          <div className="flex-grow">
                            <p className="text-sm font-semibold text-on-surface">{player.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-headline-md text-headline-md text-on-surface">{Math.round(player.score)}</p>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={player.userId} className="flex items-center gap-6 p-3 rounded-lg border border-transparent hover:bg-surface-container-high transition-colors">
                          <span className="w-8 text-sm font-semibold text-on-surface-variant text-center">{index + 1}</span>
                          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold">{player.name.charAt(0).toUpperCase()}</div>
                          <div className="flex-grow">
                            <p className="text-sm font-semibold text-on-surface">{player.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-body-md text-body-md text-on-surface">{Math.round(player.score)}</p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Action Bar */}
        <footer className="fixed bottom-0 left-0 right-0 w-full bg-surface-container border-t border-outline-variant py-3 sm:py-6 px-4 sm:px-10 z-50">
          <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-center gap-3">
            {isHost && (
              <Link to="/host" className="flex items-center gap-2 px-6 sm:px-16 py-2 sm:py-3 bg-primary text-on-primary font-headline-md rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm sm:text-base">
                <span className="material-symbols-outlined">rocket_launch</span>
                Host Another Quiz
              </Link>
            )}
            <Link to="/play" className="flex items-center gap-2 px-6 sm:px-10 py-2 sm:py-3 bg-surface-container-lowest text-primary border border-primary font-headline-md rounded-lg hover:bg-secondary-container transition-all active:scale-95 text-sm sm:text-base">
              <span className="material-symbols-outlined text-sm sm:text-base">sports_esports</span>
              <span className="hidden sm:inline">Join Another Game</span>
              <span className="sm:hidden">Join</span>
            </Link>
            <Link to="/" className="flex items-center gap-2 px-6 sm:px-10 py-2 sm:py-3 bg-surface-container-lowest text-on-surface-variant border border-outline-variant font-headline-md rounded-lg hover:bg-surface-container-low transition-all active:scale-95 text-sm sm:text-base">
              <span className="material-symbols-outlined text-sm sm:text-base">home</span>
              <span className="hidden sm:inline">Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Leaderboard;
