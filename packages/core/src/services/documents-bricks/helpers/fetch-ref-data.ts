import fetchDocumentRefs from "../../../libs/collection/custom-fields/fields/document/fetch-refs.js";
import fetchMediaRefs from "../../../libs/collection/custom-fields/fields/media/fetch-refs.js";
import fetchUserRefs from "../../../libs/collection/custom-fields/fields/user/fetch-refs.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { MediaPropsT } from "../../../libs/formatters/media.js";
import type { UserPropT } from "../../../libs/formatters/users.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type {
	DocumentVersionType,
	FieldTypes,
	LucidBrickTableName,
	LucidDocumentTableName,
	ServiceFn,
} from "../../../types.js";
import type { FieldRelationValues } from "./extract-related-entity-ids.js";

type FieldRefData = Partial<
	Record<
		FieldTypes,
		Array<MediaPropsT> | Array<UserPropT> | Array<BrickQueryResponse>
	>
>;

export type FieldRefResponse = {
	data: FieldRefData;
	meta?: {
		document?: {
			/** Document-field table schema for referenced collections, keyed by collection key. */
			fieldsSchemaByCollection: Record<
				string,
				CollectionSchemaTable<LucidBrickTableName>
			>;
		};
	};
};

/**
 * Responsible for fetching all of the reference data for a document based on what is extracted from field data and config
 */
const fetchRefData: ServiceFn<
	[
		{
			values: FieldRelationValues;
			versionType: Exclude<DocumentVersionType, "revision">;
		},
	],
	FieldRefResponse
> = async (context, data) => {
	const response: FieldRefResponse = {
		data: {},
	};
	const fetchPromises = [];

	let firstError = false;
	// let responseError: LucidErrorData;

	if (data.values.media) {
		const mediaIds: number[] = data.values.media
			.flatMap((i) => Array.from(i.values))
			.filter((i) => typeof i === "number");

		fetchPromises.push(
			fetchMediaRefs(context, {
				ids: mediaIds,
			}).then((res) => {
				if (res.error && !firstError) {
					firstError = true;
					// responseError = res.error;
					return;
				}

				if (res.data && Array.isArray(res.data)) {
					response.data.media = res.data;
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
			fetchUserRefs(context, {
				ids: userIds,
			}).then((res) => {
				if (res.error && !firstError) {
					firstError = true;
					// responseError = res.error;
					return;
				}

				if (res.data && Array.isArray(res.data)) {
					response.data.user = res.data;
				}
				return res.data;
			}),
		);
	}
	if (data.values.document) {
		fetchPromises.push(
			fetchDocumentRefs(context, {
				values: data.values.document.map((v) => ({
					table: v.table as LucidDocumentTableName,
					ids: Array.from(v.values).filter((i) => typeof i === "number"),
				})),
				versionType: data.versionType,
			}).then((res) => {
				if (res.error && !firstError) {
					firstError = true;
					// responseError = res.error;
					return;
				}

				if (res.data) {
					response.data.document = res.data.rows;
					response.meta = {
						...response.meta,
						document: {
							fieldsSchemaByCollection: res.data.fieldsSchemaByCollection,
						},
					};
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

export default fetchRefData;
