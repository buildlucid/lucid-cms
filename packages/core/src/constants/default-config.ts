import type { LucidConfig } from "../types/config.js";

export const defaultConfig: Partial<LucidConfig> = {
	logger: {
		level: "info",
	},
	email: {
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
	queue: {
		defaultJobOptions: {
			maxAttempts: 3,
		},
		processing: {
			concurrentLimit: 5,
			batchSize: 10,
		},
	},
	hooks: [],
	collections: [],
	plugins: [],
	compilerOptions: {
		paths: {
			outDir: "dist",
			emailTemplates: "./templates",
		},
		watch: {
			ignore: [],
		},
	},
};

export default defaultConfig;
