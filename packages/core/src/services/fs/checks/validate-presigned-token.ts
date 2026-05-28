import { serverText } from "../../../libs/i18n/index.js";
import { validateSignedMediaUrl } from "../../../libs/media/signed-url.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const validatePresignedToken: ServiceFn<
	[
		{
			key: string;
			token: string;
			timestamp: string;
			secretKey: string;
			path: string;
			query?: Record<string, string | number | undefined>;
		},
	],
	undefined
> = async (_, data) => {
	if (
		!validateSignedMediaUrl({
			path: data.path,
			key: data.key,
			token: data.token,
			timestamp: data.timestamp,
			secretKey: data.secretKey,
			query: data.query,
		})
	) {
		return {
			error: {
				status: 403,
				type: "basic",
				message: serverText("core.tokens.invalid.or.expired"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default validatePresignedToken;
