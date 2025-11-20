import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import generateShareToken from "../../utils/share-link/generate-token.js";

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
	const MediaShareLinks = new MediaShareLinksRepository(
		context.db,
		context.config.db,
	);

	let password: string | null | undefined;
	let tokenRefresh: string | undefined = undefined;
	if (data.password === null) {
		password = null;
	} else if (typeof data.password === "string") {
		password = Buffer.from(
			scrypt(
				data.password,
				context.config.keys.encryptionKey,
				constants.scrypt,
			),
		).toString("base64");
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
