/** Dev panel + flow controls — only when `?debug=true` */
export function isDebugMode(): boolean {
  return new URLSearchParams(window.location.search).get('debug') === 'true';
}
