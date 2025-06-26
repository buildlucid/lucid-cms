import { colours } from "./helpers.js";

export type SharedLogger = {
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
	warn: (message: string) => void;
};

const sharedLogger = (): SharedLogger => ({
	error: (message: string, error?: unknown) => {
		console.error(`${colours.textRed}${message}${colours.reset}`);
		if (error) {
			console.error(error);
		}
	},
	info: (message: string) => {
		console.log(`${colours.textBlue}${message}${colours.reset}`);
	},
	warn: (message: string) => {
		console.warn(`${colours.textYellow}${message}${colours.reset}`);
	},
});

export default sharedLogger;
