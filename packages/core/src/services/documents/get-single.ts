import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import buildTableName from "../collection-migrator/helpers/build-table-name.js";
import type z from "zod";
import type { ServiceFn } from "../../utils/services/types.js";
import type documentsSchema from "../../schemas/documents.js";
import type { CollectionDocumentResponse } from "../../types/response.js";
import type {
	DocumentVersionType,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../libs/db/types.js";
import { inspect } from "node:util";

// @ts-expect-error
const getSingle: ServiceFn<
	[
		{
			id: number;
			status?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: z.infer<typeof documentsSchema.getSingle.query>;
		},
	],
	undefined // CollectionDocumentResponse
> = async (context, data) => {
	const Document = Repository.get("documents", context.db, context.config.db);

	const documentTableRes = buildTableName<LucidDocumentTableName>("document", {
		collection: data.collectionKey,
	});
	if (documentTableRes.error) return documentTableRes;

	const versionsTableRes = buildTableName<LucidVersionTableName>("versions", {
		collection: data.collectionKey,
	});
	if (versionsTableRes.error) return versionsTableRes;

	const [documentRes, collectionRes] = await Promise.all([
		Document.selectSingleById(
			{
				id: data.id,
				tables: {
					versions: versionsTableRes.data,
				},
				validation: {
					enabled: true,
					defaultError: {
						message: T("document_version_not_found_message"),
						status: 404,
					},
				},
			},
			{
				tableName: documentTableRes.data,
			},
		),
		context.services.collection.getSingleInstance(context, {
			key: data.collectionKey,
		}),
	]);

	if (documentRes.error) return documentRes;
	if (collectionRes.error) return collectionRes;

	// TODO: implement version checks to ensure we have the correct one targeted. Bellow is temporary.
	const versionId = documentRes.data.versions[0]?.id;
	const versionType = documentRes.data.versions[0]?.version_type;
	if (!versionId || !versionType) {
		return {
			error: {
				message: T("document_version_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	// TODO: add brick res to response here
	if (data.query.include?.includes("bricks")) {
		const bricksRes =
			await context.services.collection.documentBricks.getMultiple(context, {
				versionId: versionId,
				collectionKey: documentRes.data.collection_key,
				versionType: versionType !== "revision" ? versionType : undefined, // if we're fetching a revision, let it default to the draft version
			});
		if (bricksRes.error) return bricksRes;

		// console.log(
		// 	inspect(bricksRes.data, {
		// 		depth: Number.POSITIVE_INFINITY,
		// 		colors: true,
		// 		numericSeparator: true,
		// 	}),
		// );

		return {
			error: undefined,
			data: {
				...documentRes.data,
				bricks: bricksRes.data.bricks,
				fields: bricksRes.data.fields,
			},
		};
	}

	return {
		error: undefined,
		data: documentRes.data,
	};
};

export default getSingle;
