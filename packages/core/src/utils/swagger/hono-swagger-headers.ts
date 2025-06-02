import T from "../../translations/index.js";
import type { DescribeRouteOptions } from "hono-openapi";

interface SwaggerHeaders {
	// undefine means dont include in the schema, boolean means required or not
	csrf?: boolean;
	contentLocale?: boolean;
	clientKey?: boolean;
	authorization?: boolean;
}

/**
 * Used to construct headers JSON schema for Swagger
 */
const honoSwaggerHeaders = (headers: SwaggerHeaders) => {
	const headerObjects: DescribeRouteOptions["parameters"] = [];

	if (headers.csrf !== undefined) {
		headerObjects.push({
			in: "header",
			name: "_csrf",
			required: headers.csrf,
			description: T("swagger_csrf_header_description"),
			schema: {
				type: "string",
			},
		});
	}
	if (headers.contentLocale !== undefined) {
		headerObjects.push({
			in: "header",
			name: "lucid-content-locale",
			required: headers.contentLocale,
			description: T("swagger_content_locale_header_description"),
			example: "en",
			schema: {
				type: "string",
			},
		});
	}
	if (headers.clientKey !== undefined) {
		headerObjects.push({
			in: "header",
			name: "lucid-client-key",
			required: headers.clientKey,
			description: T("swagger_client_key_header_description"),
			schema: {
				type: "string",
			},
		});
	}
	if (headers.authorization !== undefined) {
		headerObjects.push({
			in: "header",
			name: "Authorization",
			required: headers.authorization,
			description: T("swagger_authorization_header_description"),
			schema: {
				type: "string",
			},
		});
	}

	return headerObjects;
};

export default honoSwaggerHeaders;
