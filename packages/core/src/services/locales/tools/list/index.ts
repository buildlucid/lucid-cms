import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { LucidError } from "../../../../utils/errors/index.js";
import listLocales from "./handler.js";
import { inputSchema, outputSchema } from "./schema.js";

export const listLocalesTool = () =>
	defineTool({
		name: "locales_list",
		title: copy("admin:core.tools.locales_list.title"),
		description:
			"List available content and CMS interface languages, including their defaults. Returns paginated results.",
		input: inputSchema,
		output: outputSchema,
		readOnly: true,
		agent: { permissions: [], parallelSafe: true },
		mcp: { scopes: [ExternalScopes.LocalesRead] },
		handler: async ({ context, input }) => {
			const result = await listLocales(context, { input });
			if (result.error) throw new LucidError(result.error);
			const count = result.data.output.data.length;

			return {
				...result.data,
				summary: copy(
					count === 1
						? "admin:core.tools.locales_list.summary.one"
						: "admin:core.tools.locales_list.summary",
					{ data: { count } },
				),
			};
		},
	});
