import { createHash } from "node:crypto";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../../libs/formatters/helpers.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	DocumentsRepository,
	DocumentVersionsRepository,
} from "../../../libs/repositories/index.js";
import { documentEditTokenSchema } from "../../../libs/toolkit/documents/authoring-values-schema.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const readDocumentState = async (
	context: ServiceContext,
	input: { collectionKey: string; id: number; allowWriteLock?: boolean },
) => {
	const tables = await getTableNames(context, input.collectionKey);
	if (tables.error) return tables;

	const Documents = new DocumentsRepository(context.db);
	const Versions = new DocumentVersionsRepository(context.db);
	const [documentRes, versionRes] = await Promise.all([
		Documents.selectSingle(
			{
				select: ["id", "is_deleted", "write_lock"],
				where: [{ key: "id", operator: "=", value: input.id }],
			},
			{ tableName: tables.data.document },
		),
		Versions.selectSingle(
			{
				select: ["id", "content_id", "collection_migration_id"],
				where: [
					{ key: "document_id", operator: "=", value: input.id },
					{ key: "type", operator: "=", value: "latest" },
				],
			},
			{ tableName: tables.data.version },
		),
	]);
	if (documentRes.error) return documentRes;
	if (versionRes.error) return versionRes;

	const document = documentRes.data;
	if (!document || formatter.formatBoolean(document.is_deleted)) {
		return {
			error: {
				status: 404,
				message: copy("server:core.documents.not.found.message"),
			},
			data: undefined,
		};
	}

	if (document.write_lock && !input.allowWriteLock) {
		return {
			error: {
				status: 409,
				message: copy("server:core.documents.authoring.read.in.progress"),
			},
			data: undefined,
		};
	}

	const version = versionRes.data;
	if (!version) {
		return {
			error: {
				status: 404,
				message: copy("server:core.documents.authoring.latest.not.found"),
			},
			data: undefined,
		};
	}

	const editToken = documentEditTokenSchema.parse(
		createHash("sha256")
			.update(
				JSON.stringify([
					input.collectionKey,
					input.id,
					version.id,
					version.content_id,
					version.collection_migration_id,
				]),
			)
			.digest("hex"),
	);
	return {
		error: undefined,
		data: {
			id: input.id,
			editToken,
			writeLock: document.write_lock,
			version: {
				id: version.id,
				type: "latest" as const,
				contentId: version.content_id,
			},
		},
	};
};

export default readDocumentState;
