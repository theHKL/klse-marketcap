'use client';

import { useState } from 'react';
import WatchlistStar from '@/components/ui/WatchlistStar';
import LoginModal from '@/components/auth/LoginModal';

export default function DetailWatchlistStar({ securityId }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <WatchlistStar
        securityId={securityId}
        size="lg"
        onAuthRequired={() => setShowLoginModal(true)}
      />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}
