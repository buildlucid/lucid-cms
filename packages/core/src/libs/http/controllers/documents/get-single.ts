import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import type { DocumentVersionType } from "../../../db/types.js";

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

		const hasStatus = statusOrId === "draft" || statusOrId === "published";

		const document = await serviceWrapper(
			services.collection.documents.getSingle,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_document_fetch_error_name"),
					message: T("route_document_fetch_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
				queue: c.get("queue"),
			},
			{
				id: Number.parseInt(id),
				status: hasStatus ? (statusOrId as DocumentVersionType) : undefined,
				versionId: !hasStatus ? Number.parseInt(statusOrId) : undefined,
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
