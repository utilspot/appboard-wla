import { useEffect, useState } from 'react';

interface AppIconProps {
  /** Icon image path as returned by the API, e.g. `/icons/mail.svg`. */
  icon: string;
  title: string;
}

/** Shows the application's icon image, falling back to its initial. */
export default function AppIcon({ icon, title }: AppIconProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [icon]);

  if (!icon || failed) {
    return (
      <div className="app-icon app-icon-fallback" aria-hidden="true">
        {title.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="app-icon">
      <img src={icon} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
