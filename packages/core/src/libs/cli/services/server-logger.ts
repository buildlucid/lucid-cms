import type { AddressInfo } from "node:net";
import { clearScreenDown, cursorTo } from "node:readline";
import constants from "../../../constants/constants.js";
import {
	createPrefix,
	formatTimestamp,
	shouldUseConsoleColors,
} from "../../logger/console-transport/formatters.js";
import cliLogger from "../logger.js";

export const getServerUrl = (address: AddressInfo | string | null) => {
	if (typeof address === "string") return address;
	if (!address) return "unknown";
	const hostname =
		address.address === "::"
			? "localhost"
			: address.family === "IPv6"
				? `[${address.address}]`
				: address.address;
	return `http://${hostname}:${address.port}`;
};

/** Prints the full introduction once per CLI session, with the website when `urls.site` is set. */
export const logServerReady = (url: string, site?: string) => {
	cliLogger.log(
		cliLogger.createBadge("LUCID CMS"),
		"Development server ready",
		{ spaceBefore: true, spaceAfter: true },
	);
	logServerUrls(url, site);
	cliLogger.log(
		"📖 Documentation    ",
		cliLogger.color.blue(constants.documentation),
		{ symbol: "line" },
	);
	cliLogger.log(cliLogger.color.gray("Press CTRL-C to stop the server"), {
		spaceBefore: true,
		spaceAfter: true,
	});
};

/** Logs the admin panel and, when `urls.site` is set, the website resolved against the server URL. */
export const logServerUrls = (url: string, site?: string) => {
	cliLogger.log("🔐 Admin panel      ", cliLogger.color.blue(`${url}/admin`), {
		symbol: "line",
	});
	if (site) {
		cliLogger.log(
			"🌐 Website          ",
			cliLogger.color.blue(new URL(site, url).toString()),
			{ symbol: "line" },
		);
	}
};

export const logRestart = (message: string) => {
	cliLogger.log(
		createPrefix({
			colors: shouldUseConsoleColors(),
			owner: "core",
			timestamp: formatTimestamp(new Date().toISOString(), true),
		}),
		message,
	);
};

/** Clears the visible screen without deleting scrollback or writing escapes to log files. */
export const clearDevScreen = () => {
	if (!process.stdout.isTTY || process.env.CI) return;
	process.stdout.write(
		"\n".repeat(Math.max(0, (process.stdout.rows ?? 0) - 2)),
	);
	cursorTo(process.stdout, 0, 0);
	clearScreenDown(process.stdout);
};
