import { copy } from "../../../../libs/i18n/index.js";
import type { AgentToolAuthority } from "../../../../libs/tools/types.js";
import type { Media } from "../../../../types/response.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import agentMediaAccessError from "../../../agent/helpers/agent-media-access-error.js";
import getSingle from "../../get-single.js";

/** Loads library media and, with agent authority, the acting person's personal media, treating binned media as missing. */
const getToolMedia: ServiceFn<
	[{ id: number; authority?: AgentToolAuthority }],
	Media
> = async (context, props) => {
	const mediaRes = await getSingle(context, {
		id: props.id,
		actor: props.authority ? { type: "internal" } : { type: "content" },
	});
	if (mediaRes.error) return mediaRes;
	if (mediaRes.data.isDeleted) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.media.not.found.message"),
			},
			data: undefined,
		};
	}

	const accessError = props.authority
		? agentMediaAccessError({
				mediaId: props.id,
				ownership: mediaRes.data.ownership,
				authority: props.authority,
			})
		: undefined;
	if (accessError) return { error: accessError, data: undefined };

	return { error: undefined, data: mediaRes.data };
};

export default getToolMedia;
