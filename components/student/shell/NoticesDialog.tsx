'use client';

import React, { useEffect, useState } from 'react';
import { PanelDialog } from '@/components/layout/PanelDialog';
import { NotificationList } from '@/components/layout/NotificationList';
import { panelApi } from '@/components/layout/panel-ui';

/** Quantidade de avisos não lidos (atualiza ao voltar para a aba e a cada minuto). */
export function useUnreadNotices(version = 0) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.hidden) return;
      panelApi<{ unread: number }>('/api/notifications', { signal: controller.signal })
        .then((d) => setUnread(d.unread))
        .catch(() => undefined);
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [version]);
  return unread;
}

export function NoticesDialog({ onClose, onRead }: { onClose: () => void; onRead: () => void }) {
  return (
    <PanelDialog title="Avisos" onClose={onClose}>
      <NotificationList onNavigate={onClose} onRead={onRead} />
    </PanelDialog>
  );
}
