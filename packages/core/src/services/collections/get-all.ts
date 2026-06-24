import primeRuntimeSchemas from "../../libs/collection/schema/runtime/prime-runtime-schemas.js";
import { getDocumentTableSchema } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { collectionsFormatter } from "../../libs/formatters/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { Collection } from "../../types/response.js";
import { tenantAccessAllowed } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAll: ServiceFn<
	[
		{
			includeDocumentId?: boolean;
			includeFields?: boolean;
		},
	],
	Collection[]
> = async (context, data) => {
	const collections = (context.config.collections ?? []).filter((collection) =>
		tenantAccessAllowed(collection.getData.tenants, context.request.tenantKey),
	);

	const adminTranslations = context.translate
		.forLocale(context.config.i18n.defaultLocale)
		.adminBundle();

	if (data.includeDocumentId === true) {
		const singleCollections = collections.filter(
			(collection) => collection.getData.mode === "single",
		);

		const Documents = new DocumentsRepository(
			context.db.client,
			context.config.db,
		);

		await primeRuntimeSchemas(context, {
			collectionKeys: singleCollections.map((c) => c.key),
		});

		const documentsRes = await Documents.selectMultipleUnion({
			tables: (
				await Promise.all(
					singleCollections.map(async (c) => {
						const documentTableSchema = await getDocumentTableSchema(
							context,
							c.key,
						);
						if (documentTableSchema.error || !documentTableSchema.data)
							return null;

						return documentTableSchema.data.name;
					}),
				)
			).filter((n) => n !== null),
		});
		if (documentsRes.error) return documentsRes;

		return {
			error: undefined,
			data: collectionsFormatter.formatMultiple({
				collections: collections,
				allCollections: context.config.collections ?? [],
				tenantKey: context.request.tenantKey,
				queueSupportsScheduling: context.queue.support.scheduling,
				adminTranslations,
				include: {
					bricks: false,
					fields: data.includeFields === true,
					documentId: true,
				},
				documents: documentsRes.data,
			}),
		};
	}

	return {
		error: undefined,
		data: collectionsFormatter.formatMultiple({
			collections: collections,
			allCollections: context.config.collections ?? [],
			tenantKey: context.request.tenantKey,
			queueSupportsScheduling: context.queue.support.scheduling,
			adminTranslations,
			include: {
				bricks: false,
				fields: data.includeFields === true,
				documentId: false,
			},
		}),
	};
};

export default getAll;
