import formatter from "../../libs/formatters/index.js";
import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";
import generateShareToken from "../../utils/share-link/generate-token.js";
import assertMediaAccess from "./helpers/assert-media-access.js";

const updateSingle: ServiceFn<
	[
		{
			mediaId: number;
			linkId: number;
			name?: string;
			description?: string;
			password?: string | null;
			expiresAt?: string | null;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaAccessRes = await assertMediaAccess(context, {
		mediaId: data.mediaId,
	});
	if (mediaAccessRes.error) return mediaAccessRes;

	const MediaShareLinks = new MediaShareLinksRepository(context.db);

	let password: string | null | undefined;
	let tokenRefresh: string | undefined;
	if (data.password === null) {
		password = null;
	} else if (typeof data.password === "string") {
		password = await hashSecret(
			data.password,
			context.config.secrets.encryption,
		);
		tokenRefresh = generateShareToken();
	}

	const updateRes = await MediaShareLinks.updateSingle({
		where: [
			{ key: "id", operator: "=", value: data.linkId },
			{ key: "media_id", operator: "=", value: data.mediaId },
		],
		data: {
			name: data.name,
			description: data.description,
			expires_at: formatter.normalizeDate(data.expiresAt),
			password,
			token: tokenRefresh,
			updated_at: new Date().toISOString(),
			updated_by: data.userId,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSingle;
