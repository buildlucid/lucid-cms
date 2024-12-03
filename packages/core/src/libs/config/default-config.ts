import type { LucidConfig } from "../../types/config.js";

export const defaultConfig: Partial<LucidConfig> = {
	paths: {
		emailTemplates: "./templates",
	},
	email: undefined,
	disableSwagger: false,
	localisation: {
		locales: [
			{
				label: "English",
				code: "en",
			},
		],
		defaultLocale: "en",
	},
	media: {
		storage: 5368709120,
		maxSize: 16777216,
		processed: {
			limit: 10,
			store: false,
		},
		fallbackImage: undefined,
		strategy: undefined,
	},
	fastifyExtensions: [],
	hooks: [],
	collections: [],
	plugins: [],
};

export default defaultConfig;
