import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import type { ToolkitActor } from "../../../../libs/permission/toolkit-actor.js";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type { MediaActor } from "../../../../utils/media/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import register from "../../../agent/references/register.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import {
	type MediaTextField,
	mediaTextFields,
} from "../../helpers/text-fields.js";
import updateSingle from "../../update-single.js";
import formatMediaItem from "../helpers/format-item.js";
import getToolMedia from "../helpers/get-tool-media.js";
import resolveMediaLocale from "../helpers/resolve-locale.js";
import type { inputSchema, outputSchema } from "./schema.js";

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
	//* personal media belongs to the person, so only library media needs the update permission
	if (
		media.ownership.type === "library" &&
		!hasPermission(props.authority, Permissions.MediaUpdate)
	) {
		return {
			error: {
				type: "basic",
				status: 403,
				message: copy("server:core.permissions.denied"),
			},
			data: undefined,
		};
	}

	//* clearing a field the type lacks changes nothing, so only text for one is a mistake
	const textFields: readonly MediaTextField[] = mediaTextFields[media.type];
	const unsupported = Object.values(mediaTextFields)
		.flat()
		.find((field) => input[field] !== undefined && !textFields.includes(field));
	if (unsupported) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.tools.media.update.field.unsupported", {
					data: { field: unsupported, type: media.type },
				}),
			},
			data: undefined,
		};
	}

	const cleared = new Set(input.clear);
	const translation = (field: "title" | MediaTextField) => {
		const value = input[field] ?? (cleared.has(field) ? null : undefined);
		return value === undefined
			? undefined
			: [{ localeCode: localeRes.data, value }];
	};
	const user = userRes.data;
	const actor: MediaActor =
		user.id === null ? { type: "internal" } : { type: "user", user };

	const updated = await updateSingle(context, {
		id: input.mediaId,
		fileName: input.fileName,
		folderId: input.folderId ?? (cleared.has("folderId") ? null : undefined),
		title: translation("title"),
		alt: translation("alt"),
		description: translation("description"),
		summary: translation("summary"),
		transcript: translation("transcript"),
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
				media: formatMediaItem(currentRes.data, localeRes.data),
				meta: { contentLocale: localeRes.data },
			},
		},
	};
};

export default updateMedia;
