import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { MediaTranslationMap } from "../../../../types/response.js";
import getMultiple from "../../get-multiple.js";
import { inputSchema, outputSchema } from "./schema.js";

const translateMedia = (
	value: MediaTranslationMap,
	locale: string | null,
): string | null => {
	if (typeof value === "string" || value === null) return value;
	if (locale === null) return null;
	return value[locale] ?? null;
};

/** Searches visible media through the existing filtered media service. */
export const findMediaTool = defineTool({
	target: "mcp",
	name: "media_find",
	description:
		"Find media with Lucid's media filters, sorting and pagination. Returns IDs for media_preview.",
	input: inputSchema,
	output: outputSchema,
	scopes: [ExternalScopes.MediaRead],
	annotations: { readOnlyHint: true },
	handler: async ({ context, input }) => {
		const locale =
			input.contentLocale ?? context.config.localization.defaultLocale;
		if (
			locale !== null &&
			!context.config.localization.locales.some((item) => item.code === locale)
		) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:core.tools.content.locale.unknown"),
				},
				data: undefined,
			};
		}

		const query = {
			...input.query,
			filter: {
				isDeleted: { value: false, operator: "=" },
				...input.query.filter,
			},
		} satisfies Parameters<typeof getMultiple>[1]["query"];

		const mediaRes = await getMultiple(context, { query });
		if (mediaRes.error) return mediaRes;

		return {
			error: undefined,
			data: {
				output: {
					data: mediaRes.data.data.map((media) => ({
						id: media.id,
						type: media.type,
						status: media.status,
						title: translateMedia(media.title, locale),
						alt:
							media.type === "image"
								? translateMedia(media.alt, locale)
								: media.type === "video" && media.poster
									? translateMedia(media.poster.alt, locale)
									: null,
						description:
							media.type === "video" || media.type === "audio"
								? translateMedia(media.description, locale)
								: media.type === "document"
									? translateMedia(media.summary, locale)
									: null,
						fileName: media.fileName,
						mimeType: media.meta.mimeType,
						width:
							media.type === "image" || media.type === "video"
								? media.meta.width
								: null,
						height:
							media.type === "image" || media.type === "video"
								? media.meta.height
								: null,
						public: media.public,
						url: media.public ? media.url || null : null,
					})),
					pagination: getPagination(
						mediaRes.data.count,
						query.page,
						query.perPage,
					),
					meta: { contentLocale: locale },
				},
			},
		};
	},
});
