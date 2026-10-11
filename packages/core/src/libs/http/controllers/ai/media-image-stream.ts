import { createFactory } from "hono/factory";
import { stream } from "hono/streaming";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

/** Streams generated images using the connection's access token. */
const mediaImageStreamController = factory.createHandlers(
	describeRoute({
		description: "Stream an image generated with Lucid AI.",
		tags: ["ai"],
		summary: "Stream Generated Media Image",
		parameters: openAPI.parameters({
			params: controllerSchemas.mediaImageStream.params,
		}),
	}),
	authenticate(),
	permissions([Permissions.AiImageGenerate]),
	validate("param", controllerSchemas.mediaImageStream.params),
	async (c) => {
		const { key } = c.req.valid("param");
		const context = createServiceContext(c);

		const imageRes = await serviceWrapper(aiServices.mediaImageStream, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.generate.error.name"),
				message: copy("server:core.routes.ai.generate.error.message"),
			},
		})(context, { storageKey: key, signal: c.req.raw.signal });
		if (imageRes.error) throw new LucidAPIError(imageRes.error);

		c.header("Content-Type", imageRes.data.contentType);
		c.header("Cache-Control", "private, max-age=3600");
		c.header("X-Content-Type-Options", "nosniff");
		if (imageRes.data.contentLength !== undefined) {
			c.header("Content-Length", String(imageRes.data.contentLength));
		}

		return stream(c, (stream) => stream.pipe(imageRes.data.body));
	},
);

export default mediaImageStreamController;
