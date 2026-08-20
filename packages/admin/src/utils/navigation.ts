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
