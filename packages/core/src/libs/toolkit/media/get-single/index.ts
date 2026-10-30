import type z from "zod";
import type {
	ContentLocaleInput,
	ContentMedia,
	IsLocalized,
	Media,
} from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import resolveReadActor from "../resolve-read-actor.js";
import { inputSchema } from "./schema.js";

/** A media ID, the actor or library-only access to read it with, and an optional locale and fallback locale for its text. */
export type ToolkitMediaGetSingleInput<
	TLocale extends string | undefined = undefined,
> = Omit<z.input<typeof inputSchema>, "locale"> & ContentLocaleInput<TLocale>;

const getSingle = async <TLocale extends string | undefined = undefined>(
	context: ServiceContext,
	input: ToolkitMediaGetSingleInput<TLocale>,
): ServiceResponse<ContentMedia<Media, IsLocalized<TLocale>>> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getSingleMedia } =
				await import("../../../../services/media/get-single.js");

			const actorRes = await resolveReadActor(context, data);
			if (actorRes.error) return actorRes;

			return getSingleMedia<ContentMedia<Media, IsLocalized<TLocale>>>(
				context,
				{
					id: data.id,
					actor: actorRes.data,
					locale: data.locale,
					fallbackLocale: data.fallbackLocale,
				},
			);
		},
		name: {
			key: "core.toolkit.media.get.single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.get.single.error.message",
			defaultMessage: "Lucid toolkit could not fetch a media item.",
		},
	});

export default getSingle;
