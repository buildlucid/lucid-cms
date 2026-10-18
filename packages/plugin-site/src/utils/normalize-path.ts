/** Drops a trailing slash, except from the root path. */
const normalizePath = (path: string) =>
	path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

export default normalizePath;
