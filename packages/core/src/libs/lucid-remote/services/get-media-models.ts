import z from "zod";
import type {
	MediaGenerationType,
	MediaModelCatalog,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";

const modelSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(""),
});

//* Open strings accept new model options without a CMS update.
export const mediaModelCatalogSchemas = {
	image: z.object({
		default: z.string(),
		models: z.array(
			modelSchema.extend({
				aspectRatios: z.array(z.string()),
				resolutions: z.array(z.string()),
				qualities: z.array(z.string()),
				outputFormats: z.array(z.string()),
				sourceImage: z.boolean(),
			}),
		),
	}),
	audio: z.object({
		default: z.string(),
		models: z.array(
			modelSchema.extend({
				format: z.string(),
				voices: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						language: z.string().optional(),
						previewUrl: z.url(),
					}),
				),
				defaultVoice: z.string(),
				instructions: z.boolean(),
				maxCharacters: z.number().int().positive(),
			}),
		),
	}),
} satisfies {
	[Type in MediaGenerationType]: z.ZodType<MediaModelCatalog<Type>>;
};

/** Reads a media type's model catalogue from the connected Lucid service. */
const getMediaModels: ServiceFn<
	[{ accessToken: string; type: MediaGenerationType }],
	MediaModelCatalog<MediaGenerationType>
> = async (context, input) => {
	const result = await getLucidRemoteClient(context).request<unknown>(
		`${lucidRemotePaths.getModels}?feature=${input.type}`,
		{
			method: "GET",
			retries: 0,
			accessToken: input.accessToken,
		},
	);
	if (result.error) return result;

	const parsed = z
		.object({ data: mediaModelCatalogSchemas[input.type] })
		.safeParse(result.data.json);
	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.models.unavailable"),
			},
		};
	}

	return { data: parsed.data.data, error: undefined };
};

export default getMediaModels;
