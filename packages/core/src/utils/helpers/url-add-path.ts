/**
 * Joins a path to a URL ensuring we dont add a double slash
 */
const urlAddPath = (url: string, path?: string): string => {
	const urlNoSlash = url.endsWith("/") ? url.slice(0, -1) : url;
	if (!path) return urlNoSlash;

	return `${urlNoSlash}${path.startsWith("/") ? path : `/${path}`}`;
};

export default urlAddPath;
