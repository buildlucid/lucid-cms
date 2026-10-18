import classnames from "classnames";

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

	if (exact || linkPath === "/admin") return currentPath === linkPath;

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

export type NavigationActionVariant = "icon" | "tile";

/** Classes for the navigation header actions: bare icons beside the logo, or bordered tiles in the row below it. */
export const getNavigationActionClasses = (props: {
	variant?: NavigationActionVariant;
	size?: "sm" | "md";
}) =>
	classnames(
		"relative flex items-center justify-center text-icon transition-colors hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary aria-pressed:text-icon-hover data-expanded:text-icon-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-icon",
		props.variant === "tile"
			? "h-8 w-full rounded-lg border border-border bg-input hover:bg-secondary-hover aria-pressed:bg-secondary-hover data-expanded:bg-secondary-hover dark:hover:bg-card dark:aria-pressed:bg-card dark:data-expanded:bg-card disabled:hover:bg-input dark:disabled:hover:bg-input"
			: [
					"shrink-0 rounded-md hover:bg-background-hover aria-pressed:bg-background-hover data-expanded:bg-background-hover disabled:hover:bg-transparent",
					props.size === "md" ? "size-9" : "size-8",
				],
	);
