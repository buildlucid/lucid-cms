import type { Config, LucidConfig } from "../types/config.js";
import constants from "./constants.js";

export const defaultConfig: Partial<LucidConfig> = {
	logger: {
		level: "info",
	},
	auth: {
		password: {
			enabled: true,
		},
		providers: [],
	},
	email: {
		from: {
			email: "hello@mylucid.cms",
			name: "Lucid CMS",
		},
		simulate: false,
	},
	disableOpenAPI: false,
	localization: {
		locales: [
			{
				label: "English",
				code: "en",
			},
		],
		defaultLocale: "en",
	},
	media: {
		storageLimit: 5368709120,
		maxFileSize: 16777216,
		fallbackImage: undefined,
		processedImageLimit: 10,
		storeProcessedImages: true,
		onDemandFormats: false,
		imagePresets: {
			thumbnail: {
				height: 200,
				format: "webp",
				quality: 80,
			},
		},
	},
	hono: {
		middleware: [],
		extensions: [],
	},
	hooks: [],
	collections: [],
	plugins: [],
	compilerOptions: {
		paths: {
			outDir: "dist",
			emailTemplates: "./templates",
			copyPublic: [],
		},
		watch: {
			ignore: [],
		},
	},
	softDelete: {
		defaultRetentionDays: constants.retention,
	} satisfies Config["softDelete"],
};

export default defaultConfig;
