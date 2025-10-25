import { Readable } from "node:stream";
import type { StatusCode } from "hono/utils/http-status";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/share.js";
import services from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIParamaters } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import validate from "../../middleware/validate.js";
import { getCookie } from "hono/cookie";
import {
	applyRangeHeaders,
	applyStreamingHeaders,
	parseRangeHeader,
} from "../../utils/streaming.js";
import {
	renderErrorPage,
	renderPasswordForm,
} from "../../../../utils/share-link/renderers.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";

const factory = createFactory();

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
			services.mediaShareLinks.authorizeShare,
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
					status === 404 ? T("page_not_found") : T("media_not_found_name"),
					authorizeRes.error.message || T("unknown_service_error"),
				),
			);
		}

		if (authorizeRes.data.passwordRequired && !sessionCookie) {
			c.status(200);
			c.header("Content-Type", "text/html; charset=utf-8");
			return c.body(renderPasswordForm());
		}

		const response = await serviceWrapper(
			services.mediaShareLinks.streamMedia,
			{
				transaction: false,
			},
		)(
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
