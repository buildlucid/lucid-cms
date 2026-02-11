import { Readable } from "node:stream";
import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
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

const downloadMediaController = factory.createHandlers(
	describeRoute({
		description: "Download a single media file from local storage.",
		tags: ["localstorage-plugin"],
		summary: "Download File",
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.download.query.string,
		}),
		responses: honoOpenAPIResponse(),
	}),
	rateLimiter({
		mode: "ip",
		scope: constants.rateLimit.scopes.low.scopeKey,
		limit: constants.rateLimit.scopes.low.limit,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("query", controllerSchemas.download.query.string),
	async (c) => {
		const mediaAdapter = await getMediaAdapter(c.get("config"));
		if (!mediaAdapter.enabled || mediaAdapter.adapter.key !== "file-system") {
			logger.error({
				message: "File system adapter is not enabled",
			});
			throw new LucidAPIError({
				type: "basic",
				name: T("route_fs_download_error_name"),
				message: T("route_fs_download_error_message"),
			});
		}

		const query = c.req.valid("query");
		const context = getServiceContext(c);

		const downloadMedia = await serviceWrapper(fsServices.downloadSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_fs_download_error_name"),
				message: T("route_fs_download_error_message"),
			},
		})(context, {
			key: query.key,
			token: query.token,
			timestamp: query.timestamp,
			mediaAdapterOptions: mediaAdapter.adapter?.getOptions?.(),
		});
		if (downloadMedia.error) throw new LucidAPIError(downloadMedia.error);

		const fileName = query.key.split("/").filter(Boolean).at(-1) ?? query.key;
		c.header("Content-Disposition", `attachment; filename="${fileName}"`);
		if (downloadMedia.data.contentLength !== undefined) {
			c.header("Content-Length", String(downloadMedia.data.contentLength));
		}
		if (downloadMedia.data.contentType) {
			c.header("Content-Type", downloadMedia.data.contentType);
		}

		return stream(c, async (honoStream) => {
			if (downloadMedia.data.body instanceof Readable) {
				for await (const chunk of downloadMedia.data.body) {
					await honoStream.write(chunk);
				}
			}
		});
	},
);

export default downloadMediaController;
