import { randomUUID } from "node:crypto";
import collections from "../../../libs/collection/collections.js";
import getMigrationStatus from "../../../libs/collection/get-collection-migration-status.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import LucidAPIError from "../../../utils/errors/lucid-api-error.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Claims documents in ID order. Use `await using` to release every claim on return or failure.
 * Call inside withTransaction so releasing claims happens before commit or rollback.
 */
const acquireDocumentWrites: ServiceFn<
	[{ collectionKey: string; ids: number[] }],
	AsyncDisposableStack
> = async (context, input) => {
	await using claims = new AsyncDisposableStack();
	const ids = [...new Set(input.ids)].sort((a, b) => a - b);
	if (ids.length === 0) return { error: undefined, data: claims.move() };

	const collection = await collections.getSingle(context, {
		key: input.collectionKey,
	});
	if (collection.error) return collection;

	const [migration, tables] = await Promise.all([
		getMigrationStatus(context, { collection: collection.data }),
		getTableNames(context, input.collectionKey),
	]);
	if (migration.error) return migration;
	if (tables.error) return tables;
	if (migration.data.requiresMigration) {
		return {
			error: {
				status: 400,
				message: copy("server:core.error.schema.migration.required.message"),
			},
			data: undefined,
		};
	}

	const Documents = new DocumentsRepository(context.db);
	const table = { tableName: tables.data.document };
	for (const id of ids) {
		const lock = { id, token: randomUUID() };
		const claimed = await Documents.acquireWriteLock(lock, table);
		if (claimed.error) return claimed;
		if (!claimed.data) {
			const document = await Documents.selectSingle(
				{ select: ["id"], where: [{ key: "id", operator: "=", value: id }] },
				table,
			);
			if (document.error) return document;

			return {
				error: {
					status: document.data ? 409 : 404,
					message: document.data
						? copy("server:core.documents.authoring.write.in.progress")
						: copy("server:core.documents.not.found.message"),
				},
				data: undefined,
			};
		}

		claims.defer(async () => {
			const released = await Documents.releaseWriteLock(lock, table);
			if (released.error) throw new LucidAPIError(released.error);
		});
	}

	return { error: undefined, data: claims.move() };
};

export default acquireDocumentWrites;
