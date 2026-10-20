import { memoryLoader } from "@lucidkiln/core";
import { expect, test } from "vitest";
import hashTemplates from "./hash-templates.js";

test("a translation edit changes the cache namespace, so cached fragments don't keep old text", async () => {
	const loader = memoryLoader({
		"pages/index.kiln": `{{ translate("nav.home") }}`,
	});
	const hash = (home: string) =>
		hashTemplates(loader, ["pages/index.kiln"], { en: { "nav.home": home } });

	expect(await hash("Home")).toBe(await hash("Home"));
	expect(await hash("Updated")).not.toBe(await hash("Home"));
});
