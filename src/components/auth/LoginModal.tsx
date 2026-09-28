import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  X,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
  KeyRound,
  UserCheck
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRolePrompt?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSelectRolePrompt }) => {
  const { loginWithGoogle, sendOTP, verifyOTP, loginWithEmail, signUpWithEmail, resetPassword, setDemoRole, isSupabaseActive } = useAuth();

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !isSupabaseActive;

  const [activeTab, setActiveTab] = useState<'phone' | 'email' | 'google'>('phone');
  const [emailSubMode, setEmailSubMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Phone state
  const [countryCode, setCountryCode] = useState('+91');
  const [rawPhone, setRawPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  if (!isOpen) return null;

  const fullPhone = `${countryCode}${rawPhone.trim().replace(/^0+/, '')}`;

  // 1. Phone + OTP Flow
  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    if (!rawPhone || rawPhone.length < 8) {
      setFeedbackMsg({ text: 'Please enter a valid phone number (e.g. 9876543210)', isError: true });
      return;
    }

    setIsLoading(true);
    const res = await sendOTP(fullPhone);
    setIsLoading(false);

    if (res.success) {
      setOtpSent(true);
      setResendTimer(60);
      setFeedbackMsg({ text: res.message || `OTP sent to ${fullPhone}`, isError: false });
    } else {
      setFeedbackMsg({ text: res.message || 'Failed to send OTP', isError: true });
    }
  };

  const handleVerifyPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    if (otpCode.length < 6) {
      setFeedbackMsg({ text: 'Enter a valid 6-digit OTP code', isError: true });
      return;
    }

    setIsLoading(true);
    const res = await verifyOTP(fullPhone, otpCode);
    setIsLoading(false);

    if (res.success) {
      onClose();
      if (onSelectRolePrompt) onSelectRolePrompt();
    } else {
      setFeedbackMsg({ text: res.message || 'Invalid OTP verification code', isError: true });
    }
  };

  // 2. Google OAuth
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setFeedbackMsg(null);
    try {
      await loginWithGoogle();
      onClose();
      if (onSelectRolePrompt) onSelectRolePrompt();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Google authentication failed', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Email & Password Flow
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (emailSubMode === 'signin') {
      if (!email || !password) {
        setFeedbackMsg({ text: 'Please enter email and password', isError: true });
        return;
      }
      setIsLoading(true);
      const res = await loginWithEmail(email, password);
      setIsLoading(false);
      if (res.success) {
        onClose();
      } else {
        setFeedbackMsg({ text: res.message, isError: true });
      }
    } else if (emailSubMode === 'signup') {
      if (!email || !password || !name) {
        setFeedbackMsg({ text: 'All fields are required', isError: true });
        return;
      }
      if (password !== confirmPassword) {
        setFeedbackMsg({ text: 'Passwords do not match', isError: true });
        return;
      }
      setIsLoading(true);
      const res = await signUpWithEmail(email, password, name);
      setIsLoading(false);
      if (res.success) {
        setFeedbackMsg({ text: 'Account created! Choose your role.', isError: false });
        onClose();
        if (onSelectRolePrompt) onSelectRolePrompt();
      } else {
        setFeedbackMsg({ text: res.message, isError: true });
      }
    } else if (emailSubMode === 'forgot') {
      if (!email) {
        setFeedbackMsg({ text: 'Enter your email address', isError: true });
        return;
      }
      setIsLoading(true);
      const res = await resetPassword(email);
      setIsLoading(false);
      setFeedbackMsg({ text: res.message, isError: !res.success });
    }
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setDemoRole(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-red-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/20">
            <span className="text-2xl font-black text-white">🚑</span>
          </div>
          <h3 className="text-2xl font-black text-white">AmbuNet Auth</h3>
          <p className="text-xs text-slate-400 mt-1">
            Emergency Medical Ecosystem Login
          </p>
        </div>

        {/* Auth Method Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('phone'); setFeedbackMsg(null); }}
            className={`py-2 rounded-xl transition ${activeTab === 'phone' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            📱 Phone OTP
          </button>
          <button
            onClick={() => { setActiveTab('email'); setFeedbackMsg(null); }}
            className={`py-2 rounded-xl transition ${activeTab === 'email' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            ✉️ Email
          </button>
          <button
            onClick={() => { setActiveTab('google'); setFeedbackMsg(null); }}
            className={`py-2 rounded-xl transition ${activeTab === 'google' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            🌐 Google
          </button>
        </div>

        {feedbackMsg && (
          <div className={`p-3 rounded-xl text-xs font-semibold mb-4 border ${
            feedbackMsg.isError
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {feedbackMsg.text}
          </div>
        )}

        {/* TAB 1: PHONE + OTP */}
        {activeTab === 'phone' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendPhoneOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Phone Number (E.164 Standard)
                  </label>
                  <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-slate-900 text-white text-xs font-bold outline-none rounded-lg px-2 py-1 border border-slate-700"
                    >
                      <option value="+91">🇮🇳 +91 (India)</option>
                      <option value="+1">🇺🇸 +1 (USA)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={rawPhone}
                      onChange={(e) => setRawPhone(e.target.value)}
                      className="bg-transparent flex-1 text-white text-sm outline-none placeholder:text-slate-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send 6-Digit SMS OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    Enter OTP sent to {fullPhone}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-mono tracking-widest text-center outline-none focus:border-red-500"
                  />
                  {isDemoMode && (
                    <p className="text-[11px] text-slate-500 mt-1 text-center">
                      Demo Mode active: Use code <strong className="text-slate-300">123456</strong>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP & Sign In'}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="hover:text-white underline"
                  >
                    Change Phone Number
                  </button>

                  <button
                    type="button"
                    disabled={resendTimer > 0}
                    onClick={handleSendPhoneOTP}
                    className="hover:text-white disabled:opacity-40"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: EMAIL & PASSWORD */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {emailSubMode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="user@ambunet.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
              />
            </div>

            {emailSubMode !== 'forgot' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>
            )}

            {emailSubMode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                emailSubMode === 'signin' ? 'Sign In' : emailSubMode === 'signup' ? 'Create Account' : 'Send Password Reset Email'
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              {emailSubMode === 'signin' && (
                <>
                  <button type="button" onClick={() => setEmailSubMode('signup')} className="hover:text-white underline">
                    Need an account? Sign Up
                  </button>
                  <button type="button" onClick={() => setEmailSubMode('forgot')} className="hover:text-white underline">
                    Forgot password?
                  </button>
                </>
              )}
              {emailSubMode === 'signup' && (
                <button type="button" onClick={() => setEmailSubMode('signin')} className="hover:text-white underline mx-auto">
                  Already have an account? Sign In
                </button>
              )}
              {emailSubMode === 'forgot' && (
                <button type="button" onClick={() => setEmailSubMode('signin')} className="hover:text-white underline mx-auto">
                  Back to Sign In
                </button>
              )}
            </div>
          </form>
        )}

        {/* TAB 3: GOOGLE OAUTH */}
        {activeTab === 'google' && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-xs text-slate-400">
              Sign in securely using your registered Google Workspace account.
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-lg transition text-sm disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {/* DEMO MODE ONE-CLICK PANEL */}
        {isDemoMode && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block text-center mb-3">
              ⚡ Demo Mode: Instant One-Click Role Accounts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => handleQuickDemoLogin('patient')}
                className="py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition text-left flex items-center justify-between"
              >
                <span>👤 Patient</span>
                <span className="text-[10px] text-red-400">Demo</span>
              </button>
              <button
                onClick={() => handleQuickDemoLogin('driver')}
                className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition text-left flex items-center justify-between"
              >
                <span>🚑 Driver</span>
                <span className="text-[10px] text-amber-400">Demo</span>
              </button>
              <button
                onClick={() => handleQuickDemoLogin('hospital_staff')}
                className="py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition text-left flex items-center justify-between"
              >
                <span>🏥 Hospital</span>
                <span className="text-[10px] text-blue-400">Demo</span>
              </button>
              <button
                onClick={() => handleQuickDemoLogin('admin')}
                className="py-2.5 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition text-left flex items-center justify-between"
              >
                <span>🛡️ Admin EOC</span>
                <span className="text-[10px] text-purple-400">Demo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
