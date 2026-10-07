import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Shield, KeyRound, Mail, User as UserIcon, ArrowRight } from 'lucide-react';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('USER');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, name, role);
      } else {
        await login(email, password);
      }
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoFill = (demoRole) => {
    if (demoRole === 'ADMIN') {
      setEmail('admin@zyngram.com');
      setPassword('AdminPass123!');
    } else {
      setEmail('user@zyngram.com');
      setPassword('UserPass123!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f19] relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-2xl relative border border-slate-800">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-indigo-600/30">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isRegister ? 'Create Zynora Account' : 'Welcome to Zynora'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zyngram Knowledge Intelligence Platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Demo Quick Fill Shortcuts */}
        <div className="mb-6 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <p className="text-slate-400 font-medium mb-2 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            Quick Demo Login Credentials:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoFill('USER')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] py-1.5 px-2 rounded-lg transition border border-slate-700 font-mono"
            >
              Normal User
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoFill('ADMIN')}
              className="bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 text-[11px] py-1.5 px-2 rounded-lg transition border border-indigo-500/30 font-mono"
            >
              Admin User
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@zyngram.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 pl-10 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
              >
                <option value="USER">USER (Chat Assistant Only)</option>
                <option value="ADMIN">ADMIN (Full RAG Management)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
          >
            <span>{isRegister ? 'Register Account' : 'Sign In to Zynora'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-indigo-400 font-semibold hover:underline ml-1"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
