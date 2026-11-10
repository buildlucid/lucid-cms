import type CollectionDefinition from "../../../../libs/collection/definitions/collection/index.js";
import { getTableNames } from "../../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../../../libs/formatters/helpers.js";
import { copy } from "../../../../libs/i18n/index.js";
import {
	DocumentIdentitiesRepository,
	DocumentsRepository,
} from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import parseDocumentId from "./parse-document-id.js";

export type DocumentImportTarget =
	| { kind: "create" }
	| {
			kind: "update";
			id: number;
			/** A single collection's document matched by collection, which takes the entry's uid so later entries can link to it. */
			adopt?: true;
	  }
	/** The document is waiting for its create request, so the import edits the request's proposal. */
	| { kind: "proposal"; id: number; requestId: number };

/**
 * Finds a UID match, pending create proposal or single-collection document. Rejects UIDs belonging
 * to deleted documents or other collections.
 */
const findImportTarget: ServiceFn<
	[
		{
			collection: CollectionDefinition;
			uid: string;
			/** The live document matching the uid, as `<collectionKey>:<id>`. */
			existing: string | undefined;
		},
	],
	DocumentImportTarget
> = async (context, data) => {
	if (data.existing !== undefined) {
		const existing = parseDocumentId(data.existing);
		if (existing?.collectionKey !== data.collection.key) {
			return {
				error: {
					status: 409,
					message: copy("server:core.transfer.documents.other.collection"),
				},
				data: undefined,
			};
		}
		return { error: undefined, data: { kind: "update", id: existing.id } };
	}

	const tablesRes = await getTableNames(context, data.collection.key);
	if (tablesRes.error) return tablesRes;

	const Documents = new DocumentsRepository(context.db);
	const DocumentIdentities = new DocumentIdentitiesRepository(context.db);

	const identityRes = await DocumentIdentities.selectSingle({
		select: ["collection_key", "document_id"],
		where: [{ key: "uid", operator: "=", value: data.uid }],
	});
	if (identityRes.error) return identityRes;

	if (identityRes.data) {
		if (identityRes.data.collection_key !== data.collection.key) {
			return {
				error: {
					status: 409,
					message: copy("server:core.transfer.documents.other.collection"),
				},
				data: undefined,
			};
		}

		const documentRes = await Documents.selectSingle(
			{
				select: ["id", "is_deleted", "create_request_id"],
				where: [
					{ key: "id", operator: "=", value: identityRes.data.document_id },
				],
				validation: { enabled: true },
			},
			{ tableName: tablesRes.data.document },
		);
		if (documentRes.error) return documentRes;

		if (formatter.formatBoolean(documentRes.data.is_deleted)) {
			return {
				error: {
					status: 409,
					message: copy("server:core.transfer.documents.deleted"),
				},
				data: undefined,
			};
		}
		if (documentRes.data.create_request_id !== null) {
			return {
				error: undefined,
				data: {
					kind: "proposal",
					id: documentRes.data.id,
					requestId: documentRes.data.create_request_id,
				},
			};
		}

		return {
			error: undefined,
			data: { kind: "update", id: documentRes.data.id },
		};
	}

	if (data.collection.getData.mode === "single") {
		const singleRes = await Documents.selectSingle(
			{
				select: ["id"],
				where: [{ key: "is_deleted", operator: "=", value: false }],
			},
			{ tableName: tablesRes.data.document },
		);
		if (singleRes.error) return singleRes;
		if (singleRes.data) {
			return {
				error: undefined,
				data: { kind: "update", id: singleRes.data.id, adopt: true },
			};
		}
	}

	return { error: undefined, data: { kind: "create" } };
};

export default findImportTarget;
