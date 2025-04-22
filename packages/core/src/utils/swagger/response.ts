import T from "../../translations/index.js";
import constants from "../../constants/constants.js";
import type { FastifySchema } from "fastify";

// Response metadata structures
const metaObject = {
	type: "object",
	properties: {
		path: { type: "string" },
		links: { type: "array" },
		currentPage: { type: "number", nullable: true, example: null },
		lastPage: { type: "number", nullable: true, example: null },
		perPage: { type: "number", nullable: true, example: null },
		total: { type: "number", nullable: true, example: null },
	},
};

const paginatedMetaObject = {
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

const linksObject = {
	type: "object",
	properties: {
		first: { type: "string", nullable: true },
		last: { type: "string", nullable: true },
		next: { type: "string", nullable: true },
		prev: { type: "string", nullable: true },
	},
};

// Standard error responses
export const defaultErrorResponse = {
	type: "object",
	description: T("swagger_response_default"),
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
};

const swaggerResponse = (config: {
	schema?: unknown;
	paginated?: boolean;
	noProperties?: boolean;
}): FastifySchema["response"] => {
	const response: Record<string, unknown> = {};

	if (config.schema) {
		response[200] = {
			description: T("swagger_response_200"),
			type: config.noProperties === true ? "null" : "object",
			properties:
				config.noProperties === true
					? undefined
					: {
							data: config.schema,
							meta: config.paginated ? paginatedMetaObject : metaObject,
							...(config.paginated ? { links: linksObject } : {}),
						},
		};
	} else {
		response[204] = {
			description: T("swagger_response_204"),
			type: "null",
		};
	}

	// response[400] = {
	// 	description: T("swagger_response_400"),
	// 	...defaultErrorResponse,
	// };

	// response[401] = {
	// 	description: T("swagger_response_401"),
	// 	...defaultErrorResponse,
	// };

	// response[403] = {
	// 	description: T("swagger_response_403"),
	// 	...defaultErrorResponse,
	// };

	// response[404] = {
	// 	description: T("swagger_response_404"),
	// 	...defaultErrorResponse,
	// };

	// response[500] = {
	// 	description: T("swagger_response_500"),
	// 	...defaultErrorResponse,
	// };

	response.default = defaultErrorResponse;

	return response;
};

export default swaggerResponse;
