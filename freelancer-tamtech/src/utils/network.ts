

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

let isOnline = true;

export function initNetworkListener(
  onStatusChange?: (online: boolean) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const online = !!(state.isConnected ?? true);
    isOnline = online;
    if (onStatusChange) onStatusChange(online);
  });
  return unsubscribe;
}

export async function checkNetwork(): Promise<boolean> {
  const state = await NetInfo.fetch();
  isOnline = !!(state.isConnected ?? true);
  return isOnline;
}

export function getIsOnline(): boolean {
  return isOnline;
}
