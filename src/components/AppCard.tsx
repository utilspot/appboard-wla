import type { Application } from '../types';
import { hrefFor, useLinkHandler } from '../router';
import { slugify } from '../slug';
import AppIcon from './AppIcon';

interface AppCardProps {
  application: Application;
}

export default function AppCard({ application }: AppCardProps) {
  const { title, description, icon, version, main } = application;
  const route = `/apps/${slugify(title)}`;
  const onClick = useLinkHandler(route);

  // `main` is the application's own entry point: choosing the card follows it
  // as an ordinary link, leaving the board. Without one there is nothing to
  // open, so the card opens this app's detail page client-side instead.

  return (
    <li>
      <a className="app-card" href={main ?? hrefFor(route)} onClick={main ? undefined : onClick}>
        <AppIcon icon={icon} title={title} />
        <div className="app-card-body">
          <h2 className="app-name">
            {title}
            {version && <span className="app-version">v{version}</span>}
          </h2>
          <p className="app-description">{description}</p>
        </div>
      </a>
    </li>
  );
}
