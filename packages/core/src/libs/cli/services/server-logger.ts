import type { AddressInfo } from "node:net";
import { clearScreenDown, cursorTo } from "node:readline";
import constants from "../../../constants/constants.js";
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

/** Prints the full introduction once per CLI session. */
export const logServerReady = (url: string) => {
	cliLogger.log(
		cliLogger.createBadge("LUCID CMS"),
		"Development server ready",
		{ spaceBefore: true, spaceAfter: true },
	);
	logAdminUrl(url);
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

export const logAdminUrl = (url: string) =>
	cliLogger.log("🔐 Admin panel      ", cliLogger.color.blue(`${url}/lucid`), {
		symbol: "line",
	});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
	hour: "numeric",
	minute: "2-digit",
	second: "2-digit",
	hour12: true,
});

export const logRestart = (message: string) => {
	cliLogger.log(
		cliLogger.color.gray(timeFormatter.format(new Date())),
		cliLogger.color.blue("[core]"),
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
