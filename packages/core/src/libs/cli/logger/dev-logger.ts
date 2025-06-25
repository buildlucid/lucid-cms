import constants from "../../../constants/constants.js";
import { colours, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";
import type { AddressInfo } from "node:net";

export interface DevLogger extends SharedLogger {
	serverStarting: (adapterName: string) => void;
	serverStarted: (
		address: AddressInfo | string | null,
		startTime: [number, number],
	) => void;
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
}

const createDevLogger = (): DevLogger => ({
	serverStarting: (adapterName: string) => {
		console.log(`\n${divider}\n`);
		console.log(`🚀 Starting ${adapterName} development server...`);
	},
	serverStarted: (
		address: AddressInfo | string | null,
		startTime: [number, number],
	) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

		const serverUrl =
			typeof address === "string"
				? address
				: address
					? `http://${address.address === "::" ? "localhost" : address.address}:${address.port}`
					: "unknown";

		console.log(`\n${divider}\n`);
		console.log(
			`${formatBadge("READY", colours.bgLimeGreen, colours.textGreen)} ${colours.textLimeGreen}Development server ready${colours.reset} in ${formatDuration(milliseconds)}\n`,
		);

		console.log(
			`┃ 🔐 Admin panel       ${colours.textBlue}${serverUrl}/admin${colours.reset}`,
		);
		console.log(
			`┃ 📖 Documentation     ${colours.textBlue}${constants.documentation}${colours.reset}`,
		);
		console.log(
			`\n${colours.textGray}Press CTRL-C to stop the server${colours.reset}`,
		);
	},
	...sharedLogger(),
});

export default createDevLogger;
