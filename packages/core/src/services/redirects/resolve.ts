import type {
	RedirectLookup,
	ResolvedRedirect,
} from "../../libs/redirects/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Redirects to other paths on the site are followed this many times before the last one is sent. */
const MAX_REDIRECT_HOPS = 5;

/**
 * The path a location on this site points at, as a browser would request it: dot segments resolved,
 * query and fragment dropped. Null for full addresses.
 */
const sitePath = (location: string) => {
	if (!location.startsWith("/") || location.startsWith("//")) return null;

	const { pathname } = new URL(location, "http://lucid.local");
	try {
		return decodeURIComponent(pathname);
	} catch {
		return pathname;
	}
};

/**
 * Uses the first matching resolver and follows same-site chains, preserving the first status.
 * Stops at queries or fragments, retaining them. Revisited paths return null as loops, even with a
 * query.
 */
const resolve: ServiceFn<[RedirectLookup], ResolvedRedirect | null> = async (
	context,
	data,
) => {
	const visited = new Set([data.path]);
	const hops: ResolvedRedirect[] = [];
	let path = data.path;

	for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
		let next: ResolvedRedirect | null = null;
		for (const resolver of context.config.redirects) {
			const result = await resolver(context, { ...data, path });
			if (result.error) return result;
			if (result.data) {
				next = result.data;
				break;
			}
		}
		if (!next) break;
		hops.push(next);

		const nextPath = sitePath(next.location);
		if (nextPath === null) break;
		if (visited.has(nextPath)) return { error: undefined, data: null };
		//* a query string, fragment or dot segment changes the location, so it's sent as given rather than followed
		if (nextPath !== next.location) break;
		visited.add(nextPath);
		path = nextPath;
	}

	const first = hops[0];
	const last = hops.at(-1);
	return {
		error: undefined,
		data:
			first && last ? { location: last.location, status: first.status } : null,
	};
};

export default resolve;
