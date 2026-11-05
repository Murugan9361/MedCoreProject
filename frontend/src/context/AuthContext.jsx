import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('medcore_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify session on application mount
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      const existingToken = localStorage.getItem('medcore_token');
      if (existingToken) {
        try {
          const profile = await authApi.getMe();
          if (isMounted) {
            const cachedUser = JSON.parse(localStorage.getItem('medcore_user') || '{}');
            const mergedProfile = {
              ...profile,
              must_change_password: Boolean(
                profile.must_change_password !== undefined
                  ? profile.must_change_password
                  : cachedUser.must_change_password
              ),
            };
            setUser(mergedProfile);
            setToken(existingToken);
            localStorage.setItem('medcore_user', JSON.stringify(mergedProfile));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          if (isMounted) {
            logout();
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('medcore:unauthorized', handleUnauthorized);
    initSession();

    return () => {
      isMounted = false;
      window.removeEventListener('medcore:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials) => {
    // 1. Authenticate with backend: POST /auth/login
    const data = await authApi.login(credentials);
    const accessToken = data.access_token || data.token;
    if (!accessToken) {
      throw new Error('Authentication succeeded but no access token was returned.');
    }

    // 2. Persist access token immediately so subsequent requests attach it
    localStorage.setItem('medcore_token', accessToken);
    setToken(accessToken);

    // 3. Retrieve verified user profile: GET /auth/me
    const profile = await authApi.getMe();
    const mergedProfile = {
      ...profile,
      must_change_password: Boolean(data.must_change_password ?? profile.must_change_password),
    };
    setUser(mergedProfile);
    localStorage.setItem('medcore_user', JSON.stringify(mergedProfile));

    return mergedProfile;
  };

  const completePasswordChange = async (email, newPassword) => {
    // Authenticate with new password to get updated JWT with fresh token_version
    const profile = await login({ email, password: newPassword });
    const updatedProfile = { ...profile, must_change_password: false };
    setUser(updatedProfile);
    localStorage.setItem('medcore_user', JSON.stringify(updatedProfile));
    return updatedProfile;
  };

  const logout = () => {
    localStorage.removeItem('medcore_token');
    localStorage.removeItem('medcore_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token && !loading,
    mustChangePassword: Boolean(user?.must_change_password),
    role: user?.role?.toLowerCase() || null,
    login,
    completePasswordChange,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
