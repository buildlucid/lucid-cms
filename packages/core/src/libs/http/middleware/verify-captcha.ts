import type { CaptchaForm } from "@lucidcms/types";
import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import { captchaServices } from "../../../services/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import getCaptchaForms from "../../captcha/get-forms.js";
import createServiceContext from "../utils/create-service-context.js";

/** Checks the captcha token header for protected forms. Use after rate limiting and before validation. Signed-in requests skip it. */
const verifyCaptcha = (form: CaptchaForm) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const policy = getCaptchaForms(c.get("config").captcha)[form];
		if (!policy.enabled || c.get("auth")) return await next();

		const verifyRes = await serviceWrapper(captchaServices.verify, {
			transaction: false,
		})(createServiceContext(c), {
			token: c.req.header(constants.headers.captcha),
			action: policy.action,
		});
		if (verifyRes.error) throw new LucidAPIError(verifyRes.error);

		return await next();
	});

export default verifyCaptcha;
