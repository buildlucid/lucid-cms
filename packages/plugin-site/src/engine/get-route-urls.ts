type Route = {
	path: string | Record<string, string | null>;
} | null;

/** A route's path in each locale; a path every locale shares is listed under the given locale. */
const getRouteUrls = (
	route: Route | undefined,
	locale: string,
): Record<string, string> => {
	const routePath = route?.path;
	if (typeof routePath === "string") return { [locale]: routePath };
	if (!routePath) return {};

	return Object.fromEntries(
		Object.entries(routePath).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string",
		),
	);
};

export default getRouteUrls;
