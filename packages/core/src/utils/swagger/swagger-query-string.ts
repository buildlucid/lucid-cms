import T from "../../translations/index.js";

interface SwaggerQueryStringConfig {
	include?: string[];
	filters?: {
		key: string;
		enum?: string[];
	}[];
	sorts?: string[];
	page?: boolean;
	perPage?: boolean;
}

const swaggerQueryString = (config: SwaggerQueryStringConfig) => {
	const queryString: {
		type: string;
		properties: Record<string, unknown>;
	} = {
		type: "object",
		properties: {},
	};

	if (config.include && config.include.length > 0) {
		queryString.properties.include = {
			type: "string",
			enum: config.include,
			description: T("swagger_query_string_include_description"),
		};
	}

	if (config.filters && config.filters.length > 0) {
		for (const filter of config.filters) {
			queryString.properties[`filter[${filter.key}]`] = {
				type: "string",
				enum: filter.enum,
				description: T("swagger_query_string_filter_description"),
			};
		}
	}

	if (config.sorts && config.sorts.length > 0) {
		queryString.properties.sort = {
			type: "string",
			enum: config.sorts,
			description: T("swagger_query_string_sort_description"),
		};
	}

	if (config.page) {
		queryString.properties.page = {
			type: "number",
			description: T("swagger_query_string_page_description"),
		};
	}

	if (config.perPage) {
		queryString.properties.perPage = {
			type: "number",
			description: T("swagger_query_string_per_page_description"),
		};
	}

	return queryString;
};

export default swaggerQueryString;
