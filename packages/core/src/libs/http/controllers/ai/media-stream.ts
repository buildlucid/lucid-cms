import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { mediaGenerationPermissions } from "../../../config/ai-features.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

/** Streams generated media using the connection's access token. */
const mediaStreamController = factory.createHandlers(
	describeRoute({
		description: "Stream a file generated with Lucid AI, for previews.",
		tags: ["ai"],
		summary: "Stream Generated Media",
		parameters: openAPI.parameters({
			params: controllerSchemas.mediaStream.params,
		}),
	}),
	authenticate(),
	permissions({ some: mediaGenerationPermissions }),
	validate("param", controllerSchemas.mediaStream.params),
	async (c) => {
		const { key } = c.req.valid("param");
		const context = createServiceContext(c);

		const mediaRes = await serviceWrapper(aiServices.mediaStream, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.routes.ai.generate.error.message"),
			},
		})(context, {
			storageKey: key,
			//* only simple byte ranges are forwarded, which is what players send to seek
			range: c.req.header("range")?.match(/^bytes=\d+-\d*$/)?.[0],
			signal: c.req.raw.signal,
			user: c.get("auth"),
		});
		if (mediaRes.error) throw new LucidAPIError(mediaRes.error);

		c.header("Content-Type", mediaRes.data.contentType);
		c.header("Cache-Control", "private, max-age=3600");
		c.header("X-Content-Type-Options", "nosniff");
		c.header("Accept-Ranges", "bytes");
		if (mediaRes.data.eTag) c.header("ETag", mediaRes.data.eTag);
		if (mediaRes.data.lastModified) {
			c.header("Last-Modified", mediaRes.data.lastModified);
		}
		if (mediaRes.data.contentLength !== undefined) {
			c.header("Content-Length", String(mediaRes.data.contentLength));
		}
		if (mediaRes.data.contentRange) {
			c.status(206);
			c.header("Content-Range", mediaRes.data.contentRange);
		}

		return stream(c, (stream) => stream.pipe(mediaRes.data.body));
	},
);

export default mediaStreamController;
