import type { Hono } from "hono";
import type { ResolvedLucidConfig } from "../../../exports/types.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import type { HttpExtension, HttpExtensionPhase } from "../types.js";

const runHttpExtensions = async (props: {
	extensions: HttpExtension[];
	phase: HttpExtensionPhase;
	app: Hono<LucidHonoGeneric>;
	config: ResolvedLucidConfig;
}) => {
	for (const extension of props.extensions) {
		if (extension.phase === props.phase) {
			await extension.register(props.app, props.config);
		}
	}
};

export default runHttpExtensions;
