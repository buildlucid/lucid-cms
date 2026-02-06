import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { logger } from "../../../../index.js";
import { controllerSchemas } from "../../../../schemas/fs.js";
import { fsServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import getMediaAdapter from "../../../media-adapter/get-adapter.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const uploadMediaController = factory.createHandlers(
	describeRoute({
		description: "Upload a single media file.",
		tags: ["localstorage-plugin"],
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
		scope: constants.rateLimit.scopes.low.scopeKey,
		limit: constants.rateLimit.scopes.low.limit,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("query", controllerSchemas.upload.query.string),
	async (c) => {
		const mediaAdapter = await getMediaAdapter(c.get("config"));
		if (!mediaAdapter.enabled || mediaAdapter.adapter.key !== "file-system") {
			logger.error({
				message: "File system adapter is not enabled",
			});
			throw new LucidAPIError({
				type: "basic",
				name: T("route_fs_upload_error_name"),
				message: T("route_fs_upload_error_message"),
			});
		}

		const query = c.req.valid("query");
		const buffer = await c.req.arrayBuffer();
		const context = getServiceContext(c);

		const uploadMedia = await serviceWrapper(fsServices.uploadSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_fs_upload_error_name"),
				message: T("route_fs_upload_error_message"),
			},
		})(context, {
			buffer: buffer ? Buffer.from(buffer) : undefined,
			key: query.key,
			token: query.token,
			timestamp: query.timestamp,
			mediaAdapterOptions: mediaAdapter.adapter?.getOptions?.(),
		});
		if (uploadMedia.error) throw new LucidAPIError(uploadMedia.error);

		c.status(204);
		return c.body(null);
	},
);

export default uploadMediaController;
