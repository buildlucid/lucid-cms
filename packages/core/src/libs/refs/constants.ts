import type { RefResource } from "../../exports/types.js";

export const refResourceKeys = [
	"documents",
	"media",
	"users",
	"emails",
	"agents",
] as const satisfies readonly RefResource[];
