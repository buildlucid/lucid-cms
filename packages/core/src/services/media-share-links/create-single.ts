import crypto from "node:crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import Formatter from "../../libs/formatters/index.js";
import Repository from "../../libs/repositories/index.js";
import type { MediaShareLinkResponse } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			mediaId: number;
			name?: string;
			description?: string;
			password?: string;
			expiresAt?: string;
			userId: number;
		},
	],
	MediaShareLinkResponse
> = async (context, data) => {
	const MediaShareLinks = Repository.get(
		"media-share-links",
		context.db,
		context.config.db,
	);
	const formatter = Formatter.get("media-share-links");

	const token = crypto.randomBytes(9).toString("base64url").slice(0, 12);

	const hashedPassword = data.password
		? Buffer.from(
				scrypt(
					data.password,
					context.config.keys.encryptionKey,
					constants.scrypt,
				),
			).toString("base64")
		: null;

	const linkRes = await MediaShareLinks.createSingle({
		data: {
			media_id: data.mediaId,
			token: token,
			password: hashedPassword,
			expires_at: Formatter.normalizeDate(data.expiresAt) ?? undefined,
			name: data.name ?? null,
			description: data.description ?? null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: data.userId,
			updated_by: data.userId,
		},
		returning: [
			"id",
			"media_id",
			"token",
			"password",
			"expires_at",
			"name",
			"description",
			"created_at",
			"updated_at",
			"created_by",
			"updated_by",
		],
		validation: { enabled: true },
	});
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: formatter.formatSingle({
			link: linkRes.data,
			host: context.config.host,
		}),
	};
};

export default createSingle;
