import { colours } from "./helpers.js";

export type SharedLogger = {
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
	warn: (message: string) => void;
};

const sharedLogger = (silent?: boolean): SharedLogger => ({
	error: (message: string, error?: unknown) => {
		if (silent) return;

		console.error(`${colours.textRed}${message}${colours.reset}`);
		if (error) {
			console.error(error);
		}
	},
	info: (message: string) => {
		if (silent) return;

		console.log(`${colours.textBlue}${message}${colours.reset}`);
	},
	warn: (message: string) => {
		if (silent) return;

		console.warn(`${colours.textYellow}${message}${colours.reset}`);
	},
});

export default sharedLogger;
