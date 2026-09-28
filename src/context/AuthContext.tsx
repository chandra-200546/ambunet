import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, MedicalProfile } from '../types';
import { DEMO_USERS } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logSupabaseError } from '../lib/dbUtils';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseActive: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  sendOTP: (phoneOrEmail: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (phoneOrEmail: string, token: string) => Promise<{ success: boolean; message?: string }>;
  setDemoRole: (role: UserRole, hospitalId?: string) => void;
  updateUserRole: (role: UserRole) => Promise<void>;
  updateMedicalProfile: (profile: Partial<MedicalProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'ambunet_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(LOCAL_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Default to Patient Demo User initially
    return DEMO_USERS[0];
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSupabaseActive = isSupabaseConfigured();

  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseActive && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch or map profile from Supabase
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile as User);
          } else {
            // New user from OAuth
            const newUser: User = {
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email,
              phone: session.user.phone,
              role: (session.user.user_metadata?.role as UserRole) || 'patient',
              medical_profile: {
                blood_group: 'O+',
                allergies: 'None',
                conditions: 'None'
              }
            };
            setUser(newUser);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [isSupabaseActive]);

  // Persist user changes to localStorage for offline / mock continuity
  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    }
  }, [user]);

  const loginWithGoogle = async () => {
    if (isSupabaseActive && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } else {
      // Demo Google login
      const googleDemoUser: User = {
        id: 'u-google-demo',
        name: 'Demo Google User',
        email: 'user@google.com',
        role: 'patient',
        medical_profile: {
          blood_group: 'B+',
          allergies: 'Penicillin',
          conditions: 'Asthma'
        }
      };
      setUser(googleDemoUser);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseActive && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, message: error.message };

      const authUser = data.user;
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        setUser((profile as User | null) || {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email,
          role: (authUser.user_metadata?.role as UserRole) || 'patient'
        });
      }

      return { success: true, message: 'Signed in successfully.' };
    }

    setUser({
      id: '11111111-1111-1111-1111-111111111111',
      name: email.split('@')[0] || 'Demo User',
      email,
      role: 'patient'
    });
    return { success: true, message: 'Demo mode sign in successful.' };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseActive && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'patient' }
        }
      });

      if (error) return { success: false, message: error.message };

      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          name,
          email,
          role: 'patient',
          medical_profile: {
            blood_group: 'O+',
            allergies: 'None',
            conditions: 'None'
          }
        };
        setUser(newUser);

        const { error: profileError } = await supabase.from('users').upsert({
          id: data.user.id,
          name,
          email,
          role: 'patient',
          updated_at: new Date().toISOString()
        });
        logSupabaseError('email signup profile upsert', profileError);
      }

      return { success: true, message: 'Account created successfully.' };
    }

    setUser({
      id: '11111111-1111-1111-1111-111111111111',
      name,
      email,
      role: 'patient'
    });
    return { success: true, message: 'Demo account created.' };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseActive && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Password reset email sent.' };
    }

    return { success: true, message: 'Demo mode: password reset email simulated.' };
  };

  const sendOTP = async (phoneOrEmail: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseActive && supabase) {
      if (phoneOrEmail.includes('@')) {
        const { error } = await supabase.auth.signInWithOtp({ email: phoneOrEmail });
        if (error) return { success: false, message: error.message };
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: phoneOrEmail });
        if (error) return { success: false, message: error.message };
      }
      return { success: true, message: 'OTP code sent! Check your inbox / SMS.' };
    }
    // Demo mode: Instant code sent
    return { success: true, message: 'Demo mode: Enter OTP "123456" to proceed.' };
  };

  const verifyOTP = async (phoneOrEmail: string, token: string): Promise<{ success: boolean; message?: string }> => {
    if (isSupabaseActive && supabase) {
      const isEmail = phoneOrEmail.includes('@');
      const { data, error } = await supabase.auth.verifyOtp({
        [isEmail ? 'email' : 'phone']: phoneOrEmail,
        token,
        type: isEmail ? 'email' : 'sms'
      } as any);

      if (error) return { success: false, message: error.message };
      if (data.user) {
        setUser({
          id: data.user.id,
          name: isEmail ? phoneOrEmail.split('@')[0] : `User ${phoneOrEmail.slice(-4)}`,
          email: isEmail ? phoneOrEmail : undefined,
          phone: !isEmail ? phoneOrEmail : undefined,
          role: 'patient'
        });
        return { success: true };
      }
    }

    // Demo Mode OTP Verification (accepts 123456 or any 6 digits)
    if (token === '123456' || token.length === 6) {
      const isEmail = phoneOrEmail.includes('@');
      const mockUser: User = {
        id: 'u-otp-' + Date.now().toString(36),
        name: isEmail ? phoneOrEmail.split('@')[0] : `Caller ${phoneOrEmail.slice(-4)}`,
        email: isEmail ? phoneOrEmail : undefined,
        phone: !isEmail ? phoneOrEmail : undefined,
        role: 'patient',
        medical_profile: {
          blood_group: 'O+',
          allergies: 'None',
          conditions: 'None'
        }
      };
      setUser(mockUser);
      return { success: true };
    }

    return { success: false, message: 'Invalid OTP. For demo mode, enter 123456.' };
  };

  const setDemoRole = (role: UserRole, hospitalId?: string) => {
    const targetUser = DEMO_USERS.find(u => u.role === role) || {
      id: `u-${role}-demo`,
      name: `${role.toUpperCase()} Demo`,
      role,
      hospital_id: hospitalId || (role === 'hospital_staff' ? 'h1' : undefined)
    };
    setUser(targetUser);
  };

  const updateUserRole = async (newRole: UserRole) => {
    if (!user) return;
    const updated: User = { ...user, role: newRole };
    setUser(updated);

    if (isSupabaseActive && supabase) {
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        name: user.name,
        role: newRole,
        updated_at: new Date().toISOString()
      });
      logSupabaseError('user role upsert', error);
    }
  };

  const updateMedicalProfile = async (profile: Partial<MedicalProfile>) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      medical_profile: {
        ...user.medical_profile,
        ...profile
      }
    };
    setUser(updatedUser);

    if (isSupabaseActive && supabase) {
      const { error } = await supabase.from('medical_profiles').upsert({
        user_id: user.id,
        ...updatedUser.medical_profile,
        updated_at: new Date().toISOString()
      });
      logSupabaseError('medical profile update', error);
    }
  };

  const logout = async () => {
    if (isSupabaseActive && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    // Reset to patient demo
    setUser(DEMO_USERS[0]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'patient',
        isAuthenticated: !!user,
        isLoading,
        isSupabaseActive,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        resetPassword,
        sendOTP,
        verifyOTP,
        setDemoRole,
        updateUserRole,
        updateMedicalProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
