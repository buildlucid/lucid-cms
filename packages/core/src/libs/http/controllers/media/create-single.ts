import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/media.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Creates a single media item.",
		tags: ["media"],
		summary: "Create Media",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["create_media"]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");

		const mediaIdRes = await serviceWrapper(services.media.createSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_create_error_name"),
				message: T("route_media_create_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
			},
			{
				key: body.key,
				fileName: body.fileName,
				title: body.title,
				alt: body.alt,
				public: true,
				width: body.width,
				height: body.height,
				blurHash: body.blurHash,
				averageColor: body.averageColor,
				isDark: body.isDark,
				isLight: body.isLight,
				folderId: body.folderId,
				userId: c.get("auth").id,
			},
		);
		if (mediaIdRes.error) throw new LucidAPIError(mediaIdRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default createSingleController;
