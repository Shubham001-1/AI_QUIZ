import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const FeatureCard = ({ icon, title, description }) => (
  <div className="glass-card-hover p-6 group">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600/30 to-brand-500/10 border border-brand-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
    <p className="text-white/50 text-sm leading-relaxed">{description}</p>
  </div>
);

const StatCard = ({ value, label }) => (
  <div className="text-center">
    <div className="font-display font-black text-4xl sm:text-5xl gradient-text mb-1">{value}</div>
    <div className="text-white/40 text-sm">{label}</div>
  </div>
);

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleHostClick = () => {
    if (isAuthenticated) {
      navigate('/host');
    } else {
      navigate('/login', { state: { from: '/host' } });
    }
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-16 overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-800/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-2 mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-brand-300 text-sm font-medium">Powered by Google Gemini AI</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-tight mb-6 animate-slide-up">
            The Smartest Way to
            <br />
            <span className="gradient-text">Play Live Quizzes</span>
          </h1>

          <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Generate AI-powered quizzes on any topic in seconds. Host real-time games, compete with friends, and climb the leaderboard — all with zero prep.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              id="host-quiz-btn"
              onClick={handleHostClick}
              className="group relative px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl text-white font-display font-bold text-lg shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                🎯 Host a Quiz
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            <Link
              to="/play"
              id="join-quiz-btn"
              className="group px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl text-white font-display font-bold text-lg hover:bg-white/10 hover:border-white/40 hover:scale-105 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                🎮 Join a Quiz
              </span>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <StatCard value="10" label="AI Questions" />
            <StatCard value="20s" label="Per Question" />
            <StatCard value="∞" label="Topics" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-white/40 rounded-full animate-scroll-dot" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-black text-4xl sm:text-5xl text-white mb-4">
              Everything you need to{' '}
              <span className="gradient-text">run great quizzes</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              From AI generation to real-time scoring — we've built every feature you need for an unforgettable quiz experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="🤖"
              title="AI Question Generation"
              description="Enter any topic and Gemini AI instantly generates 10 perfectly crafted questions with 4 options each."
            />
            <FeatureCard
              icon="⚡"
              title="Real-Time Gameplay"
              description="Lightning-fast Socket.io ensures all players see questions and scores simultaneously with zero lag."
            />
            <FeatureCard
              icon="🏆"
              title="Live Leaderboard"
              description="Redis-powered leaderboard updates every 2 seconds. Watch rankings shift in real time as answers come in."
            />
            <FeatureCard
              icon="⏱️"
              title="Speed Bonus Scoring"
              description="Answer faster to earn more points. Streak multipliers reward consistent correct answers up to 3x."
            />
            <FeatureCard
              icon="🛡️"
              title="Anti-Cheat System"
              description="Tab switch detection, answer lock, and time validation keep the game fair for everyone."
            />
            <FeatureCard
              icon="🎉"
              title="Epic Game End"
              description="Confetti, medals, and a full final leaderboard make every game ending feel like a celebration."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-black text-4xl sm:text-5xl text-white mb-4">
              How it <span className="gradient-text">works</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '✍️', title: 'Enter a Topic', desc: 'Type any subject — Python, World History, Marvel Movies, anything.' },
              { step: '02', icon: '🚀', title: 'AI Generates Questions', desc: 'Gemini creates 10 unique questions in seconds. Share the room code.' },
              { step: '03', icon: '🏅', title: 'Play & Win', desc: 'Answer fast, build streaks, and claim the top spot on the leaderboard.' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/40 to-brand-800/20 border border-brand-500/20 text-3xl mb-4">
                  {item.icon}
                </div>
                <div className="absolute -top-2 -right-2 text-xs font-bold text-brand-400/50 font-display">
                  {item.step}
                </div>
                <h3 className="font-display font-bold text-white text-xl mb-2">{item.title}</h3>
                <p className="text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative glass-card p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-accent-600/5 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-display font-black text-4xl sm:text-5xl text-white mb-4">
                Ready to play? 🎮
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                No downloads, no setup. Jump in and start your first AI-powered quiz in under 30 seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleHostClick}
                  className="btn-primary text-base px-8 py-4 rounded-2xl font-display font-bold"
                >
                  🎯 Host for Free
                </button>
                <Link to="/play" className="btn-secondary text-base px-8 py-4 rounded-2xl font-display font-bold text-center">
                  🎮 Join a Game
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center">
        <p className="text-white/30 text-sm">
          Built with ❤️ using React, Node.js, Socket.io & Google Gemini AI
        </p>
      </footer>
    </div>
  );
};

export default Home;
