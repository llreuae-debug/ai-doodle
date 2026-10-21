import { useEffect, useState } from 'react';
import { getConsentPreferences, subscribeToConsent } from './consent';

interface AdSlotProps {
  slotId?: string;
  format?: 'horizontal' | 'rectangle' | 'in-article';
  className?: string;
}

export function AdSlot({ slotId, format = 'horizontal', className = '' }: AdSlotProps) {
  const [advertisingConsent, setAdvertisingConsent] = useState(() => {
    return getConsentPreferences()?.advertising ?? false;
  });

  useEffect(() => {
    return subscribeToConsent((prefs) => {
      setAdvertisingConsent(prefs.advertising);
    });
  }, []);

  // Determine placeholder min-height based on standard IAB formats to prevent CLS
  const minHeight = format === 'rectangle' ? 250 : format === 'in-article' ? 120 : 90;

  // Check if official AdSense Publisher ID is configured in window/env
  const publisherId = typeof window !== 'undefined' ? (window as any).ADSENSE_PUBLISHER_ID : undefined;

  return (
    <aside
      className={`ad-slot-container ad-format-${format} ${className}`}
      aria-label="Sponsor Advertisement"
      style={{ minHeight: `${minHeight}px` }}
    >
      <div className="ad-slot-inner">
        <span className="ad-slot-badge" aria-hidden="true">
          Advertisement
        </span>

        {publisherId && advertisingConsent && slotId ? (
          // When publisher ID and user consent exist, official ins tag is rendered
          <ins
            className="adsbygoogle"
            style={{ display: 'block', minHeight: `${minHeight - 20}px` }}
            data-ad-client={publisherId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          // Clean, unobtrusive placeholder keeping layout stable without deceptive content
          <div className="ad-placeholder-note" aria-hidden="true">
            <span>Ai Doodle Community Sponsor Space</span>
          </div>
        )}
      </div>
    </aside>
  );
}
