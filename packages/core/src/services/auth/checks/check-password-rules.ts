import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Reports the first schema issue on `field`. Run before consuming tokens or writing changes.
 */
const checkPasswordRules: ServiceFn<
	[
		{
			password: string;
			/** Request body key for validation errors. */
			field: string;
		},
	],
	undefined
> = async (context, data) => {
	const result = await context.config.auth.password.schema.safeParseAsync(
		data.password,
	);
	const issue = result.error?.issues[0];

	if (issue) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.input.password.invalid"),
				status: 400,
				errors: {
					[data.field]: {
						code: issue.code,
						message: copy.literal(issue.message),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkPasswordRules;
