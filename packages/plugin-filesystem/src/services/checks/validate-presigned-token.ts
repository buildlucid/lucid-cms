import { validateSignedMediaUrl } from "@lucidcms/core/media";
import { copy } from "@lucidcms/core/plugin";
import type { ServiceFn } from "@lucidcms/core/types";

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
				message: copy(
					"server:plugin.filesystem.media.tokens.invalid.or.expired",
				),
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
