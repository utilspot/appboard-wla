import type { Application } from '../types';
import { slugify } from '../slug';
import AppCard from './AppCard';

interface AppListProps {
  applications: Application[];
}

export default function AppList({ applications }: AppListProps) {
  if (applications.length === 0) {
    return <p className="state-message">No applications in this set.</p>;
  }

  return (
    <ul className="app-list">
      {applications.map((application) => (
        <AppCard key={slugify(application.title)} application={application} />
      ))}
    </ul>
  );
}
