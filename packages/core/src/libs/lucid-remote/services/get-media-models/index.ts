import z from "zod";
import type {
	MediaGenerationModelCatalog,
	MediaGenerationType,
} from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import { mediaGenerationModelCatalogSchemas } from "../../schema/ai.js";

/** Reads a media type's model catalogue from the connected Lucid service. */
const getMediaModels: ServiceFn<
	[{ accessToken: string; type: MediaGenerationType }],
	MediaGenerationModelCatalog<MediaGenerationType>
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
		.object({ data: mediaGenerationModelCatalogSchemas[input.type] })
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
