import type { RefResource } from "../../exports/types.js";

export const refResourceKeys = [
	"documents",
	"media",
	"users",
] as const satisfies readonly RefResource[];
