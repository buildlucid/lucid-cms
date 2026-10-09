import type z from "zod";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import formatMediaItem from "../helpers/format-item.js";
import getToolMedia from "../helpers/get-tool-media.js";
import resolveMediaLocale from "../helpers/resolve-locale.js";
import type { inputSchema, outputSchema } from "./schema.js";

const getMedia: ServiceFn<
	[{ input: z.output<typeof inputSchema>; authority?: AgentToolAuthority }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const localeRes = resolveMediaLocale(context, props.input.contentLocale);
	if (localeRes.error) return localeRes;

	const mediaRes = await getToolMedia(context, {
		id: props.input.mediaId,
		authority: props.authority,
	});
	if (mediaRes.error) return mediaRes;

	return {
		error: undefined,
		data: {
			output: {
				data: formatMediaItem(mediaRes.data, localeRes.data),
				meta: { contentLocale: localeRes.data },
			},
		},
	};
};

export default getMedia;
