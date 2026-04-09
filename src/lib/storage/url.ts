export function joinPublicPath(pathname: string) {
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
