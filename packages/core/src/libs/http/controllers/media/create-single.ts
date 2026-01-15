import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description: "Creates a single media item.",
		tags: ["media"],
		summary: "Create Media",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateMedia]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const body = c.req.valid("json");

		const mediaRes = await serviceWrapper(mediaServices.createSingle, {
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
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				key: body.key,
				fileName: body.fileName,
				title: body.title,
				alt: body.alt,
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
		if (mediaRes.error) throw new LucidAPIError(mediaRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: mediaRes.data,
			}),
		);
	},
);

export default createSingleController;
