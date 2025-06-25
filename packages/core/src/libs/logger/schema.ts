import z from "zod/v4";
import type { LogTransport } from "./types.js";

export const LogLevelSchema = z.union([
	z.literal("error"),
	z.literal("warn"),
	z.literal("info"),
	z.literal("debug"),
	z.literal("silent"),
]);

export const LogTransportSchema = z.custom<LogTransport>(
	(data) => typeof data === "object" && data !== null,
	{
		message: "Expected a LogTransport object",
	},
);
