import {
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	openAPI,
	z,
} from "@lucidcms/core";
import { PREVIOUS_PATHS_ROUTE } from "../constants.js";
import { controllerSchemas } from "../schema/previous-paths.js";
import deletePreviousPath from "../services/delete-previous-path.js";
import getPreviousPaths from "../services/get-previous-paths.js";
import type { RedirectTargetCollection } from "../types/types.js";

/** Routes for a page's old paths, one set per pages collection so each checks that collection's permissions. */
const previousPathsRoutes = (collections: RedirectTargetCollection[]) =>
	collections.flatMap((collection) => {
		const collectionKey = collection.key;
		return [
			defineRoute({
				method: "get",
				path: `${PREVIOUS_PATHS_ROUTE}/${collectionKey}/:documentId`,
				schema: controllerSchemas.getMultiple,
				middleware: [
					middleware.authenticate(),
					middleware.permissions(`documents:${collectionKey}:read`),
				],
				openAPI: {
					description: `Lists a ${collectionKey} page's old paths, which redirect to its current path.`,
					tags: ["pages-plugin"],
					summary: "Get Previous Paths",
					responses: openAPI.responses({
						dataSchema: z.toJSONSchema(controllerSchemas.getMultiple.response),
					}),
					parameters: openAPI.parameters({
						params: controllerSchemas.getMultiple.params,
						query: controllerSchemas.getMultiple.query.string,
					}),
				},
				handler: async ({ hono, context, input }) => {
					const paths = await getPreviousPaths(context, {
						collection,
						documentId: input.params.documentId,
						environment: input.query.environment,
					});
					if (paths.error) throw new LucidError(paths.error);

					hono.status(200);
					return hono.json(formatAPIResponse(hono, { data: paths.data }));
				},
			}),
			defineRoute({
				method: "delete",
				path: `${PREVIOUS_PATHS_ROUTE}/${collectionKey}/:documentId/:id`,
				schema: controllerSchemas.deleteSingle,
				middleware: [
					middleware.validateCSRF(),
					middleware.authenticate(),
					middleware.permissions(`documents:${collectionKey}:update`),
				],
				openAPI: {
					description: `Removes one of a ${collectionKey} page's old paths, so it no longer redirects.`,
					tags: ["pages-plugin"],
					summary: "Delete Previous Path",
					responses: openAPI.responses({ noProperties: true }),
					parameters: openAPI.parameters({
						headers: { csrf: true },
						params: controllerSchemas.deleteSingle.params,
					}),
				},
				handler: async ({ hono, context, input }) => {
					const deleted = await deletePreviousPath(context, {
						collectionKey,
						documentId: input.params.documentId,
						id: input.params.id,
					});
					if (deleted.error) throw new LucidError(deleted.error);

					hono.status(204);
					return hono.body(null);
				},
			}),
		];
	});

export default previousPathsRoutes;
