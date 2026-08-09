import type { CollectionBuilder } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import type {
	DocumentVersionType,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import type {
	CollectionConfig,
	RouteSegmentSelection,
} from "../types/types.js";
import buildRouteSegmentTargets from "../utils/build-route-segment-targets.js";
import getStoredRouteSegmentSelections from "./get-stored-route-segment-selections.js";
import resolveRouteSegmentValues from "./resolve-route-segment-values.js";

const currentSourceKey = "current";

/** Resolves the static and relation-derived prefix for one page document. */
const resolveRoutePrefix: ServiceFn<
	[
		{
			collection: CollectionConfig;
			collectionInstance: CollectionBuilder;
			versionType: Exclude<DocumentVersionType, "revision">;
			fields?: FieldInputSchema[];
			versionId?: number;
		},
	],
	Record<string, string | null>
> = async (context, data) => {
	const storedSelections =
		data.fields === undefined && data.versionId !== undefined
			? await getStoredRouteSegmentSelections(context, {
					collection: data.collection,
					sources: [
						{
							sourceKey: currentSourceKey,
							versionId: data.versionId,
						},
					],
				})
			: undefined;
	if (storedSelections?.error) return storedSelections;

	const selections: RouteSegmentSelection[] =
		storedSelections?.data ??
		data.collection.segments.map((segment, index) => {
			const value = data.fields?.find((field) => field.key === segment.relation)
				?.value as Array<{ id: number; collectionKey: string }> | undefined;

			return {
				sourceKey: currentSourceKey,
				index,
				collectionKey: value?.[0]?.collectionKey,
				documentId: value?.[0]?.id,
			};
		});

	const { targets, missingRelation } = buildRouteSegmentTargets({
		collection: data.collection,
		collectionInstance: data.collectionInstance,
		collections: context.config.collections,
		sourceKeys: [currentSourceKey],
		selections,
	});

	if (missingRelation) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.pages.route.segment.required"),
				errors: {
					fields: [
						{
							key: missingRelation,
							message: copy("server:plugin.pages.route.segment.required"),
						},
					],
				},
			},
			data: undefined,
		};
	}

	const prefixesRes = await resolveRouteSegmentValues(context, {
		collection: data.collection,
		versionType: data.versionType,
		targets,
		sourceKeys: [currentSourceKey],
	});
	if (prefixesRes.error) return prefixesRes;

	return {
		error: undefined,
		data: prefixesRes.data.get(currentSourceKey) ?? {},
	};
};

export default resolveRoutePrefix;
