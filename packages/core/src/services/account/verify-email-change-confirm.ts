import constants from "../../constants/constants.js";
import { EmailChangeRequestsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { userTokenServices } from "../index.js";

const verifyEmailChangeConfirm: ServiceFn<
	[
		{
			token: string;
		},
	],
	undefined
> = async (context, data) => {
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		context.db.client,
		context.config.db,
	);

	const tokenRes = await userTokenServices.getSingle(context, {
		token: data.token,
		tokenType: constants.userTokens.emailChangeConfirm,
	});
	if (tokenRes.error) return tokenRes;

	const requestRes = await EmailChangeRequests.selectByConfirmTokenId({
		tokenId: tokenRes.data.id,
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: T("token_not_found_message"),
			},
		},
	});
	if (requestRes.error) return requestRes;

	if (
		requestRes.data.status !== constants.emailChangeRequestStatuses.pending ||
		requestRes.data.user_id !== tokenRes.data.user_id
	) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: T("token_not_found_message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyEmailChangeConfirm;
