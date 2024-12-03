import T from "../../translations/index.js";

interface SwaggerHeaders {
	// undefine means dont include in the schema, boolean means required or not
	csrf?: boolean;
	contentLocale?: boolean;
	clientKey?: boolean;
	authorization?: boolean;
}

const swaggerHeaders = (headers: SwaggerHeaders) => {
	//* see constants.headers
	const propertise: {
		_csrf?: {
			type: string;
			description: string;
		};
		"lucid-content-locale"?: {
			type: string;
			description: string;
		};
		"lucid-client-key"?: {
			type: string;
			description: string;
		};
		Authorization?: {
			type: string;
			description: string;
		};
	} = {};
	const required: string[] = [];

	if (headers.csrf !== undefined) {
		propertise._csrf = {
			type: "string",
			description: T("swagger_csrf_header_description"),
		};
		if (headers.csrf) {
			required.push("_csrf");
		}
	}
	if (headers.contentLocale !== undefined) {
		propertise["lucid-content-locale"] = {
			type: "string",
			description: T("swagger_content_locale_header_description"),
		};
	}
	if (headers.clientKey !== undefined) {
		propertise["lucid-client-key"] = {
			type: "string",
			description: T("swagger_client_key_header_description"),
		};
	}
	if (headers.authorization !== undefined) {
		propertise.Authorization = {
			type: "string",
			description: T("swagger_authorization_header_description"),
		};
	}

	return {
		type: "object",
		properties: propertise,
		required: required,
	};
};

export default swaggerHeaders;
