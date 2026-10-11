import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	DocumentsRepository,
	RequestDocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { AgentReferenceInput } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Replaces pending create documents and pinned request proposals with their request references, leaving other versions and resources unchanged. */
const linkRequestedDocuments: ServiceFn<
	[{ references: AgentReferenceInput[] }],
	AgentReferenceInput[]
> = async (context, input) => {
	const documents = Map.groupBy(
		input.references.flatMap((reference) =>
			reference.type === "document" && reference.versionId === undefined
				? [reference]
				: [],
		),
		(reference) => reference.collectionKey,
	);
	const Documents = new DocumentsRepository(context.db);
	const requested = new Map<string, number>();

	for (const [collectionKey, references] of documents) {
		const tables = await getTableNames(context, collectionKey);
		//* unknown collections are left for describe to report as missing
		if (tables.error) continue;

		const rows = await Documents.selectMultiple(
			{
				select: ["id", "create_request_id"],
				where: [
					{
						key: "id",
						operator: "in",
						value: references.map((reference) => reference.documentId),
					},
				],
			},
			{ tableName: tables.data.document },
		);
		if (rows.error) return rows;

		for (const row of rows.data ?? []) {
			if (row.create_request_id === null) continue;
			requested.set(`${collectionKey}:${row.id}`, row.create_request_id);
		}
	}

	//* a proposal is the version a request edits from latest
	const proposalIds = input.references.flatMap((reference) =>
		reference.type === "document" && reference.versionId !== undefined
			? [reference.versionId]
			: [],
	);
	if (proposalIds.length > 0) {
		const RequestDocuments = new RequestDocumentsRepository(context.db);
		const proposals = await RequestDocuments.selectMultiple({
			select: [
				"request_id",
				"collection_key",
				"document_id",
				"source_version_id",
			],
			where: [
				{ key: "source", operator: "=", value: "latest" },
				{ key: "source_version_id", operator: "in", value: proposalIds },
			],
		});
		if (proposals.error) return proposals;

		for (const row of proposals.data ?? []) {
			requested.set(
				`${row.collection_key}:${row.document_id}:${row.source_version_id}`,
				row.request_id,
			);
		}
	}

	return {
		error: undefined,
		data: input.references.map((reference) => {
			if (reference.type !== "document") return reference;

			const requestId = requested.get(
				reference.versionId === undefined
					? `${reference.collectionKey}:${reference.documentId}`
					: `${reference.collectionKey}:${reference.documentId}:${reference.versionId}`,
			);
			return requestId === undefined
				? reference
				: { type: "request", requestId };
		}),
	};
};

export default linkRequestedDocuments;
