import { useState, useEffect } from 'react';
import KladezLogo from '~/components/KladezLogo';

// Fading Image Component
const FadingImage = ({ className = "" }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    // Start fading out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    // Remove from DOM after fade out completes
    const removeTimer = setTimeout(() => {
      setShouldShow(false);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`fixed inset-0 flex justify-center items-center bg-desert-sand z-50 pointer-events-none transition-opacity duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <KladezLogo className={className} />
    </div>
  );
};

export default FadingImage;