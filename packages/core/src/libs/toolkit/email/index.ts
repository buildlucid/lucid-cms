import T from "../../../translations/index.js";
import toolkitWrapper from "../toolkit-wrapper.js";
import lucidServices from "../../../services/index.js";
import { toolkitSchemas } from "../../../schemas/email.js";
import type { ExtractServiceFnArgs } from "../../../utils/services/types.js";

const emailToolkit = {
	sendEmail: async (
		...data: ExtractServiceFnArgs<typeof lucidServices.email.sendExternal>
	) =>
		toolkitWrapper({
			fn: lucidServices.email.sendExternal,
			data: data,
			config: {
				transaction: true,
				schema: toolkitSchemas.sendExtenal,
				defaultError: {
					name: T("send_email_error_name"),
				},
			},
		}),
};

export default emailToolkit;
