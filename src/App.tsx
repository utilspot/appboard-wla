import ApplicationPage from './components/ApplicationPage';
import ApplicationsPage from './components/ApplicationsPage';
import { applicationSlugFromRoute, useRoute } from './router';

export default function App() {
  const route = useRoute();
  const slug = applicationSlugFromRoute(route);

  return slug ? <ApplicationPage slug={slug} /> : <ApplicationsPage />;
}
