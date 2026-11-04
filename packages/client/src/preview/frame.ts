//* the builder's side of these lives in `@lucidcms/admin`: the names it gives its preview frame, and the query parameter holding the token
const frameNames = new Set([
	"lucid-builder-preview:perspective",
	"lucid-builder-preview:scoped",
]);
const tokenQueryParam = "preview";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

const isEmbedded = (targetWindow: Window): boolean => {
	try {
		return targetWindow.self !== targetWindow.top;
	} catch {
		return true;
	}
};

/** Whether a window is the frame the builder names for its preview. */
export const isBuilderPreviewFrame = (targetWindow: Window): boolean =>
	isEmbedded(targetWindow) && frameNames.has(targetWindow.name);

/** Reads the preview token from the page's URL. */
export const resolvePreviewToken = (targetWindow: Window): string | null => {
	const token = new URL(targetWindow.location.href).searchParams.get(
		tokenQueryParam,
	);
	return token && tokenPattern.test(token) ? token : null;
};
