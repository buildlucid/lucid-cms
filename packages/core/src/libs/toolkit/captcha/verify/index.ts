import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitCaptchaVerifyInput,
	ToolkitCaptchaVerifyResult,
} from "./types.js";

export type * from "./types.js";

const verify = async (
	context: ServiceContext,
	input: ToolkitCaptchaVerifyInput,
): ServiceResponse<ToolkitCaptchaVerifyResult> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: verifyToken } =
				await import("../../../../services/captcha/verify.js");

			return verifyToken(context, data);
		},
		name: {
			key: "core.toolkit.captcha.verify.error.name",
			defaultMessage: "Captcha Toolkit Error",
		},
		message: {
			key: "core.toolkit.captcha.verify.error.message",
			defaultMessage: "Lucid toolkit could not check the captcha token.",
		},
	});
};

export default verify;
