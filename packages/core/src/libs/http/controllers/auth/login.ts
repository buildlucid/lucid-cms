import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/auth.js";

const factory = createFactory();

const loginController = factory.createHandlers(
	validate("json", controllerSchemas.login.body),
	async (c) => {
		const { usernameOrEmail, password } = c.req.valid("json");

		console.log(usernameOrEmail, password);

		return c.json({ message: "Hello, world!" });
	},
);

export default loginController;
