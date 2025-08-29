import { colors } from "./helpers.js";

export type SharedLogger = {
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
	warn: (message: string) => void;
	envValidationFailed: (message?: string) => void;
};

const sharedLogger = (silent?: boolean): SharedLogger => ({
	error: (message: string, error?: unknown) => {
		if (silent) return;

		console.error(`${colors.textRed}${message}${colors.reset}`);
		if (error) {
			console.error(error);
		}
	},
	info: (message: string) => {
		if (silent) return;

		console.log(`${colors.textBlue}${message}${colors.reset}`);
	},
	warn: (message: string) => {
		if (silent) return;

		console.warn(`${colors.textYellow}${message}${colors.reset}`);
	},
	envValidationFailed: (message?: string) => {
		if (silent || !message) return;
		console.error(
			`${colors.textRed}❌ Environment validation failed${colors.reset}`,
		);
		console.log("");
		console.log(message);
		console.log("");
	},
});

export default sharedLogger;
