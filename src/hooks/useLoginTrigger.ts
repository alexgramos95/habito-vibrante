import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { loadState } from '@/data/storage';

const LOGIN_TRIGGER_THRESHOLD = 2; // Trigger login modal when user has 2+ habits

export const useLoginTrigger = () => {
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasTriggeredLogin, setHasTriggeredLogin] = useState(() => {
    try {
      return localStorage.getItem('become-login-triggered') === 'true';
    } catch {
      return false;
    }
  });

  const checkLoginTrigger = useCallback(() => {
    // Don't trigger if already authenticated or already triggered this session
    if (isAuthenticated || hasTriggeredLogin) {
      return false;
    }

    const state = loadState();
    const habitCount = state.habits.filter(h => h.active).length;

    if (habitCount >= LOGIN_TRIGGER_THRESHOLD) {
      setShowLoginModal(true);
      setHasTriggeredLogin(true);
      try {
        localStorage.setItem('become-login-triggered', 'true');
      } catch {
        // Ignore localStorage errors
      }
      return true;
    }

    return false;
  }, [isAuthenticated, hasTriggeredLogin]);

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const resetLoginTrigger = useCallback(() => {
    setHasTriggeredLogin(false);
    try {
      localStorage.removeItem('become-login-triggered');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return {
    showLoginModal,
    checkLoginTrigger,
    closeLoginModal,
    resetLoginTrigger,
  };
};
