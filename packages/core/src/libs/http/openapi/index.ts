import parameters from "./parameters.js";
import requestBody from "./request-body.js";
import responses, { defaultErrorResponse } from "./responses.js";
import schema from "./schema.js";

/** Helpers for describing route parameters, request bodies, schemas and response envelopes. */
const openAPI = {
	parameters,
	requestBody,
	responses,
	schema,
	defaultErrorResponse,
};

export default openAPI;
