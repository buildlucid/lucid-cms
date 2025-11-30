import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import type { DocumentVersionType } from "../../../db-adapter/types.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single document from the collection key and ID.",
		tags: ["documents"],
		summary: "Get Document",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
			query: controllerSchemas.getSingle.query.string,
		}),
		validateResponse: true,
	}),
	authenticate,
	validate("param", controllerSchemas.getSingle.params),
	validate("query", controllerSchemas.getSingle.query.string),
	async (c) => {
		const { collectionKey, id, statusOrId } = c.req.valid("param");
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getSingle.query.formatted,
		);

		const isVersionId = !Number.isNaN(Number(statusOrId));

		const document = await serviceWrapper(documentServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_document_fetch_error_name"),
				message: T("route_document_fetch_error_message"),
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
				id: Number.parseInt(id),
				status: !isVersionId ? (statusOrId as DocumentVersionType) : undefined,
				versionId: isVersionId ? Number.parseInt(statusOrId) : undefined,
				collectionKey,
				query: formattedQuery,
			},
		);
		if (document.error) throw new LucidAPIError(document.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: document.data,
			}),
		);
	},
);

export default getSingleController;
