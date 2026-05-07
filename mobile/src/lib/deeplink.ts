/**
 * Faz 5.B.4.2 — Push notification tap deeplink yönetimi.
 *
 * Push'tan gelen `data.deeplink` cold-start sırasında NavigationContainer
 * henüz ready olmamış olabilir. Bu modül pending state'i tutar; container
 * ready olunca onReady callback'inden `flushPendingDeeplinkOnReady` çağrılır.
 */
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { markAutomationSeen } from './automations';

let _pending: string | null = null;
let _navRef: NavigationContainerRefWithCurrent<any> | null = null;

export function setNavigationRef(ref: NavigationContainerRefWithCurrent<any>) {
  _navRef = ref;
}

function navigate(deeplink: string) {
  if (!_navRef?.isReady()) return;
  if (deeplink.startsWith('/weekly')) {
    _navRef.navigate('App' as never, { screen: 'Weekly' } as never);
  } else if (deeplink.startsWith('/stats')) {
    _navRef.navigate('App' as never, { screen: 'Stats' } as never);
  } else if (deeplink.startsWith('/')) {
    _navRef.navigate('App' as never, { screen: 'Tasks' } as never);
  }
}

export function handleNotificationDeeplink(
  data: Record<string, unknown> | null | undefined,
) {
  if (!data) return;
  const deeplink = typeof data.deeplink === 'string' ? data.deeplink : null;
  const executionId =
    typeof data.execution_id === 'number' ? data.execution_id : Number(data.execution_id ?? 0);
  if (executionId > 0) {
    void markAutomationSeen(executionId);
  }
  if (!deeplink) return;
  if (!_navRef?.isReady()) {
    _pending = deeplink;
    return;
  }
  navigate(deeplink);
}

export function flushPendingDeeplinkOnReady() {
  if (_pending && _navRef?.isReady()) {
    const dl = _pending;
    _pending = null;
    navigate(dl);
  }
}
