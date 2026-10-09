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

/** Reads a document's latest or requested version, with a token for its stored state. */
const readDocumentState = async (
	context: ServiceContext,
	input: {
		collectionKey: string;
		id: number;
		/** Reads this version type, eg. a publishing target. Defaults to latest. */
		version?: string;
		/** Reads this version, eg. a request proposal, instead of a version type. */
		versionId?: number;
		allowWriteLock?: boolean;
	},
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
				select: ["id", "type", "content_id", "collection_migration_id"],
				where: [
					{ key: "document_id", operator: "=", value: input.id },
					input.versionId === undefined
						? { key: "type", operator: "=", value: input.version ?? "latest" }
						: { key: "id", operator: "=", value: input.versionId },
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
				message: copy(
					input.versionId === undefined &&
						(input.version ?? "latest") === "latest"
						? "server:core.documents.authoring.latest.not.found"
						: "server:core.documents.versions.not.found.message",
				),
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
				type: version.type,
				contentId: version.content_id,
			},
		},
	};
};

export default readDocumentState;
