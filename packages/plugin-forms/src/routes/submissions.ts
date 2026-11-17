import {
	copy,
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	openAPI,
	serviceWrapper,
	z,
} from "@lucidcms/core";
import {
	routes,
	SUBMISSIONS_READ_PERMISSION,
	submissions,
} from "../constants.js";
import { controllerSchemas } from "../schema/forms.js";
import exportSubmissions from "../services/submissions/export-submissions.js";
import getFileDownload from "../services/submissions/get-file-download.js";

/**
 * Admin routes for people who can read submissions: a form's submissions as a CSV file, and a
 * submission's uploaded files, which aren't in the media library.
 */
const submissionsRoutes = () => [
	defineRoute({
		method: "get",
		path: routes.export,
		schema: controllerSchemas.exportSubmissions,
		middleware: [
			middleware.authenticate(),
			middleware.rateLimiter({
				mode: "user",
				scope: "forms-submissions-export",
				limit: submissions.exportRateLimit,
				windowMs: submissions.exportRateLimitWindowMs,
			}),
			middleware.permissions([SUBMISSIONS_READ_PERMISSION]),
		],
		openAPI: {
			description:
				"Returns every stored submission of a form as CSV, oldest first, with a column per field.",
			tags: ["forms-plugin"],
			summary: "Export Form Submissions",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(
					controllerSchemas.exportSubmissions.response,
				),
			}),
		},
		handler: async ({ hono, context, input }) => {
			const csv = await serviceWrapper(exportSubmissions, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.forms.export.error.name"),
					message: copy("server:plugin.forms.export.error.message"),
				},
			})(context, { form: input.query.form });
			if (csv.error) throw new LucidError(csv.error);

			return hono.json(
				formatAPIResponse(hono, {
					data: {
						fileName: `${input.query.form}-submissions.csv`,
						csv: csv.data,
					},
				}),
			);
		},
	}),
	defineRoute({
		method: "post",
		path: `${routes.files}/:id/files/:mediaId/download`,
		schema: controllerSchemas.fileDownload,
		middleware: [
			middleware.validateCSRF(),
			middleware.authenticate(),
			middleware.permissions([SUBMISSIONS_READ_PERMISSION]),
		],
		openAPI: {
			description:
				"Returns a temporary download URL for a file uploaded with a submission.",
			tags: ["forms-plugin"],
			summary: "Download Submission File",
			responses: openAPI.responses({
				dataSchema: z.toJSONSchema(controllerSchemas.fileDownload.response),
			}),
			parameters: openAPI.parameters({ headers: { csrf: true } }),
		},
		handler: async ({ hono, context, input }) => {
			const download = await serviceWrapper(getFileDownload, {
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.forms.file.error.name"),
					message: copy("server:plugin.forms.file.not.found"),
				},
			})(context, {
				submissionId: input.params.id,
				mediaId: input.params.mediaId,
			});
			if (download.error) throw new LucidError(download.error);

			return hono.json(formatAPIResponse(hono, { data: download.data }));
		},
	}),
];

export default submissionsRoutes;
