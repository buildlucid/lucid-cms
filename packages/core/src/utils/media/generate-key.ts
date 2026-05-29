import crypto from "node:crypto";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import type { ServiceResponse } from "../services/types.js";

/**
 * Generates a unique key for a media file.
 */
const generateKey = (props: {
	name: string;
	public: boolean;
	temporary?: boolean;
}): Awaited<ServiceResponse<string>> => {
	const name = props.name.trim();

	if (!name) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.media.name.invalid"),
				message: copy("server:core.media.name.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const uuid = crypto.randomUUID().replaceAll("-", "");
	const prefix = props.temporary
		? `${constants.media.awaitingSyncKey}/`
		: `${props.public ? "public" : "private"}/`;

	return {
		error: undefined,
		data: `${prefix}${uuid}`,
	};
};

export default generateKey;
