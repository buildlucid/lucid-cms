import type z from "zod";
import { paginate } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getAllLocales from "../../get-all.js";
import type { inputSchema, localeSchema, outputSchema } from "./schema.js";

/** Lists content languages separately from CMS interface languages. */
const listLocales: ServiceFn<
	[{ input: z.output<typeof inputSchema> }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
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
				...paginate(locales, props.input.page, props.input.perPage),
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
};

export default listLocales;
