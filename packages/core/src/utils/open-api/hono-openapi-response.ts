import T from "../../translations/index.js";
import constants from "../../constants/constants.js";
import type { OpenAPIV3 } from "openapi-types";

const metaObject: OpenAPIV3.SchemaObject = {
	type: "object",
	properties: {
		path: { type: "string" },
		links: { type: "array", items: {} },
		currentPage: { type: "number", nullable: true, example: null },
		lastPage: { type: "number", nullable: true, example: null },
		perPage: { type: "number", nullable: true, example: null },
		total: { type: "number", nullable: true, example: null },
	},
};

const paginatedMetaObject: OpenAPIV3.SchemaObject = {
	type: "object",
	properties: {
		path: { type: "string" },
		links: {
			type: "array",
			items: {
				type: "object",
				properties: {
					active: { type: "boolean" },
					label: { type: "string" },
					url: { type: "string", nullable: true },
					page: { type: "number" },
				},
			},
		},
		currentPage: {
			type: "number",
			nullable: true,
			example: constants.query.page,
		},
		lastPage: {
			type: "number",
			nullable: true,
			example: 200 / constants.query.perPage,
		},
		perPage: {
			type: "number",
			nullable: true,
			example: constants.query.perPage,
		},
		total: { type: "number", nullable: true, example: 200 },
	},
};

const linksObject: OpenAPIV3.SchemaObject = {
	type: "object",
	properties: {
		first: { type: "string", nullable: true },
		last: { type: "string", nullable: true },
		next: { type: "string", nullable: true },
		prev: { type: "string", nullable: true },
	},
};

export const defaultErrorResponse = {
	type: "object",
	description: T("open_api_response_default"),
	properties: {
		status: {
			type: "number",
			nullable: true,
		},
		code: {
			type: "string",
			nullable: true,
		},
		name: {
			type: "string",
			nullable: true,
		},
		message: {
			type: "string",
			nullable: true,
		},
		errors: {
			type: "object",
			nullable: true,
			additionalProperties: true,
		},
	},
	additionalProperties: true,
} as const;

/**
 * Used to construct a response object for OpenAPI
 */
const honoOpenAPIResponse = (config?: {
	schema?: unknown;
	paginated?: boolean;
	noProperties?: boolean;
}) => {
	const response: Record<
		string,
		OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject
	> = {};

	if (config?.schema) {
		response[200] = {
			description: T("open_api_response_200"),
			content: {
				"application/json": {
					schema:
						config.noProperties === true
							? { type: "object", nullable: true }
							: {
									type: "object",
									properties: {
										data: config.schema,
										meta: config.paginated ? paginatedMetaObject : metaObject,
										...(config.paginated ? { links: linksObject } : {}),
									},
								},
				},
			},
		};
	} else {
		response[204] = {
			description: T("open_api_response_204"),
			content: {
				"application/json": {
					schema: {
						type: "object",
						nullable: true,
					},
				},
			},
		};
	}

	response.default = {
		description: T("open_api_response_default"),
		content: {
			"application/json": {
				schema: defaultErrorResponse,
			},
		},
	};

	return response;
};

export default honoOpenAPIResponse;
