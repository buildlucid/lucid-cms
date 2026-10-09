import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { AgentReferenceInput } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Replaces pending document references with their create requests, leaving pinned versions and other resources unchanged. */
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

	return {
		error: undefined,
		data: input.references.map((reference) => {
			if (reference.type !== "document" || reference.versionId !== undefined) {
				return reference;
			}

			const requestId = requested.get(
				`${reference.collectionKey}:${reference.documentId}`,
			);
			return requestId === undefined
				? reference
				: { type: "request", requestId };
		}),
	};
};

export default linkRequestedDocuments;
