import { createFactory } from "hono/factory";
import type { LucidHonoContext } from "../../../../types/hono.js";

const factory = createFactory();

const healthController = factory.createHandlers(async (c: LucidHonoContext) => {
	c.header("Cache-Control", "no-store");

	try {
		await c
			.get("database")
			.client.selectNoFrom((eb) => eb.val(1).as("health"))
			.executeTakeFirstOrThrow();

		c.status(200);
		return c.json({
			status: "ok",
		});
	} catch {
		c.status(503);
		return c.json({
			status: "unhealthy",
		});
	}
});

export default healthController;
