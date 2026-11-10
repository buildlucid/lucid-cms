import type { ServiceFn } from "@lucidcms/core/types";
import type { CollectionConfig, RouteScope } from "../types/types.js";
import type { PageVersionFields } from "./get-pages-fields.js";
import recordPaths from "./record-paths.js";

/**
 * Records the paths page versions have stored, so pages published before tracking started, or before
 * history was cleared, redirect once their path changes.
 */
const recordStoredPaths: ServiceFn<
	[
		{
			collection: CollectionConfig;
			scope: RouteScope;
			versions: PageVersionFields[];
			localized: boolean;
		},
	],
	undefined
> = (context, data) =>
	recordPaths(context, {
		collection: data.collection,
		scope: data.scope,
		values: data.versions.map((version) => ({
			documentId: version.document_id,
			versionId: version.document_version_id,
			values: new Map(
				version.rows
					.filter((row) =>
						data.localized ? row.locale !== null : row.locale === null,
					)
					.map((row) => [row.locale, row._path]),
			),
		})),
	});

export default recordStoredPaths;
