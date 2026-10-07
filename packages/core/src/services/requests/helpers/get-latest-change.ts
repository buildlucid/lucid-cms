import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../../libs/formatters/index.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Finds whether latest has changed since a proposal was copied from it, for
 * requests that add latest as a target later and so never recorded those
 * changes. Saves that replace latest give it a new version, while in-place
 * updates only move its update time. Returns who changed it last, or null
 * when it is unchanged.
 */
const getLatestChange: ServiceFn<
	[{ collectionKey: string; documentId: number; proposalId: number }],
	{ userId: number | null } | null
> = async (context, data) => {
	const Versions = new DocumentVersionsRepository(context.db);

	const tablesRes = await getTableNames(context, data.collectionKey);
	if (tablesRes.error) return tablesRes;

	const [proposalRes, latestRes] = await Promise.all([
		Versions.selectSingle(
			{
				select: ["promoted_from", "created_at"],
				where: [{ key: "id", operator: "=", value: data.proposalId }],
			},
			{ tableName: tablesRes.data.version },
		),
		Versions.selectSingle(
			{
				select: ["id", "updated_at", "updated_by"],
				where: [
					{ key: "document_id", operator: "=", value: data.documentId },
					{ key: "type", operator: "=", value: "latest" },
				],
			},
			{ tableName: tablesRes.data.version },
		),
	]);
	if (proposalRes.error) return proposalRes;
	if (latestRes.error) return latestRes;

	const proposal = proposalRes.data;
	const latest = latestRes.data;
	if (!proposal || !latest) return { error: undefined, data: null };

	const updatedAt = Date.parse(formatter.formatDate(latest.updated_at) ?? "");
	const createdAt = Date.parse(formatter.formatDate(proposal.created_at) ?? "");
	const changed = latest.id !== proposal.promoted_from || updatedAt > createdAt;

	return {
		error: undefined,
		data: changed ? { userId: latest.updated_by } : null,
	};
};

export default getLatestChange;
