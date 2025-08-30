import T from "../../../translations/index.js";
import type { Config } from "../../../types/config.js";
import type { ServiceFn } from "../../../utils/services/types.js";

type EmailSection = NonNullable<Config["email"]>;

type EmailConfigReady = {
	identifier: NonNullable<EmailSection["identifier"]>;
	from: NonNullable<EmailSection["from"]>;
	strategy: NonNullable<EmailSection["strategy"]>;
	simulate: EmailSection["simulate"];
};

const checkHasEmailConfig: ServiceFn<[], EmailConfigReady> = async (
	context,
) => {
	if (
		context.config.email === undefined ||
		context.config.email.identifier === undefined ||
		context.config.email.from === undefined ||
		context.config.email.strategy === undefined
	) {
		return {
			error: {
				type: "basic",
				name: T("config_error_name"),
				message: T("email_not_configured_message"),
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			identifier: context.config.email.identifier,
			from: context.config.email.from,
			strategy: context.config.email.strategy,
			simulate: context.config.email.simulate,
		},
	};
};

export default checkHasEmailConfig;
