import type z from "zod";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import getAllLocales from "../../get-all.js";
import { inputSchema, type localeSchema, outputSchema } from "./schema.js";

/** Lists content languages separately from CMS interface languages. */
export const listLocalesTool = defineTool({
	target: "mcp",
	name: "locales_list",
	description:
		"List available content languages and CMS interface languages, including each default locale. Use page and perPage for more locales.",
	input: inputSchema,
	output: outputSchema,
	scopes: [ExternalScopes.LocalesRead],
	annotations: { readOnlyHint: true },
	handler: async ({ context, input }) => {
		const localesRes = await getAllLocales(context);
		if (localesRes.error) return localesRes;

		const locales: z.output<typeof localeSchema>[] = [
			...localesRes.data.map((locale) => ({
				purpose: "content" as const,
				code: locale.code,
				name: locale.name ?? locale.code,
				direction: locale.direction,
				isDefault: locale.isDefault,
			})),
			...context.config.i18n.locales.map((locale) => ({
				purpose: "interface" as const,
				code: locale.code,
				name: locale.label,
				direction: locale.direction ?? "ltr",
				isDefault: locale.code === context.config.i18n.defaultLocale,
			})),
		];

		return {
			error: undefined,
			data: {
				output: {
					...paginate(locales, input.page, input.perPage),
					meta: {
						content: {
							defaultLocale: context.config.localization.defaultLocale,
							availableCount: localesRes.data.length,
						},
						interface: {
							defaultLocale: context.config.i18n.defaultLocale,
							currentLocale: context.request.locale,
							availableCount: context.config.i18n.locales.length,
						},
					},
				},
			},
		};
	},
});
