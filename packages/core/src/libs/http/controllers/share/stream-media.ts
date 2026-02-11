import { Readable } from "node:stream";
import { minutesToMilliseconds } from "date-fns";
import { getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/share.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIParamaters } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import getServiceContext from "../../utils/get-service-context.js";
import {
	applyRangeHeaders,
	applyStreamingHeaders,
	parseRangeHeader,
} from "../../utils/streaming.js";

const factory = createFactory();

/**
 * Stream shared media content by token for previewable media types.
 */
const streamMediaController = factory.createHandlers(
	describeRoute({
		description: "Streams shared media content by token.",
		tags: ["share"],
		summary: "Stream Shared Media",
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.streamShareMedia.params,
		}),
	}),
	rateLimiter({
		mode: "ip",
		scope: constants.rateLimit.scopes.stream.scopeKey,
		limit: constants.rateLimit.scopes.stream.limit,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", controllerSchemas.streamShareMedia.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = getServiceContext(c);
		const range = parseRangeHeader(c.req.header("range"));

		const cookieName = createAuthCookieName(token);
		const sessionCookie = getCookie(c, cookieName);

		const authorizeRes = await serviceWrapper(
			mediaShareLinkServices.authorizeShare,
			{ transaction: false },
		)(context, {
			token,
			sessionCookie,
			enforcePasswordSession: true,
		});
		if (authorizeRes.error) throw new LucidAPIError(authorizeRes.error);

		const shareAccessRes = await serviceWrapper(
			mediaShareLinkServices.getShareAccess,
			{ transaction: false },
		)(context, { token, sessionCookie });
		if (shareAccessRes.error) throw new LucidAPIError(shareAccessRes.error);

		if (shareAccessRes.data.passwordRequired) {
			throw new LucidAPIError({
				type: "authorisation",
				status: 401,
				name: T("share_stream_password_required_title"),
				message: T("share_stream_password_required_message"),
			});
		}

		//* we only support previews on images, video and audio for the time being
		if (!shareAccessRes.data.media.previewable) {
			throw new LucidAPIError({
				type: "basic",
				status: 415,
				name: T("share_stream_unsupported_media_type_name"),
				message: T("share_stream_unsupported_media_type_message"),
			});
		}

		const response = await serviceWrapper(mediaShareLinkServices.streamMedia, {
			transaction: false,
		})(context, { mediaKey: authorizeRes.data.mediaKey, range });
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
