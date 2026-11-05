import describeRoute from "./describe-route.js";
import parameters from "./parameters.js";
import requestBody from "./request-body.js";
import responses, { defaultErrorResponse } from "./responses.js";
import schema from "./schema.js";

/** OpenAPI route, parameter, body, schema and response helpers. */
const openAPI = {
	describeRoute,
	parameters,
	requestBody,
	responses,
	schema,
	defaultErrorResponse,
};

export default openAPI;
