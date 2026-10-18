import { LucidAPIError } from "@lucidcms/core";
import type { Toolkit } from "@lucidcms/core/types";
import getRouteUrls from "./get-route-urls.js";

/** Every route path of a collection's documents in one version, across locales. */
const listDocumentPaths = async (
	toolkit: Toolkit,
	collectionKey: string,
	version: string,
): Promise<string[]> => {
	const response = await toolkit.documents.getMultiple({
		collectionKey,
		version,
		query: { perPage: -1 },
	});
	if (response.error) throw new LucidAPIError(response.error);

	return response.data.data.flatMap((document) =>
		// The locale only keys a path every locale shares, which is listed once either way.
		Object.values(getRouteUrls(document.route, "")),
	);
};

export default listDocumentPaths;
