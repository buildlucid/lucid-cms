import type z from "zod";
import type {
	ContentList,
	ContentLocaleInput,
	ContentMedia,
	IsLocalized,
	MediaListItem,
} from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { ToolkitListFilterInput } from "../../types.js";
import {
	parseListQuery,
	runToolkitService,
	toPagination,
} from "../../utils.js";
import resolveReadActor from "../resolve-read-actor.js";
import { inputSchema, querySchema } from "./schema.js";

/** Optional filters, sorts, pagination, the actor or library-only access to read with, and a locale and fallback locale for media text. */
export type ToolkitMediaGetMultipleInput<
	TLocale extends string | undefined = undefined,
> = Omit<z.input<typeof inputSchema>, "locale" | "filter"> & {
	filter?: ToolkitListFilterInput<z.input<typeof querySchema>>;
} & ContentLocaleInput<TLocale>;

/** A page of media, without audio transcripts unless included, and where the page is. */
export type ToolkitMediaGetMultipleResult<
	TLocale extends string | undefined = undefined,
> = ContentList<ContentMedia<MediaListItem, IsLocalized<TLocale>>>;

const getMultiple = async <TLocale extends string | undefined = undefined>(
	context: ServiceContext,
	input: ToolkitMediaGetMultipleInput<TLocale> = {},
): ServiceResponse<ToolkitMediaGetMultipleResult<TLocale>> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getMultipleMedia } =
				await import("../../../../services/media/get-multiple.js");

			const queryRes = await parseListQuery(querySchema, data);
			if (queryRes.error) return queryRes;

			const actorRes = await resolveReadActor(context, data);
			if (actorRes.error) return actorRes;

			const result = await getMultipleMedia<
				ContentMedia<MediaListItem, IsLocalized<TLocale>>
			>(context, {
				query: queryRes.data,
				actor: actorRes.data,
				locale: data.locale,
				fallbackLocale: data.fallbackLocale,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					items: result.data.data,
					pagination: toPagination(result.data.count, data),
				},
			};
		},
		name: {
			key: "core.toolkit.media.get.multiple.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.get.multiple.error.message",
			defaultMessage: "Lucid toolkit could not fetch multiple media items.",
		},
	});

export default getMultiple;
