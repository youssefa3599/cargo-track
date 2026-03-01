'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authAPI, User } from '@/lib/api';

// ==================== TYPES ====================
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (userData: RegisterData) => Promise<AuthResult>;
  logout: () => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isAuthenticated: boolean;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  companyName?: string;
  role?: string;
}

// ==================== CONTEXT ====================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ==================== PROVIDER ====================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const storedToken = Cookies.get('token');
      const userData = Cookies.get('user');

      if (storedToken && userData && userData !== 'undefined') {
        setToken(storedToken);
        setUser(JSON.parse(userData));
        console.log('✅ [AuthContext] User restored from cookies');
      } else {
        setToken(null);
        setUser(null);
        console.log('⚠️ [AuthContext] No valid session found');
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error checking auth:', error);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await authAPI.login({ email, password });
      const apiResponse = response.data as any;

      // Extract token and user
      let newToken: string | undefined;
      let userData: any;

      if (apiResponse.data && apiResponse.data.token) {
        newToken = apiResponse.data.token;
        userData = apiResponse.data.user;
      } else if (apiResponse.token) {
        newToken = apiResponse.token;
        userData = apiResponse.user;
      } else {
        throw new Error('No token found in API response');
      }

      if (!newToken) throw new Error('No token received from server');
      if (!userData) throw new Error('No user data received from server');

      const cookieOptions = {
        expires: 7,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };

      // Store REAL token in readable cookie
      Cookies.set('token', newToken, cookieOptions);
      Cookies.set('user', JSON.stringify(userData), cookieOptions);

      setToken(newToken);
      setUser(userData);

      console.log('✅ [AuthContext] Login successful');
      router.push('/');
      return { success: true };

    } catch (error: any) {
      console.error('❌ [AuthContext] Login error:', error?.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed',
      };
    }
  };

  const register = async (userData: RegisterData): Promise<AuthResult> => {
    try {
      await authAPI.register(userData);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Registration failed',
      };
    }
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const isAdmin = (): boolean => user?.role === 'admin';
  const isStaff = (): boolean => user?.role === 'staff';

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isStaff,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};