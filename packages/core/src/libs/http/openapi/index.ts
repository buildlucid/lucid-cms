import parameters from "./parameters.js";
import requestBody from "./request-body.js";
import responses, { defaultErrorResponse } from "./responses.js";
import schema from "./schema.js";

const openAPI = {
	parameters,
	requestBody,
	responses,
	schema,
	defaultErrorResponse,
};

export default openAPI;
