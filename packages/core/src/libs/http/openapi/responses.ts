import type { OpenAPIV3 } from "openapi-types";
import constants from "../../../constants/constants.js";
import { translate } from "../../i18n/index.js";

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

/** OpenAPI schema for Lucid's standard error response. */
export const defaultErrorResponse = {
	type: "object",
	description: translate("server:core.openapi.response.default"),
	properties: {
		status: {
			type: "number",
			nullable: true,
		},
		code: {
			type: "string",
			nullable: true,
		},
		key: {
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
 * Describes success envelopes, default Lucid errors and optional streaming responses.
 * @remarks Streaming endpoints may also define a JSON response.
 */
const responses = (config?: {
	/** OpenAPI data schema, defaulting to a 204 response when omitted on non-streaming endpoints. */
	dataSchema?: unknown;
	/** Success status, defaulting to 200, with 201 for creation and 202 for accepted asynchronous work. */
	status?: 200 | 201 | 202;
	/** Describes a 200 text/event-stream response of JSON encoded events. */
	stream?: true;
	/** OpenAPI schema for the sibling refs registry. */
	refsSchema?: unknown;
	/** Include pagination metadata and links. */
	paginated?: boolean;
	/** Describe an unspecified nullable object instead of envelope properties. */
	noProperties?: boolean;
}) => {
	const response: Record<
		string,
		| Omit<OpenAPIV3.ResponseObject, "headers" | "context" | "links">
		| OpenAPIV3.ReferenceObject
	> = {};

	if (config?.stream) {
		response[200] = {
			description: translate("server:core.openapi.response.stream"),
			content: {
				"text/event-stream": {
					schema: { type: "string" },
				},
			},
		};
	}

	if (config?.dataSchema) {
		response[config.status ?? 200] = {
			description: translate("server:core.openapi.response.200"),
			content: {
				"application/json": {
					schema:
						config.noProperties === true
							? { type: "object", nullable: true }
							: {
									type: "object",
									properties: {
										data: config.dataSchema,
										...(config.refsSchema ? { refs: config.refsSchema } : {}),
										meta: config.paginated ? paginatedMetaObject : metaObject,
										...(config.paginated ? { links: linksObject } : {}),
									},
								},
				},
			},
		};
	} else if (!config?.stream) {
		response[204] = {
			description: translate("server:core.openapi.response.204"),
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
		description: translate("server:core.openapi.response.default"),
		content: {
			"application/json": {
				schema: defaultErrorResponse,
			},
		},
	};

	return response;
};

export default responses;
