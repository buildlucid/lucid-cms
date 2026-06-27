import type { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import type { Config } from "../../../types.js";
import type { HttpExtension, HttpExtensionPriority } from "../types.js";

const runHttpExtensions = async (props: {
	extensions: HttpExtension[];
	priority: HttpExtensionPriority;
	app: Hono<LucidHonoGeneric>;
	config: Config;
}) => {
	for (const extension of props.extensions) {
		if (extension.priority === props.priority) {
			await extension.register(props.app, props.config);
		}
	}
};

export default runHttpExtensions;
