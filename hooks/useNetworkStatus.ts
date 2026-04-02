import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface NetworkStatus {
  isConnected: boolean;
  /** true tant que le premier check n'est pas terminé */
  isLoading: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Récupération de l'état initial
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
      setIsLoading(false);
    });

    // Abonnement aux changements de connectivité
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    return unsubscribe;
  }, []);

  return { isConnected, isLoading };
}
