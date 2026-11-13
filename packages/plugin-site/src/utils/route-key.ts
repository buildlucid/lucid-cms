import normalizePath from "./normalize-path.js";

/**
 * Normalizes router paths to percent-encoded form without trailing slashes, equating `/café` and
 * `/caf%C3%A9`. Preserves existing escapes, including malformed ones.
 */
const routeKey = (path: string) => {
	const url = new URL("http://site");
	url.pathname = path;
	return normalizePath(url.pathname);
};

export default routeKey;
