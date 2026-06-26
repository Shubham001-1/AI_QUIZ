import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/host';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, form);
      if (data.success) {
        login(data.token, data.user);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background Atmospheric Element */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] -z-10 translate-y-1/2 -translate-x-1/2"></div>

      {/* Top Left Logo Nav */}
      <Link to="/" className="absolute top-8 left-8 md:left-12 font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
        QuizMaster
      </Link>

      <div className="relative w-full max-w-md animate-slide-up z-10">
        <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">key</span>
            </div>
            <h1 className="font-display-lg-mobile text-on-surface mb-2">Welcome Back</h1>
            <p className="text-on-surface-variant text-sm font-body-md">Sign in to host your quizzes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="p-3 bg-error-container border border-error/20 rounded-xl">
                <p className="text-on-error-container font-medium text-sm text-center">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-on-surface-variant text-sm font-label-bold mb-1.5">Email Address</label>
              <input
                id="login-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/40 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-on-surface-variant text-sm font-label-bold mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/40 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-white py-3.5 rounded-xl font-label-bold text-base mt-2 flex items-center justify-center gap-2 hover:bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-on-surface-variant text-xs font-medium">Don't have an account?</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <Link to="/register" id="register-link" className="w-full bg-surface border border-border-subtle text-on-surface py-3 rounded-xl font-label-bold text-sm text-center block hover:bg-surface-container transition-all shadow-sm">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
