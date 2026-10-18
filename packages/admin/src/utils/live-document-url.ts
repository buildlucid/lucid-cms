import type { Collection, InternalCollectionDocument } from "@types";

/** Resolves the document's live path on the site origin using the final environment or latest when none exist, returning null without a site, publication or path. */
export const getLiveDocumentUrl = (props: {
	siteUrl: string | null;
	environments: Pick<Collection["publishing"]["environments"][number], "key">[];
	document: Pick<
		InternalCollectionDocument,
		"route" | "versions" | "isDeleted"
	>;
	locale: string | null;
}): string | null => {
	const { route, versions, isDeleted } = props.document;
	if (!props.siteUrl || !route || isDeleted) return null;

	const liveVersion = props.environments.at(-1)?.key ?? "latest";
	if (!versions[liveVersion]) return null;

	const path =
		typeof route.path === "string"
			? route.path
			: props.locale
				? route.path[props.locale]
				: null;
	if (!path) return null;

	const url = new URL("/", props.siteUrl);
	url.pathname = path.startsWith("/") ? path : `/${path}`;
	return url.toString();
};
