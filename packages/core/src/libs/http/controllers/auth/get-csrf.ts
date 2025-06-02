import { z } from "zod";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/auth.js";
import services from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import { honoSwaggerResponse } from "../../../../utils/swagger/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";

const factory = createFactory();

const csrfController = factory.createHandlers(
	describeRoute({
		description:
			"This endpoint returns a CSRF token in the response body as well as setting a _csrf httpOnly cookie. Some endpoints require this value to be passed via a _csrf header.",
		tags: ["auth"],
		summary: "CSRF Token",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getCSRF.response),
		}),
		validateResponse: true,
	}),
	async (c: LucidHonoContext) => {
		const tokenRes = await services.auth.csrf.generateToken(c);
		if (tokenRes.error) throw new LucidAPIError(tokenRes.error);

		c.status(201);
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
