import { createFactory } from "hono/factory";

const factory = createFactory();

const loginController = factory.createHandlers(async (c) => {
	return c.json({ message: "Hello, world!" });
});

export default loginController;
