function compilePath(path) {
  const segments = path.split('/').filter(Boolean);
  const names = [];
  const pattern = segments.map(segment => {
    if (segment.startsWith(':')) {
      names.push(segment.slice(1));
      return '([^/]+)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return { regex: new RegExp(`^/${pattern.join('/')}/?$`), names };
}

export function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    if (typeof method !== 'string' || typeof path !== 'string' || typeof handler !== 'function') {
      throw new TypeError('Route requires a method, path, and handler');
    }
    const compiled = compilePath(path);
    routes.push({ method: method.toUpperCase(), path, handler, ...compiled });
    return router;
  }

  function match(method, pathname) {
    const requestMethod = method.toUpperCase();
    for (const route of routes) {
      if (route.method !== requestMethod) continue;
      const result = route.regex.exec(pathname);
      if (!result) continue;
      const params = {};
      try {
        route.names.forEach((name, index) => {
          params[name] = decodeURIComponent(result[index + 1]);
        });
      } catch {
        return { error: 'BAD_PATH_ENCODING' };
      }
      return { handler: route.handler, params, route: route.path };
    }
    return null;
  }

  const router = { add, match };
  return router;
}
