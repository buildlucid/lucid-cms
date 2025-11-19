import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { z } from "zod/v4";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { authServices } from "../../../../services/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const csrfController = factory.createHandlers(
	describeRoute({
		description:
			"This endpoint returns a CSRF token in the response body as well as setting a _csrf httpOnly cookie. Some endpoints require this value to be passed via a X-CSRF-Token header.",
		tags: ["auth"],
		summary: "CSRF Token",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getCSRF.response),
		}),
		validateResponse: true,
	}),
	async (c: LucidHonoContext) => {
		const tokenRes = await authServices.csrf.generateToken(c);
		if (tokenRes.error) throw new LucidAPIError(tokenRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: {
					_csrf: tokenRes.data,
				},
			}),
		);
	},
);

export default csrfController;
