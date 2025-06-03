import z, { type ZodType } from "zod";
import T from "../../translations/index.js";
import type { DescribeRouteOptions } from "hono-openapi";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Used to construct paramaters JSON schema for Swagger
 */
const honoSwaggerParamaters = (props: {
	headers?: {
		// undefine means dont include in the schema, boolean means required or not
		csrf?: boolean;
		contentLocale?: boolean;
		clientKey?: boolean;
		authorization?: boolean;
	};
	params?: ZodType;
}) => {
	const paramaters: DescribeRouteOptions["parameters"] = [];

	if (props.headers?.csrf !== undefined) {
		paramaters.push({
			in: "header",
			name: "_csrf",
			required: props.headers.csrf,
			description: T("swagger_csrf_header_description"),
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.contentLocale !== undefined) {
		paramaters.push({
			in: "header",
			name: "lucid-content-locale",
			required: props.headers.contentLocale,
			description: T("swagger_content_locale_header_description"),
			example: "en",
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.clientKey !== undefined) {
		paramaters.push({
			in: "header",
			name: "lucid-client-key",
			required: props.headers.clientKey,
			description: T("swagger_client_key_header_description"),
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.authorization !== undefined) {
		paramaters.push({
			in: "header",
			name: "Authorization",
			required: props.headers.authorization,
			description: T("swagger_authorization_header_description"),
			schema: {
				type: "string",
			},
		});
	}

	if (props.params) {
		paramaters.push({
			schema: z.toJSONSchema(props.params) as OpenAPIV3.SchemaObject,
			name: "token",
			in: "path",
		});
	}

	return paramaters;
};

export default honoSwaggerParamaters;
