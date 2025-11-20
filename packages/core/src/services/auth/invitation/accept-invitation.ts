import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import {
	UserTokensRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import { generateSecret } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Accepts an invitation by setting the user's password and marking the invitation as accepted.
 */
const acceptInvitation: ServiceFn<
	[
		{
			token: string;
			password: string;
		},
	],
	undefined
> = async (context, data) => {
	if (context.config.auth.password.enabled === false) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("password_authentication_disabled_message"),
			},
			data: undefined,
		};
	}

	const UserTokens = new UserTokensRepository(context.db, context.config.db);
	const Users = new UsersRepository(context.db, context.config.db);

	const tokenRes = await UserTokens.selectSingle({
		select: ["id", "user_id"],
		where: [
			{
				key: "token",
				operator: "=",
				value: data.token,
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.invitation,
			},
			{
				key: "expiry_date",
				operator: ">",
				value: new Date().toISOString(),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("token_not_found_message"),
				status: 404,
			},
		},
	});
	if (tokenRes.error) return tokenRes;

	const userRes = await Users.selectSingle({
		select: ["id", "invitation_accepted"],
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.user_id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: T("user_not_found_message"),
			},
		},
	});
	if (userRes.error) return userRes;

	if (formatter.formatBoolean(userRes.data?.invitation_accepted)) {
		return {
			error: {
				type: "basic",
				status: 400,
				name: T("user_invitation_already_accepted_name"),
				message: T("user_invitation_already_accepted_message"),
			},
			data: undefined,
		};
	}

	const { secret, encryptSecret } = generateSecret(
		context.config.keys.encryptionKey,
	);

	const hashedPassword = Buffer.from(
		scrypt(data.password, secret, constants.scrypt),
	).toString("base64");

	const updatedUserRes = await Users.updateSingle({
		data: {
			password: hashedPassword,
			secret: encryptSecret,
			invitation_accepted: true,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.user_id,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
			},
		},
	});
	if (updatedUserRes.error) return updatedUserRes;

	const deleteMultipleTokensRes = await UserTokens.deleteMultiple({
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.id,
			},
		],
	});
	if (deleteMultipleTokensRes.error) return deleteMultipleTokensRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default acceptInvitation;
