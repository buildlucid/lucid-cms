import { referenceKey } from "../../../libs/agent/references.js";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../../libs/db/tables/index.js";
import formatter from "../../../libs/formatters/helpers.js";
import {
	DocumentBricksRepository,
	DocumentsRepository,
	RequestsRepository,
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

/** An image's thumbnail, or a video's poster, falling back to its delivery thumbnail. */
const previewUrl = (media: Media) => {
	if (media.type === "image") {
		return media.url ? thumbnailUrl(media.url, media.delivery) : undefined;
	}
	if (media.type !== "video") return undefined;
	if (media.poster?.url) {
		return thumbnailUrl(media.poster.url, media.poster.delivery);
	}
	return media.thumbnail?.url || undefined;
};

export type AgentReferenceDetails = {
	label: string;
	mimeType?: string;
	previewUrl?: string;
	/** The resolved version, for documents. */
	version?: DocumentVersionType;
};

/** Loads current reference details keyed by `referenceKey`, omitting resources that no longer exist. */
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
	const requestIds = [
		...new Set(
			input.references.flatMap((reference) =>
				reference.type === "request" ? [reference.requestId] : [],
			),
		),
	];
	const locale = context.config.localization.defaultLocale;
	const Documents = new DocumentsRepository(context.db);
	const Bricks = new DocumentBricksRepository(context.db);
	const Requests = new RequestsRepository(context.db);

	const [media, requests, ...described] = await Promise.all([
		mediaIds.length
			? getMultipleMedia(context, {
					query: {
						filter: {
							id: { value: mediaIds, operator: "in" },
							isDeleted: { value: false, operator: "=" },
							ownership: {
								value: ["library", "user", "system"],
								operator: "in",
							},
						},
						page: 1,
						perPage: mediaIds.length,
					},
					actor: { type: "internal" },
				})
			: undefined,
		requestIds.length
			? Requests.selectMultiple({
					select: ["id", "title"],
					where: [{ key: "id", operator: "in", value: requestIds }],
					validation: { enabled: true },
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
	if (requests?.error) return requests;

	const details = new Map<string, AgentReferenceDetails>();
	for (const item of media?.data.data ?? []) {
		const preview = previewUrl(item);
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
			...(preview ? { previewUrl: preview } : {}),
		});
	}

	for (const request of requests?.data ?? []) {
		details.set(referenceKey({ type: "request", requestId: request.id }), {
			label: request.title,
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
