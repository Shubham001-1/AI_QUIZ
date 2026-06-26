import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHostClick = () => {
    if (isAuthenticated) {
      navigate('/host');
    } else {
      navigate('/login', { state: { from: '/host' } });
    }
  };

  const handleBuilderClick = () => {
    if (isAuthenticated) {
      navigate('/builder');
    } else {
      navigate('/login', { state: { from: '/builder' } });
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen flex flex-col selection:bg-primary-container selection:text-white">
      {/* TopNavBar */}
      <header className="w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-border-subtle shadow-sm">
        <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-headline-lg text-headline-lg font-bold text-primary">QuizMaster</Link>
            <div className="hidden lg:flex items-center gap-6">
              <Link to="/" className="font-body-md text-body-md text-primary border-b-2 border-primary pb-1">Home</Link>
              <Link to="/builder" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Create Quiz</Link>
              <Link to="/host" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Host Quiz</Link>
              <Link to="/play" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200">Join Quiz</Link>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/login" className="font-label-bold text-on-surface-variant hover:text-primary px-4 py-2 transition-colors">Sign In</Link>
            <Link to="/login" className="bg-primary-container text-white px-6 py-2 rounded-lg font-label-bold hover:opacity-90 transition-opacity">Join</Link>
          </div>
          {/* Mobile Hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </nav>
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-border-subtle bg-surface-container-lowest px-4 pb-4 space-y-1 shadow-md">
            <Link to="/" className="block px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/builder" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" onClick={() => setMenuOpen(false)}>Create Quiz</Link>
            <Link to="/host" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" onClick={() => setMenuOpen(false)}>Host Quiz</Link>
            <Link to="/play" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" onClick={() => setMenuOpen(false)}>Join Quiz</Link>
            <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
              <Link to="/login" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary transition-colors" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/login" className="block px-4 py-2 rounded-lg text-sm font-semibold bg-primary-container text-white text-center hover:opacity-90 transition-opacity" onClick={() => setMenuOpen(false)}>Join</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-16 pb-12 sm:pt-20 sm:pb-16 hero-gradient overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-display-lg font-display-lg font-bold mb-4 sm:mb-6 max-w-4xl mx-auto leading-tight">
              The Smartest Way to <span className="text-primary">Play Live Quizzes</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
              Generate AI-powered quizzes on any topic in seconds. Host real-time games, compete with friends, and climb the leaderboard — all with zero prep.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <button onClick={handleHostClick} className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                Host a Quiz
              </button>
              <button onClick={handleBuilderClick} className="w-full sm:w-auto bg-white text-on-surface border border-border-subtle px-8 py-4 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:border-primary transition-all">
                <span className="material-symbols-outlined">edit_note</span>
                Build Custom Quiz
              </button>
              <Link to="/play" className="w-full sm:w-auto bg-white text-on-surface border border-border-subtle px-8 py-4 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:border-primary transition-all">
                <span className="material-symbols-outlined">group</span>
                Join a Quiz
              </Link>
            </div>

            {/* Stats Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-8 border-border-subtle">
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-border-subtle shadow-sm transition-all duration-300 hover:border-primary">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined">format_list_numbered</span>
                </div>
                <div className="font-display-lg text-display-lg text-primary mb-1">Any</div>
                <div className="font-label-bold text-on-surface-variant">Custom Questions</div>
                <div className="text-body-sm text-on-surface-variant/70 mt-1">Set your own limit</div>
              </div>
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-border-subtle shadow-sm transition-all duration-300 hover:border-primary">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined">timer</span>
                </div>
                <div className="font-display-lg text-display-lg text-primary mb-1">20s</div>
                <div className="font-label-bold text-on-surface-variant">Per Question</div>
                <div className="text-body-sm text-on-surface-variant/70 mt-1">Adjustable timing</div>
              </div>
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-border-subtle shadow-sm transition-all duration-300 hover:border-primary">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined">all_inclusive</span>
                </div>
                <div className="font-display-lg text-display-lg text-primary mb-1">∞</div>
                <div className="font-label-bold text-on-surface-variant">Infinite Topics</div>
                <div className="text-body-sm text-on-surface-variant/70 mt-1">AI-powered variety</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-headline-xl font-headline-xl mb-4">Everything you need to <span className="text-primary">run great quizzes</span></h2>
              <p className="font-body-md text-on-surface-variant max-w-xl mx-auto text-sm sm:text-base">From AI generation to real-time scoring — we've built every feature you need for an unforgettable quiz experience.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-8 border border-border-subtle rounded-xl card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg mb-6 text-primary">
                  <span className="material-symbols-outlined text-3xl">smart_toy</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">AI Question Generation</h3>
                <p className="font-body-md text-on-surface-variant">Enter any topic and AI instantly generates 10 perfectly crafted questions with 4 options each.</p>
              </div>
              <div className="p-8 border border-border-subtle rounded-xl card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg mb-6 text-primary">
                  <span className="material-symbols-outlined text-3xl">architecture</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Quiz Builder</h3>
                <p className="font-body-md text-on-surface-variant">Build quizzes cell-by-cell like a notebook — write manually, generate with AI, or mix both. Edit everything before hosting.</p>
              </div>
              <div className="p-8 border border-border-subtle rounded-xl card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg mb-6 text-primary">
                  <span className="material-symbols-outlined text-3xl">bolt</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Real-Time Gameplay</h3>
                <p className="font-body-md text-on-surface-variant">Lightning-fast Socket.io ensures all players see questions and scores simultaneously with zero lag.</p>
              </div>
              <div className="p-8 border border-border-subtle rounded-xl card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg mb-6 text-primary">
                  <span className="material-symbols-outlined text-3xl">military_tech</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Live Leaderboard</h3>
                <p className="font-body-md text-on-surface-variant">Redis-powered leaderboard updates every 2 seconds. Watch rankings shift in real time as answers come in.</p>
              </div>
              <div className="p-8 border border-border-subtle rounded-xl card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg mb-6 text-primary">
                  <span className="material-symbols-outlined text-3xl">timer</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Speed Bonus Scoring</h3>
                <p className="font-body-md text-on-surface-variant">Answer faster to earn more points. Streak multipliers reward consistent correct answers up to 3x.</p>
              </div>
              <div className="p-8 border border-border-subtle rounded-xl card-hover transition-all duration-300">
                <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg mb-6 text-primary">
                  <span className="material-symbols-outlined text-3xl">shield_person</span>
                </div>
                <h3 className="font-headline-md text-headline-md mb-3">Anti-Cheat System</h3>
                <p className="font-body-md text-on-surface-variant">Tab switch detection, answer lock, and time validation keep the game fair for everyone across all devices.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-16 sm:py-24 bg-surface-container-low">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl lg:text-display-lg font-display-lg font-bold mb-4">How it <span className="text-primary">works</span></h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              <div className="relative z-10 text-center flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-border-subtle">
                <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">edit_square</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">01</div>
                <h3 className="font-headline-md text-headline-md mb-3">Choose & Create</h3>
                <p className="font-body-sm text-on-surface-variant">Host selects a topic and builds the quiz manually or uses AI to generate questions.</p>
              </div>
              <div className="relative z-10 text-center flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-border-subtle">
                <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">share</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">02</div>
                <h3 className="font-headline-md text-headline-md mb-3">Host & Share</h3>
                <p className="font-body-sm text-on-surface-variant">Host starts the live session and shares the unique room code with participants.</p>
              </div>
              <div className="relative z-10 text-center flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-border-subtle">
                <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">login</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">03</div>
                <h3 className="font-headline-md text-headline-md mb-3">Join Game</h3>
                <p className="font-body-sm text-on-surface-variant">Participants enter the room code on the play page to enter the lobby.</p>
              </div>
              <div className="relative z-10 text-center flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-border-subtle">
                <div className="w-16 h-16 mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">emoji_events</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">04</div>
                <h3 className="font-headline-md text-headline-md mb-3">Play & Win</h3>
                <p className="font-body-sm text-on-surface-variant">Compete in real-time, climb the leaderboard, and claim victory.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 sm:py-24">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
            <div className="bg-inverse-surface rounded-2xl p-8 sm:p-12 text-center text-white relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="font-display-lg text-display-lg mb-6">Ready to play? </h2>
                <p className="font-body-lg text-surface-variant mb-10 max-w-2xl mx-auto">
                  No downloads, no setup. Jump in and start your first AI-powered quiz in under 30 seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button onClick={handleHostClick} className="w-full sm:w-auto bg-primary-container text-white px-8 py-4 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                    Host with AI
                  </button>
                  <button onClick={handleBuilderClick} className="w-full sm:w-auto bg-transparent border border-surface-variant text-white px-8 py-4 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                    <span className="material-symbols-outlined">edit_note</span>
                    Build Custom Quiz
                  </button>
                  <Link to="/play" className="w-full sm:w-auto bg-surface-variant text-on-surface px-8 py-4 rounded-lg font-label-bold flex items-center justify-center gap-2 hover:bg-white transition-all">
                    <span className="material-symbols-outlined">sports_esports</span>
                    Join a Game
                  </Link>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 sm:py-16 bg-surface-container border-t border-border-subtle mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="font-headline-md text-headline-md font-bold text-on-surface mb-4">QuizMaster</div>
              <p className="font-body-sm text-on-surface-variant mb-6 pr-8">
                The world's leading marketplace for AI-driven certification and live quiz engagement.
              </p>
            </div>
            <div>
              <h4 className="font-label-bold text-on-surface mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">About Us</a></li>
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Careers</a></li>
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-bold text-on-surface mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Help Center</a></li>
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Trust & Safety</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-label-bold text-on-surface mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a></li>
                <li><a className="font-body-sm text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body-sm text-on-surface-variant">© 2024 QuizMaster Inc. Professional AI Certification Marketplace.</p>
            <div className="flex items-center gap-6">
              <p className="font-body-sm text-on-surface-variant flex items-center gap-1">
                Built with <span className="text-error">❤</span> using React, Node.js, Socket.io & Google Gemini AI
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
