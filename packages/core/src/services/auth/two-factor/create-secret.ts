import crypto from "node:crypto";
import constants from "../../../constants/constants.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { TwoFactorSetup } from "../../../types/response.js";
import { encrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import encodeBase32 from "./helpers/base32.js";
import { createTotpUri } from "./helpers/totp.js";

/** Creates a pending secret and QR URI. The active secret works until the new one is confirmed. */
const createSecret: ServiceFn<
	[
		{
			userId: number;
		},
	],
	TwoFactorSetup
> = async (context, data) => {
	const Users = new UsersRepository(context.db);

	const userRes = await Users.selectSingle({
		select: ["email"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) return userRes;

	const secret = crypto.randomBytes(constants.twoFactor.secretBytes);

	const updateRes = await Users.updateSingle({
		data: {
			two_factor_pending_secret: encrypt(
				secret.toString("hex"),
				context.config.secrets.encryption,
			),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: {
			secret: encodeBase32(secret),
			uri: createTotpUri({
				secret,
				issuer: context.config.brand.name,
				account: userRes.data.email,
			}),
		},
	};
};

export default createSecret;
