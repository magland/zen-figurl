import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type Route =
  | {
      page: 'home';
    }
  | {
      page: 'site';
      siteUri: string;
      kacheryZone?: string;
    };

type RoutePath = '/home' | '/s';
export const isRoutePath = (x: string): x is RoutePath => {
  if (['/home', '/s'].includes(x)) return true;
  return false;
};

export const useRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const p = location.pathname;
  const routePath: RoutePath = isRoutePath(p) ? p : '/home';

  const query = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q;
  }, [location.search]);

  const route: Route = useMemo<Route>(() => {
    if (routePath === '/home') {
      return { page: 'home' };
    } else if (routePath === '/s') {
      const siteUri = query.get('site') || '';
      const kacheryZone = query.get('zone') || undefined;
      return { page: 'site', siteUri, kacheryZone };
    } else {
      return { page: 'home' };
    }
  }, [routePath, query]);

  const setRoute = useCallback(
    (r: Route) => {
      if (r.page === 'home') {
        navigate('/home');
      } else if (r.page === 'site') {
        navigate(`/s?siteUri=${r.siteUri}`);
      }
    },
    [navigate]
  );

  return { route, setRoute };
};
