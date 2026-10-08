import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Unpublish requests can only target environments that hold the document. */
const checkPublishedTargets: ServiceFn<
	[{ collectionKey: string; documentId: number; targets: string[] }],
	undefined
> = async (context, data) => {
	if (data.targets.length === 0) return { error: undefined, data: undefined };

	const Versions = new DocumentVersionsRepository(context.db);

	const tablesRes = await getTableNames(context, data.collectionKey);
	if (tablesRes.error) return tablesRes;

	const publishedRes = await Versions.selectMultiple(
		{
			select: ["id"],
			where: [
				{ key: "document_id", operator: "=", value: data.documentId },
				{ key: "type", operator: "in", value: data.targets },
			],
		},
		{ tableName: tablesRes.data.version },
	);
	if (publishedRes.error) return publishedRes;

	if ((publishedRes.data ?? []).length !== data.targets.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.targets.unpublished"),
				status: 400,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkPublishedTargets;
