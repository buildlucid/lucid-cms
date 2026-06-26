import type { DescribeRouteOptions } from "hono-openapi";
import type { OpenAPIV3 } from "openapi-types";
import z, { type ZodType } from "zod";
import constants from "../../../constants/constants.js";
import { translate } from "../../i18n/index.js";

/**
 * Used to construct parameters JSON schema for OpenAPI.
 */
const parameters = (props: {
	headers?: {
		// Undefined omits the header, boolean controls whether it is required.
		csrf?: boolean;
		authorization?: boolean;
		idempotencyKey?: boolean;
	};
	params?: ZodType;
	query?: ZodType;
}) => {
	const routeParameters: DescribeRouteOptions["parameters"] = [];

	if (props.headers?.csrf !== undefined) {
		routeParameters.push({
			in: "header",
			name: constants.headers.csrf,
			required: props.headers.csrf,
			description: translate("server:core.openapi.csrf.header.description"),
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.idempotencyKey !== undefined) {
		routeParameters.push({
			in: "header",
			name: constants.headers.idempotencyKey,
			required: props.headers.idempotencyKey,
			description: translate(
				"server:core.openapi.idempotency.key.header.description",
			),
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.authorization !== undefined) {
		routeParameters.push({
			in: "header",
			name: "Authorization",
			required: props.headers.authorization,
			description: translate(
				"server:core.openapi.authorization.header.description",
			),
			schema: {
				type: "string",
			},
		});
	}

	if (props.params) {
		const paramsSchema = z.toJSONSchema(props.params) as OpenAPIV3.SchemaObject;
		if (paramsSchema.properties) {
			for (const [paramName, paramSchema] of Object.entries(
				paramsSchema.properties,
			)) {
				const schema = paramSchema as OpenAPIV3.SchemaObject;
				routeParameters.push({
					name: paramName,
					in: "path",
					required: true,
					description: schema.description,
					example: schema.example,
				});
			}
		}
	}

	if (props.query) {
		const querySchema = z.toJSONSchema(props.query) as OpenAPIV3.SchemaObject;
		if (querySchema.properties) {
			for (const [paramName, paramSchema] of Object.entries(
				querySchema.properties,
			)) {
				const schema = paramSchema as OpenAPIV3.SchemaObject;
				routeParameters.push({
					name: paramName,
					in: "query",
					required: querySchema.required?.includes(paramName),
					description: schema.description,
					example: schema.example,
				});
			}
		}
	}

	return routeParameters;
};

export default parameters;
