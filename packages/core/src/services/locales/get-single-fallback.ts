import type { ServiceFn } from "../../utils/services/types.js";

const getSingleFallback: ServiceFn<
	[
		{
			code?: string;
		},
	],
	{
		code: string;
	}
> = async (context, data) => {
	const configLocale = context.config.localization.locales.find(
		(locale) => locale.code === data.code,
	);

	if (configLocale === undefined && !data.code) {
		return {
			error: undefined,
			data: {
				code: context.config.localization.defaultLocale,
			},
		};
	}

	return {
		error: undefined,
		data: {
			code: data.code || context.config.localization.defaultLocale,
		},
	};
};

export default getSingleFallback;
