import crypto from "node:crypto";
import type { ServiceFn } from "@lucidcms/core/types";
import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";

const validatePresignedToken: ServiceFn<
	[
		{
			key: string;
			token: string;
			timestamp: string;
			secretKey: string;
		},
	],
	undefined
> = async (_, data) => {
	const expectedToken = crypto
		.createHmac("sha256", data.secretKey)
		.update(`${data.key}${data.timestamp}`)
		.digest("hex");

	if (
		data.token !== expectedToken ||
		Date.now() - Number.parseInt(data.timestamp, 10) >
			constants.presignedUrlExpiration
	) {
		return {
			error: {
				status: 403,
				type: "basic",
				message: T("invalid_or_expired_token"),
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
