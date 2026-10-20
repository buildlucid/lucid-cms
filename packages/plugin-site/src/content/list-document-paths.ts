import { LucidAPIError } from "@lucidcms/core";
import type { Toolkit } from "@lucidcms/core/types";

/** Lists a collection's document paths for one version and the given locales, including shared paths once. */
const listDocumentPaths = async (
	toolkit: Toolkit,
	collectionKey: string,
	version: string,
	locales: ReadonlySet<string>,
): Promise<string[]> => {
	const response = await toolkit.documents.getMultiple({
		collectionKey,
		version,
		query: { perPage: -1 },
	});
	if (response.error) throw new LucidAPIError(response.error);

	return response.data.items.flatMap((document) => {
		const path = document.route?.path;
		if (typeof path === "string") return [path];

		return Object.entries(path ?? {}).flatMap(([locale, value]) =>
			value && locales.has(locale) ? [value] : [],
		);
	});
};

export default listDocumentPaths;
