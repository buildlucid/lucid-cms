import getRemoteCredits from "../../../libs/lucid-remote/services/get-credits/index.js";
import type { AiCredits } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleRemoteError from "../../connection/helpers/handle-remote-error.js";
import getAccessToken from "../../connection/token-manager.js";

const getCredits: ServiceFn<[], AiCredits> = async (context) => {
	const token = await getAccessToken(context, {});
	if (token.error) return token;

	const credits = await getRemoteCredits(context, {
		accessToken: token.data.accessToken,
	});
	if (credits.error) await handleRemoteError(context, credits.error);

	return credits;
};

export default getCredits;
