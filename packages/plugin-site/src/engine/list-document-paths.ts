import { LucidAPIError } from "@lucidcms/core";
import type { Toolkit } from "@lucidcms/core/types";

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

	return response.data.data.flatMap((document) => {
		const routePath = document.route?.path;
		if (typeof routePath === "string") return [routePath];
		if (typeof routePath === "object" && routePath !== null) {
			return Object.values(routePath).filter(
				(value): value is string => typeof value === "string",
			);
		}
		return [];
	});
};

export default listDocumentPaths;
