import type { CollectionBuilder } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import type { DocumentVersionType, ServiceFn } from "@lucidcms/core/types";
import type { CollectionConfig } from "../types/types.js";
import buildRouteSegmentTargets from "../utils/build-route-segment-targets.js";
import getStoredRouteSegmentSelections from "./get-stored-route-segment-selections.js";
import resolveRouteSegmentValues from "./resolve-route-segment-values.js";

/** Resolves route prefixes for a batch of already-persisted page versions. */
const resolveStoredRoutePrefixes: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			versionType: Exclude<DocumentVersionType, "revision">;
			versionIds: number[];
		},
	],
	Map<number, Record<string, string | null>>
> = async (context, data) => {
	const versionIds = [...new Set(data.versionIds)];
	const sourceKeys = versionIds.map(String);
	if (versionIds.length === 0) {
		return { error: undefined, data: new Map() };
	}

	const selectionsRes = await getStoredRouteSegmentSelections(context, {
		collection: data.collection,
		sources: versionIds.map((versionId) => ({
			sourceKey: String(versionId),
			versionId,
		})),
	});
	if (selectionsRes.error) return selectionsRes;

	const { targets, missingRelation } = buildRouteSegmentTargets({
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		collections: context.config.collections,
		sourceKeys,
		selections: selectionsRes.data,
	});
	if (missingRelation) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.pages.route.segment.required"),
			},
			data: undefined,
		};
	}

	const prefixesRes = await resolveRouteSegmentValues(context, {
		collection: data.collection,
		versionType: data.versionType,
		targets,
		sourceKeys,
	});
	if (prefixesRes.error) return prefixesRes;

	return {
		error: undefined,
		data: new Map(
			versionIds.map((versionId) => [
				versionId,
				prefixesRes.data.get(String(versionId)) ?? {},
			]),
		),
	};
};

export default resolveStoredRoutePrefixes;
