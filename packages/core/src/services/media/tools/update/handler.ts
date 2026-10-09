import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type {
	MediaTranslationMap,
	MediaType,
} from "../../../../types/response.js";
import type { MediaActor } from "../../../../utils/media/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import register from "../../../agent/references/register.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import updateSingle from "../../update-single.js";
import formatMediaItem from "../helpers/format-item.js";
import getToolMedia from "../helpers/get-tool-media.js";
import resolveMediaLocale from "../helpers/resolve-locale.js";
import translateText from "../helpers/translate-text.js";
import type { inputSchema, outputSchema } from "./schema.js";

const textFields = ["title", "alt", "description", "summary"] as const;

/** Translated fields that only some media types have. Titles apply to every type. */
const typedFields: {
	field: "alt" | "description" | "summary";
	types: readonly MediaType[];
}[] = [
	{ field: "alt", types: ["image"] },
	{ field: "description", types: ["video", "audio"] },
	{ field: "summary", types: ["document"] },
];

/** Updates one locale's media metadata, keeping personal media private and outside folders and linking it to the chat in the same transaction. */
const updateMedia: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			actor: ToolkitActor;
			authority: AgentToolAuthority;
			conversationId: string;
			toolName: string;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const localeRes = resolveMediaLocale(context, input.contentLocale);
	if (localeRes.error) return localeRes;

	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const mediaRes = await getToolMedia(context, {
		id: input.mediaId,
		authority: props.authority,
	});
	if (mediaRes.error) return mediaRes;

	const media = mediaRes.data;
	const unsupported = typedFields.find(
		({ field, types }) =>
			input[field] !== undefined && !types.includes(media.type),
	);
	if (unsupported) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.tools.media.update.field.unsupported", {
					data: { field: unsupported.field, type: media.type },
				}),
			},
			data: undefined,
		};
	}

	//* the service replaces a locale's whole translation, so text left out is sent back unchanged
	const changesText = textFields.some((field) => input[field] !== undefined);
	const translation = (
		value: string | null | undefined,
		current: MediaTranslationMap,
	) =>
		changesText
			? [
					{
						localeCode: localeRes.data,
						value:
							value === undefined
								? translateText(current, localeRes.data)
								: value,
					},
				]
			: undefined;
	const user = userRes.data;
	const actor: MediaActor =
		user.id === null ? { type: "internal" } : { type: "user", user };

	const updated = await updateSingle(context, {
		id: input.mediaId,
		fileName: input.fileName,
		folderId: input.folderId,
		title: translation(input.title, media.title),
		alt: translation(input.alt, media.type === "image" ? media.alt : null),
		description: translation(
			input.description,
			media.type === "video" || media.type === "audio"
				? media.description
				: null,
		),
		summary: translation(
			input.summary,
			media.type === "document" ? media.summary : null,
		),
		actor,
		userId: user.id,
		agentRunId: props.actor.agentRunId,
	});
	if (updated.error) return updated;

	const linked = await register(context, {
		conversationId: props.conversationId,
		references: [{ type: "media", mediaId: input.mediaId }],
		source: { type: "tool", toolName: props.toolName },
		managed: true,
	});
	if (linked.error) return linked;

	const currentRes = await getToolMedia(context, {
		id: input.mediaId,
		authority: props.authority,
	});
	if (currentRes.error) return currentRes;

	return {
		error: undefined,
		data: {
			output: {
				data: formatMediaItem(currentRes.data, localeRes.data),
				meta: { contentLocale: localeRes.data },
			},
		},
	};
};

export default updateMedia;
