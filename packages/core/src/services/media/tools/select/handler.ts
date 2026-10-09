import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type { Media } from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import register from "../../../agent/references/register.js";
import formatMediaItem from "../helpers/format-item.js";
import getToolMedia from "../helpers/get-tool-media.js";
import resolveMediaLocale from "../helpers/resolve-locale.js";
import type {
	dataSchema,
	inputSchema,
	outputSchema,
	responseSchema,
} from "./schema.js";

/** Validates browser media choices against run permissions, types and limits, then links them as removable chat references. */
const selectMedia: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			data: z.output<typeof dataSchema>;
			response: z.output<ReturnType<typeof responseSchema>>;
			authority: AgentToolAuthority;
			conversationId: string;
			toolName: string;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const localeRes = resolveMediaLocale(context, props.input.contentLocale);
	if (localeRes.error) return localeRes;

	const selected: Media[] = [];
	for (const id of props.response.mediaIds) {
		const mediaRes = await getToolMedia(context, {
			id,
			authority: props.authority,
		});
		if (mediaRes.error) return mediaRes;
		if (props.data.types && !props.data.types.includes(mediaRes.data.type)) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:core.tools.media.select.type.unsupported", {
						data: { types: props.data.types.join(", ") },
					}),
				},
				data: undefined,
			};
		}
		selected.push(mediaRes.data);
	}

	const linked = await register(context, {
		conversationId: props.conversationId,
		references: selected.map((media) => ({
			type: "media" as const,
			mediaId: media.id,
		})),
		source: { type: "tool", toolName: props.toolName },
	});
	if (linked.error) return linked;

	return {
		error: undefined,
		data: {
			output: {
				data: selected.map((media) => formatMediaItem(media, localeRes.data)),
				meta: { contentLocale: localeRes.data },
			},
		},
	};
};

export default selectMedia;
