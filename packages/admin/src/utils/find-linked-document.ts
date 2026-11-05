import type { Collection, InternalCollectionDocument } from "@types";
import { getMultipleReq } from "@/services/api/documents/useGetMultiple";

/** A document a link on the previewed site goes to. */
export type LinkedDocument = {
	collection: Collection;
	document: InternalCollectionDocument;
	/** The content locale the link's path is the document's route in, or null when every locale shares it. */
	locale: string | null;
};

/** The route paths a link's address could be stored as: without the site's base path, and with or without a trailing slash. */
const toRoutePaths = (url: URL, siteUrl: string | null) => {
	let path = url.pathname;
	try {
		path = decodeURI(path);
	} catch {
		//* a malformed escape is looked up as it's written
	}
	const site = siteUrl ? new URL(siteUrl) : null;
	const base = site?.pathname.replace(/\/+$/, "") ?? "";
	if (site?.origin === url.origin && base && path.startsWith(`${base}/`)) {
		path = path.slice(base.length);
	}
	const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
	return trimmed === "/" ? ["/"] : [trimmed, `${trimmed}/`];
};

/**
 * Matches a site link to a document route in the supplied readable collections. Returns null if
 * unmatched.
 */
export const findLinkedDocument = async (props: {
	url: URL;
	siteUrl: string | null;
	collections: Collection[];
}): Promise<LinkedDocument | null> => {
	const paths = toRoutePaths(props.url, props.siteUrl);
	const matches = await Promise.all(
		props.collections.map(async (collection) => {
			if (!collection.routing) return null;
			try {
				const response = await getMultipleReq({
					collectionKey: collection.key,
					versionType: "latest",
					query: {
						filters: { [`_${collection.routing.field}:in`]: paths },
						perPage: 1,
					},
					displayErrorToast: false,
				});
				const document = response.data[0];
				return document ? { collection, document } : null;
			} catch {
				return null;
			}
		}),
	);
	const match = matches.find((item) => item !== null);
	if (!match) return null;

	const routePath = match.document.route?.path;
	const locale =
		routePath && typeof routePath === "object"
			? (Object.entries(routePath).find(
					([, path]) => typeof path === "string" && paths.includes(path),
				)?.[0] ?? null)
			: null;
	return { ...match, locale };
};
