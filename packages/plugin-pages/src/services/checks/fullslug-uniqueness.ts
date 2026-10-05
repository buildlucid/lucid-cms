import { copy } from "@lucidcms/core";
import type {
	CollectionTableNames,
	ErrorCopy,
	FieldError,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import type {
	CollectionConfig,
	ProjectedFullSlug,
	RouteScope,
} from "../../types/types.js";
import findRouteConflicts from "../find-route-conflicts.js";

/** Rejects a write whose projected routes collide with each other or with stored routes in the scope. */
const checkFullSlugUniqueness: ServiceFn<
	[
		{
			collection: CollectionConfig;
			projectedFullSlugs: ProjectedFullSlug[];
			scope: RouteScope;
			tables: CollectionTableNames;
			excludeDocumentIds?: number[];
			duplicateMessage?: ErrorCopy;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const conflictsRes = await findRouteConflicts(context, data);
		if (conflictsRes.error) return conflictsRes;
		if (conflictsRes.data.length === 0) {
			return { error: undefined, data: undefined };
		}

		const message =
			data.duplicateMessage ?? copy("server:plugin.pages.full.slug.duplicate");
		const fieldErrors: FieldError[] = conflictsRes.data.map((conflict) => ({
			key: constants.fields.slug.key,
			localeCode: conflict.locale,
			message,
		}));

		return {
			error: {
				type: "basic",
				status: 400,
				message,
				errors: { fields: fieldErrors },
			},
			data: undefined,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.full.slug.duplicate.check.failed"),
			},
			data: undefined,
		};
	}
};

export default checkFullSlugUniqueness;
