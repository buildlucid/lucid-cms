import T from "../../translations/index.js";
import constants from "../../constants/constants.js";

const metaObject = {
	type: "object",
	properties: {
		path: { type: "string" },
		links: {
			type: "array",
		},
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

interface SwaggerResponseParams {
	type: 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500;
	data?: unknown;
	paginated?: boolean;
	noPropertise?: boolean;
}

const swaggerResponse = (params: SwaggerResponseParams) => {
	let description = T("swagger_response_200");
	const headers: {
		_access?: unknown;
		_refresh?: unknown;
		_csrf?: unknown;
	} = {};

	switch (params.type) {
		case 200:
			description = T("swagger_response_200");
			break;
		case 201:
			description = T("swagger_response_201");
			break;
		case 204:
			description = T("swagger_response_204");
			break;
		case 400:
			description = T("swagger_response_400");
			break;
		case 401:
			description = T("swagger_response_401");
			break;
		case 403:
			description = T("swagger_response_403");
			break;
		case 404:
			description = T("swagger_response_404");
			break;
		case 500:
			description = T("swagger_response_500");
			break;
	}

	const propertise: {
		data: unknown;
		meta: unknown;
		links?: unknown;
	} = {
		data: params.data,
		meta: params.paginated ? paginatedMetaObject : metaObject,
	};

	if (params.paginated) {
		propertise.links = linksObject;
	}

	return {
		description: description,
		type: params.noPropertise === true ? "null" : "object",
		properties: params.noPropertise === true ? undefined : propertise,
		headers: headers,
	};
};

export default swaggerResponse;
