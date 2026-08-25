import type { RefResource } from "../../types.js";

export const refResourceKeys = [
	"documents",
	"media",
	"users",
] as const satisfies readonly RefResource[];
