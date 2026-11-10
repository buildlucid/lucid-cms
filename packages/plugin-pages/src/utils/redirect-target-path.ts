import normalizeRedirectPath from "./normalize-redirect-path.js";

/**
 * The path a redirect target on this site points at, as a browser would request it: dot segments
 * resolved, query and fragment dropped, then normalised. Null for full addresses.
 */
const redirectTargetPath = (target: string) => {
	if (!target.startsWith("/") || target.startsWith("//")) return null;

	const { pathname } = new URL(target, "http://lucid.local");
	try {
		return normalizeRedirectPath(decodeURIComponent(pathname));
	} catch {
		return normalizeRedirectPath(pathname);
	}
};

export default redirectTargetPath;
