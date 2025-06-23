import type { LucidConfig } from "../types/config.js";

export const defaultConfig: Partial<LucidConfig> = {
	logLevel: "info",
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
		storageLimit: 5368709120,
		maxFileSize: 16777216,
		fallbackImage: undefined,
		strategy: undefined,
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
		outDir: "dist",
		emailTemplates: "./templates",
	},
};

export default defaultConfig;
