import type { LucidPluginCliFactory } from "@lucidcms/core/types";
import rebuild from "./rebuild.js";
import status from "./status.js";

const typesenseCli: LucidPluginCliFactory = () => ({
	commands: [
		{
			name: "typesense:rebuild",
			description:
				"Rebuild every Typesense index from its sources, swapping each in once it's complete",
			run: rebuild,
		},
		{
			name: "typesense:status",
			description:
				"Show each Typesense index's pending changes, rebuild progress and last error",
			run: status,
		},
	],
});

export default typesenseCli;
