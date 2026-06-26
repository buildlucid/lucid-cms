import parameters from "./parameters.js";
import requestBody from "./request-body.js";
import responses, { defaultErrorResponse } from "./responses.js";

const openAPI = {
	parameters,
	requestBody,
	responses,
	defaultErrorResponse,
};

export default openAPI;
