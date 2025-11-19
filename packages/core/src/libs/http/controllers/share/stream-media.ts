import { Readable } from "node:stream";
import { getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import type { StatusCode } from "hono/utils/http-status";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/share.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIParamaters } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";
import {
	renderErrorPage,
	renderPasswordForm,
} from "../../../../utils/share-link/renderers.js";
import validate from "../../middleware/validate.js";
import {
	applyRangeHeaders,
	applyStreamingHeaders,
	parseRangeHeader,
} from "../../utils/streaming.js";

const factory = createFactory();

/**
 * Stream shared media content by token.
 * Handles password protection, expired links, and deleted media.
 * Returns an HTML password form if authentication is required, or streams the media content.
 */
const streamMediaController = factory.createHandlers(
	describeRoute({
		description:
			"Access a shared media file by token. If password-protected, returns a minimal HTML password form.",
		tags: ["share"],
		summary: "Stream Shared Media",
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.streamMedia.params,
		}),
		validateResponse: false,
	}),
	validate("param", controllerSchemas.streamMedia.params),
	async (c) => {
		const { token } = c.req.valid("param");

		const range = parseRangeHeader(c.req.header("range"));

		const cookieName = createAuthCookieName(token);
		const sessionCookie = getCookie(c, cookieName);

		const authorizeRes = await serviceWrapper(
			mediaShareLinkServices.authorizeShare,
			{ transaction: false },
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{ token, sessionCookie },
		);
		if (authorizeRes.error) {
			const status = (authorizeRes.error.status || 400) as StatusCode;
			c.status(status);
			c.header("Content-Type", "text/html; charset=utf-8");
			return c.body(
				renderErrorPage(
					authorizeRes.error.name || T("share_link_error_title"),
					authorizeRes.error.message || T("unknown_service_error"),
				),
			);
		}

		if (authorizeRes.data.passwordRequired && !sessionCookie) {
			c.status(200);
			c.header("Content-Type", "text/html; charset=utf-8");
			return c.body(renderPasswordForm());
		}

		const response = await serviceWrapper(mediaShareLinkServices.streamMedia, {
			transaction: false,
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				mediaKey: authorizeRes.data.mediaKey,
				range,
			},
		);
		if (response.error) throw new LucidAPIError(response.error);

		applyRangeHeaders(c, {
			isPartial: response.data.isPartialContent,
			range: response.data.range,
			totalSize: response.data.totalSize,
		});
		applyStreamingHeaders(c, {
			key: response.data.key,
			contentLength: response.data.contentLength,
			contentType: response.data.contentType,
		});

		return stream(c, async (stream) => {
			if (response.data.body instanceof ReadableStream) {
				await stream.pipe(response.data.body);
			} else if (response.data.body instanceof Uint8Array) {
				await stream.write(response.data.body);
			} else if (response.data.body instanceof Readable) {
				for await (const chunk of response.data.body) {
					await stream.write(chunk);
				}
			}
		});
	},
);

export default streamMediaController;
