import { Hono } from "hono";
import { expect, test } from "vitest";
import formatAPIResponse from "./build-response.js";

test.each([
	false,
	0,
	"",
	null,
])("response formatting preserves %j and reference metadata", async (data) => {
	const app = new Hono();
	app.get("/test", (c) =>
		c.json(formatAPIResponse(c, { data, refs: { document: {} } })),
	);
	const response = await app.request("http://localhost/test");
	expect(await response.json()).toMatchObject({ data, refs: { document: {} } });
});
