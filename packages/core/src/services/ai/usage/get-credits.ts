import getRemoteCredits from "../../../libs/lucid-remote/services/get-credits.js";
import type { AiCredits } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";

const getCredits: ServiceFn<[], AiCredits> = async (context) => {
	const token = await getAccessToken(context, {});
	if (token.error) return token;

	const credits = await getRemoteCredits(context, {
		accessToken: token.data.accessToken,
	});
	if (credits.error?.status === 401) {
		await handleProtectedResourceUnauthorized(context);
	}

	return credits;
};

export default getCredits;
