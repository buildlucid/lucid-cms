import type { DocumentPropsT } from "../../../libs/formatters/documents.js";
import type { MediaPropsT } from "../../../libs/formatters/media.js";
import type { UserPropT } from "../../../libs/formatters/users.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type {
	FieldTypes,
	LucidDocumentTableName,
	LucidErrorData,
	ServiceFn,
} from "../../../types.js";
import type { FieldRelationValues } from "./extract-related-entity-ids.js";

export type FieldRelationResponse = Partial<
	Record<
		FieldTypes,
		Array<MediaPropsT> | Array<UserPropT> | Array<BrickQueryResponse>
	>
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
	const fetchPromises = [];

	let firstError = false;
	let responseError: LucidErrorData;

	if (data.values.media) {
		const mediaIds: number[] = data.values.media
			.flatMap((i) => Array.from(i.values))
			.filter((i) => typeof i === "number");

		fetchPromises.push(
			context.services.media
				.getMultipleFieldMeta(context, {
					ids: mediaIds,
				})
				.then((res) => {
					if (res.error && !firstError) {
						firstError = true;
						responseError = res.error;
						return;
					}

					if (res.data && Array.isArray(res.data)) {
						response.media = res.data;
					}
					return res.data;
				}),
		);
	}
	if (data.values.user) {
		const userIds: number[] = data.values.user
			.flatMap((i) => Array.from(i.values))
			.filter((i) => typeof i === "number");

		fetchPromises.push(
			context.services.user
				.getMultipleFieldMeta(context, {
					ids: userIds,
				})
				.then((res) => {
					if (res.error && !firstError) {
						firstError = true;
						responseError = res.error;
						return;
					}

					if (res.data && Array.isArray(res.data)) {
						response.user = res.data;
					}
					return res.data;
				}),
		);
	}
	if (data.values.document) {
		fetchPromises.push(
			context.services.collection.documents
				.getMultipleFieldMeta(context, {
					values: data.values.document.map((v) => ({
						table: v.table as LucidDocumentTableName,
						ids: Array.from(v.values).filter((i) => typeof i === "number"),
					})),
				})
				.then((res) => {
					if (res.error && !firstError) {
						firstError = true;
						responseError = res.error;
						return;
					}

					if (res.data && Array.isArray(res.data)) {
						response.document = res.data;
					}
					return res.data;
				}),
		);
	}

	await Promise.all(fetchPromises);

	return {
		data: response,
		error: undefined,
	};
};

export default fetchRelationData;
