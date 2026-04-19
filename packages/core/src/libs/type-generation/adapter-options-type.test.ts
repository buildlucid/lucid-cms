import { expect, test } from "vitest";
import generateAdapterOptionsTypes from "./adapter-options-type.js";

test("generates adapter option types keyed by adapter.module", async () => {
	const result = await generateAdapterOptionsTypes({
		adapterModule: "@lucidcms/node-adapter",
	});

	expect(result?.imports).toContain(
		'import type { AdapterOptionsType as LucidAdapterOptions } from "@lucidcms/node-adapter/types";',
	);
	expect(result?.types).toContain(
		'interface AdapterOptionsByModule { "@lucidcms/node-adapter": LucidAdapterOptions; }',
	);
});
