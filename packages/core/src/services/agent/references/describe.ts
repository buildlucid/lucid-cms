import { referenceKey } from "../../../libs/agent/references.js";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../../libs/db/tables/index.js";
import formatter from "../../../libs/formatters/helpers.js";
import {
	DocumentBricksRepository,
	DocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { AgentReferenceInput, Media } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getDocumentLabel from "../../documents/helpers/get-document-label.js";
import getMultipleMedia from "../../media/get-multiple.js";

//* matches the admin's small thumbnail preset, so previews do not load full images
const thumbnailUrl = (url: string, delivery: Media["delivery"]) => {
	if (!delivery.supportsPresetQuery) return url;
	const preview = new URL(url);
	preview.searchParams.set("preset", "thumbnail-small");
	return preview.toString();
};

export type AgentReferenceDetails = {
	label: string;
	mimeType?: string;
	previewUrl?: string;
	/** The resolved version, for documents. */
	version?: DocumentVersionType;
};

/**
 * Loads current labels and file types for references, keyed by `referenceKey`.
 * Media loads in one query and documents in parallel. Resources that no longer
 * exist are left out, so callers decide whether that is an error.
 */
const describe: ServiceFn<
	[{ references: AgentReferenceInput[] }],
	Map<string, AgentReferenceDetails>
> = async (context, input) => {
	const mediaIds = [
		...new Set(
			input.references.flatMap((reference) =>
				reference.type === "media" ? [reference.mediaId] : [],
			),
		),
	];
	const documents = input.references.filter(
		(reference) => reference.type === "document",
	);
	const locale = context.config.localization.defaultLocale;
	const Documents = new DocumentsRepository(context.db);
	const Bricks = new DocumentBricksRepository(context.db);

	const [media, ...described] = await Promise.all([
		mediaIds.length
			? getMultipleMedia(context, {
					query: {
						filter: {
							id: { value: mediaIds, operator: "in" },
							isDeleted: { value: false, operator: "=" },
						},
						page: 1,
						perPage: mediaIds.length,
					},
				})
			: undefined,
		...documents.map(async (reference) => {
			const collection = await collections.getSingle(context, {
				key: reference.collectionKey,
			});
			if (collection.error) {
				return collection.error.status === 404 ? undefined : collection;
			}

			const tables = await getTableNames(context, reference.collectionKey);
			if (tables.error) return tables;

			const document = await Documents.selectSingleById(
				{
					id: reference.documentId,
					tables: { versions: tables.data.version },
					...(reference.versionId === undefined
						? { version: "latest" }
						: { versionId: reference.versionId }),
				},
				{ tableName: tables.data.document },
			);
			if (document.error) return document;
			if (
				!document.data?.version_id ||
				formatter.formatBoolean(document.data.is_deleted)
			) {
				return undefined;
			}

			const label = await getDocumentLabel({
				context,
				bricks: Bricks,
				collection: collection.data,
				tables: tables.data,
				documentId: reference.documentId,
				versionId: document.data.version_id,
			});
			if (label.error) return label;

			return {
				error: undefined,
				data: [
					referenceKey(reference),
					{
						label: label.data,
						...(document.data.version_type
							? { version: document.data.version_type }
							: {}),
					},
				] as const,
			};
		}),
	]);
	if (media?.error) return media;

	const details = new Map<string, AgentReferenceDetails>();
	for (const item of media?.data.data ?? []) {
		const title =
			typeof item.title === "string"
				? item.title
				: locale
					? item.title?.[locale]
					: undefined;
		details.set(referenceKey({ type: "media", mediaId: item.id }), {
			label:
				title ||
				item.fileName ||
				context.translate("server:agent.references.media.label", {
					data: { id: item.id },
				}),
			...(item.meta.mimeType ? { mimeType: item.meta.mimeType } : {}),
			...(item.type === "image" && item.url
				? { previewUrl: thumbnailUrl(item.url, item.delivery) }
				: {}),
		});
	}

	for (const result of described) {
		if (!result) continue;
		if (result.error) return result;
		details.set(...result.data);
	}

	return { error: undefined, data: details };
};

export default describe;
