import T from "../../../translations/index.js";
import logger from "../../../utils/logging/index.js";
import Repository from "../../../libs/repositories/index.js";
import type {
	CFResponse,
	FieldTypes,
	ServiceContext,
	ServiceFn,
} from "../../../types.js";
import type { FieldRelationValues } from "./extract-related-entity-ids.js";

export type FieldRelationResponse = Partial<
	Record<FieldTypes, Array<CFResponse<FieldTypes>["meta"]>>
>;

/**
 * Responsible for fetching all of the relation data for a documnet based on what is extracted from field data and config
 *
 * @todo For custom custom field support down the line - relation data fetch logic should be moved to custom field instances. Active custom fields would need to be registered in config.
 */
const fetchRelationData: ServiceFn<
	[
		{
			values: FieldRelationValues;
		},
	],
	FieldRelationResponse
> = async (context, data) => {
	const response: FieldRelationResponse = {};
	const fetchPromises: Promise<void>[] = [];

	await Promise.all(fetchPromises);

	return {
		data: response,
		error: undefined,
	};
};

/**
 * Fetches media data for all media entries
 */
async function fetchMediaData(
	context: ServiceContext,
	mediaEntries: Array<{ table: string; values: Set<unknown> }>,
): Promise<Array<CFResponse<"media">["meta"]>> {
	const Media = Repository.get("media", context.db, context.config.db);
	const mediaResponses: Array<CFResponse<"media">["meta"]> = [];

	for (const mediaEntry of mediaEntries) {
		if (mediaEntry.values.size === 0) continue;

		const mediaIds = Array.from(mediaEntry.values).filter(
			(id) => id !== null && id !== undefined,
		) as number[];
		if (mediaIds.length === 0) continue;

		const mediaRes = await Media.selectMultiple({
			select: ["id"],
			where: [
				{
					key: "id",
					operator: "in",
					value: mediaIds,
				},
			],
			validation: {
				enabled: true,
			},
		});
		if (mediaRes.error) {
			logger("error", {
				message: T("error_fetching_media_for_document"),
			});
			return [];
		}

		// TODO: format response to match meta
		// @ts-expect-error
		mediaResponses.push(mediaRes.data);
	}

	return mediaResponses;
}
