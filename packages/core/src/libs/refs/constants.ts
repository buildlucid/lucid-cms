import type { RefResource } from "../../exports/types.js";

export const refResourceKeys = [
	"documents",
	"media",
	"users",
	"agents",
] as const satisfies readonly RefResource[];
