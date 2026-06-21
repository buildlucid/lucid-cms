import {
	copy,
	createServiceContext,
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
	LucidAPIError,
	rateLimiterMiddleware as rateLimiter,
	serviceWrapper,
	validateMiddleware as validate,
} from "@lucidcms/core/plugin";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import {
	FILE_SYSTEM_RATE_LIMIT,
	FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
} from "../constants.js";
import { controllerSchemas } from "../schema/fs.js";
import { uploadSingle } from "../services/index.js";

const factory = createFactory();

const uploadMediaController = factory.createHandlers(
	describeRoute({
		description: "Upload a single media file.",
		tags: ["filesystem-plugin"],
		summary: "Upload File",
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.upload.query.string,
		}),
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
	}),
	rateLimiter({
		mode: "ip",
		scope: "filesystem-upload",
		limit: FILE_SYSTEM_RATE_LIMIT,
		windowMs: FILE_SYSTEM_RATE_LIMIT_WINDOW_MS,
	}),
	validate("query", controllerSchemas.upload.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const query = c.req.valid("query");
		const buffer = await c.req.arrayBuffer();

		const uploadMedia = await serviceWrapper(uploadSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:plugin.filesystem.media.routes.upload.error.name"),
				message: copy(
					"server:plugin.filesystem.media.routes.upload.error.message",
				),
			},
		})(context, {
			buffer: buffer ? Buffer.from(buffer) : undefined,
			key: query.key,
			mimeType: query.mimeType,
			extension: query.extension,
			token: query.token,
			timestamp: query.timestamp,
		});
		if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

		c.status(204);
		return c.body(null);
	},
);

export default uploadMediaController;
