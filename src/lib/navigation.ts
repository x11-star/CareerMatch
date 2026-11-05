export const views = ['landing', 'upload', 'assessment', 'assessment-result', 'results', 'detail', 'browser', 'profile'] as const;
export type ViewType = typeof views[number];
export function readRoute(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const positionId = params.get('position') || '';
  const requested = params.get('view');
  const view: ViewType = positionId ? 'detail' : views.includes(requested as ViewType) && requested !== 'detail' ? requested as ViewType : 'landing';
  return { view, positionId };
}
export function routeHash(view: ViewType, positionId = '') {
  return '#' + new URLSearchParams(view === 'detail' && positionId ? { position: positionId } : { view }).toString();
}
export function publicShareUrl(href: string, positionId?: string) {
  const url = new URL(href);
  url.search = '';
  url.hash = positionId ? routeHash('detail', positionId) : routeHash('landing');
  return url.toString();
}
