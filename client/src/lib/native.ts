import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function useNativeLifecycle() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Configure Status Bar
    void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    void StatusBar.setBackgroundColor({ color: '#01070a' }).catch(() => {});

    // Hide Splash Screen once React is ready
    void SplashScreen.hide().catch(() => {});

    // Handle Android hardware back button
    const backListenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      const path = location.pathname;
      if (path === '/app/day' || path === '/login' || path === '/') {
        void CapApp.exitApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        navigate('/app/day');
      }
    });

    return () => {
      void backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [navigate, location.pathname]);
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Initialize current status
    void Network.getStatus().then((status) => {
      if (isMounted) setIsOnline(status.connected);
    }).catch(() => {
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        if (isMounted) setIsOnline(navigator.onLine);
      }
    });

    // Listen to network changes
    const listenerPromise = Network.addListener('networkStatusChange', (status) => {
      if (isMounted) setIsOnline(status.connected);
    });

    const handleWebOnline = () => { if (isMounted) setIsOnline(true); };
    const handleWebOffline = () => { if (isMounted) setIsOnline(false); };

    window.addEventListener('online', handleWebOnline);
    window.addEventListener('offline', handleWebOffline);

    return () => {
      isMounted = false;
      void listenerPromise.then((handle) => handle.remove()).catch(() => {});
      window.removeEventListener('online', handleWebOnline);
      window.removeEventListener('offline', handleWebOffline);
    };
  }, []);

  return isOnline;
}

