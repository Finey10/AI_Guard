'use client';

import React, { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/types';
import { X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
  onLogout
}) => {
  // Mode: 'signup' | 'login'
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  // Identifier toggle: 'email' | 'phone'
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');

  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    setErrorMsg(null);
    if (!identifier.trim()) {
      setErrorMsg(
        identifierType === 'email'
          ? 'Please enter your email address'
          : 'Please enter your phone number'
      );
      return false;
    }

    if (identifierType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier.trim())) {
        setErrorMsg('Please enter a valid email address (e.g. johndoe@gmail.com)');
        return false;
      }
    } else {
      const cleanPhone = identifier.replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.length < 7 || !/^\d+$/.test(cleanPhone)) {
        setErrorMsg('Please enter a valid phone number');
        return false;
      }
    }

    if (!password) {
      setErrorMsg('Please enter your password');
      return false;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleCompleteAuth = (user: AuthUser) => {
    try {
      localStorage.setItem('signal_ops_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    onLoginSuccess(user);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const name =
        identifierType === 'email'
          ? identifier.split('@')[0].replace(/[._]/g, ' ')
          : 'Operator';

      const user: AuthUser = {
        id: `usr_${Date.now().toString(36)}`,
        loginType: identifierType,
        identifier: identifier.trim(),
        name: name
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        role: 'Verified SRE Engineer',
        token: `jwt_${Math.random().toString(36).substring(2)}`,
        authenticatedAt: new Date().toLocaleTimeString()
      };

      handleCompleteAuth(user);
    }, 500);
  };

  const handleGoogleSSO = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const googleUser: AuthUser = {
        id: `goog_${Date.now().toString(36)}`,
        loginType: 'email',
        identifier: 'johndoe@gmail.com',
        name: 'John Doe',
        role: 'Google SSO Operator',
        token: `sso_${Math.random().toString(36).substring(2)}`,
        authenticatedAt: new Date().toLocaleTimeString()
      };
      handleCompleteAuth(googleUser);
    }, 450);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[32px] bg-[#E5E4E2] text-[#2C1D14] p-8 shadow-[0_20px_60px_rgba(111,78,55,0.35)] border border-[#E6E0F0] relative overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative ambient glow inside card */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6E0F0] rounded-full blur-2xl pointer-events-none opacity-80" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#6F4E37]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-[#6F4E37]/70 hover:text-[#6F4E37] hover:bg-[#E6E0F0]/60 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* If Active Session Exists: Display mini banner */}
        {currentUser && (
          <div className="mb-4 p-3 rounded-2xl bg-[#E6E0F0]/70 border border-[#6F4E37]/30 text-xs font-sans text-[#2C1D14] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6F4E37]" />
              <div>
                <p className="font-bold text-[#6F4E37]">{currentUser.name}</p>
                <p className="text-[10px] text-[#553C2B]">{currentUser.identifier}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
            >
              Sign out
            </button>
          </div>
        )}

        {/* Top Segmented Capsule Toggle: Sign Up vs Log In in Mocha Brown */}
        <div className="w-full bg-[#6F4E37] rounded-full p-1 flex items-center justify-between mb-7 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all text-center cursor-pointer ${
              authMode === 'signup'
                ? 'bg-[#E6E0F0] text-[#6F4E37] shadow-sm'
                : 'text-[#E5E4E2] hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all text-center cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#E6E0F0] text-[#6F4E37] shadow-sm'
                : 'text-[#E5E4E2] hover:text-white'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Main Title & Subtitle */}
        <div className="mb-6 relative z-10">
          <h2 className="text-2xl font-bold tracking-tight text-[#2C1D14] mb-1.5 font-sans">
            {authMode === 'signup' ? 'Create your account' : 'Log in to your account'}
          </h2>
          <p className="text-xs text-[#553C2B] font-sans leading-relaxed">
            {authMode === 'signup'
              ? 'Create a free account to continue on our platform.'
              : 'Enter your credentials to continue on our platform.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-800 font-sans">
            {errorMsg}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="relative z-10">
          {/* Email / Phone Field */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#2C1D14] font-sans">
                {identifierType === 'email' ? 'Email' : 'Phone'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIdentifierType(identifierType === 'email' ? 'phone' : 'email');
                  setIdentifier('');
                  setErrorMsg(null);
                }}
                className="text-[11px] text-[#6F4E37] font-semibold hover:underline font-sans cursor-pointer"
              >
                {identifierType === 'email' ? 'Use phone instead' : 'Use email instead'}
              </button>
            </div>
            <input
              type={identifierType === 'email' ? 'email' : 'tel'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={identifierType === 'email' ? 'johndoe@gmail.com' : '+1 (555) 019-2834'}
              className="w-full bg-transparent border-b border-[#6F4E37]/30 focus:border-[#6F4E37] py-2 text-sm text-[#2C1D14] placeholder-[#553C2B]/50 focus:outline-none transition-colors font-sans"
            />
          </div>

          {/* Password Field */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[#2C1D14] font-sans">
                Password
              </label>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => alert('Password reset link dispatched.')}
                  className="text-[11px] text-[#6F4E37] font-semibold hover:underline font-sans cursor-pointer"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent border-b border-[#6F4E37]/30 focus:border-[#6F4E37] py-2 pr-8 text-sm text-[#2C1D14] placeholder-[#553C2B]/50 focus:outline-none transition-colors font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6F4E37]/70 hover:text-[#6F4E37] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Button 1: Continue in Mocha Brown */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-full bg-[#6F4E37] hover:bg-[#855E43] text-[#E5E4E2] font-semibold text-sm transition-all duration-200 shadow-md active:scale-[0.99] flex items-center justify-center gap-2 mb-3 cursor-pointer"
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>

          {/* Action Button 2: Continue with Google in Pale Lavender */}
          <button
            type="button"
            onClick={handleGoogleSSO}
            disabled={isLoading}
            className="w-full py-2.5 px-3 rounded-full bg-[#E6E0F0] hover:bg-[#D8D0E5] text-[#2C1D14] border border-[#6F4E37]/25 font-semibold text-sm transition-all duration-200 shadow-sm active:scale-[0.99] flex items-center justify-center gap-3 relative cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <span>Continue with Google</span>
          </button>
        </form>
      </div>
    </div>
  );
};
