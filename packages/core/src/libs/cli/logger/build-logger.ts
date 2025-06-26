import { colours, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";

export interface BuildLogger extends SharedLogger {
	appBuildStart: (adapterName: string) => [number, number];
	appBuildComplete: (startTime: [number, number]) => void;
	buildFailed: (error: unknown) => void;
	buildComplete: (startTime: [number, number]) => void;
	buildStart: () => void;
}

const createBuildLogger = (): BuildLogger => ({
	appBuildStart: (adapterName: string): [number, number] => {
		console.log(`┃ 🏗️  Building for production with ${adapterName} adapter...`);
		return process.hrtime();
	},
	appBuildComplete: (startTime: [number, number]) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

		console.log(
			`┃ ✨ Build completed ${colours.textGreen}successfully${colours.reset} in ${formatDuration(milliseconds)}`,
		);
	},

	buildFailed: (error: unknown) => {
		console.error(`${colours.textRed}Build failed${colours.reset}`);
		console.error(error);
	},
	buildStart: () => {
		console.log(`\n${divider}\n`);
	},
	buildComplete: (startTime: [number, number]) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;
		console.log(
			`\n${formatBadge("READY", colours.bgLimeGreen, colours.textGreen)} Build completed ${colours.textGreen}successfully${colours.reset} in ${formatDuration(milliseconds)}\n`,
		);
	},

	...sharedLogger(),
});

export default createBuildLogger;
