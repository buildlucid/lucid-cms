import z from "zod";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { describeRoute } from "hono-openapi";
import { honoSwaggerResponse } from "../../../../utils/swagger/index.js";
import type { OpenAPIV3 } from "openapi-types";

const factory = createFactory();

const loginController = factory.createHandlers(
	describeRoute({
		description:
			"Authenticates a user and sets a refresh and access token as httpOnly cookies.",
		tags: ["auth"],
		summary: "Login",

		responses: honoSwaggerResponse({
			headers: {
				csrf: true,
			},
		}),
		requestBody: {
			content: {
				"application/json": {
					schema: z.toJSONSchema(
						controllerSchemas.login.body,
					) as OpenAPIV3.SchemaObject,
				},
			},
		},
		validateResponse: true,
	}),
	validate("json", controllerSchemas.login.body),
	async (c) => {
		const { usernameOrEmail, password } = c.req.valid("json");

		console.log(usernameOrEmail, password);

		return c.json({ message: "Hello, world!" });
	},
);

export default loginController;
