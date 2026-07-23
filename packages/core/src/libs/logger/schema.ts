import z from "zod";
import type { LogTransport } from "./types.js";

export const LogLevelSchema = z.union([
	z.literal("error"),
	z.literal("warn"),
	z.literal("info"),
	z.literal("debug"),
	z.literal("silent"),
]);

export const LogTransportSchema = z.custom<LogTransport>(
	(data) => {
		if (typeof data !== "object" || data === null || !("write" in data)) {
			return false;
		}

		if (typeof data.write !== "function") return false;
		if ("flush" in data && typeof data.flush !== "function") return false;
		if ("destroy" in data && typeof data.destroy !== "function") return false;

		return true;
	},
	{
		message:
			"Expected a LogTransport object with a write function and optional flush and destroy functions",
	},
);
