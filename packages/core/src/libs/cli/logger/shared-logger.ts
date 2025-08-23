import { colors } from "./helpers.js";

export type SharedLogger = {
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
	warn: (message: string) => void;
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
});

export default sharedLogger;
