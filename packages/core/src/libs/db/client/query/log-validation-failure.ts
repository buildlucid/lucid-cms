import z, { type ZodError } from "zod";
import constants from "../../../../constants/constants.js";
import logger from "../../../logger/index.js";
import type { QueryExecutionMeta } from "./executor.js";

/** Logs query response validation failures with field paths. */
const logValidationFailure = (props: {
	meta: QueryExecutionMeta;
	error: ZodError;
}) => {
	logger.error({
		event: "query.response.validation.failed",
		message: "Response validation failed",
		scope: constants.logScopes.query,
		data: {
			table: props.meta.tableName,
			method: props.meta.method,
			executionTime: props.meta.executionTime,
			issues: props.error.issues.map((issue) => ({
				path: z.core.toDotPath(issue.path),
				message: issue.message,
			})),
		},
	});
};

export default logValidationFailure;
