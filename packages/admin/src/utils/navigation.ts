const normalizeNavigationPath = (path: string) => {
	const pathOnly = path.split(/[?#]/, 1)[0] || "/";
	let decodedPath = pathOnly;

	try {
		decodedPath = decodeURI(pathOnly);
	} catch {
		// Keep malformed paths comparable instead of breaking navigation rendering.
	}

	const normalizedPath = decodedPath.toLowerCase().replace(/\/+$/, "");
	return normalizedPath || "/";
};

export const isNavigationLinkActive = (
	pathname: string,
	href: string,
	exact = false,
) => {
	const currentPath = normalizeNavigationPath(pathname);
	const linkPath = normalizeNavigationPath(href);

	if (exact || linkPath === "/lucid") return currentPath === linkPath;

	return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
};

export const setNavigationLinkActiveState = (
	link: HTMLAnchorElement,
	active: boolean,
) => {
	link.classList.toggle("navigation-link-active", active);
	if (active) {
		link.setAttribute("aria-current", "page");
	} else {
		link.removeAttribute("aria-current");
	}
};

/** Whether a click asks for a link somewhere other than in place, eg. in a new tab. */
export const isModifiedClick = (event: MouseEvent) =>
	event.button !== 0 ||
	event.metaKey ||
	event.ctrlKey ||
	event.shiftKey ||
	event.altKey;
