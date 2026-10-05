import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Removes proposal or snapshot versions once their release no longer needs them. */
const deleteVersions: ServiceFn<
	[{ collectionKey: string; documentId: number; versionIds: number[] }],
	undefined
> = async (context, data) => {
	const Versions = new DocumentVersionsRepository(context.db);

	if (data.versionIds.length === 0) {
		return { error: undefined, data: undefined };
	}

	const tablesRes = await getTableNames(context, data.collectionKey);
	if (tablesRes.error) return tablesRes;

	const deleteRes = await Versions.deleteVersions(
		{
			collectionKey: data.collectionKey,
			documentId: data.documentId,
			where: [{ key: "id", operator: "in", value: data.versionIds }],
		},
		{ tableName: tablesRes.data.version },
	);
	if (deleteRes.error) return deleteRes;

	return { error: undefined, data: undefined };
};

export default deleteVersions;
