export interface QueryBuilderProps {
	queryString?: string;
	filters?: Record<
		string,
		string | number | string[] | number[] | undefined | null
	>;
	sort?: Record<string, string>;
	perPage?: number;
	page?: number;
	exclude?: Record<string, boolean>;
	include?: Record<string, boolean>;
}

const queryBuilder = (query: QueryBuilderProps) => {
	// create new url with query string
	const params = new URLSearchParams(query.queryString || "");

	// Append include query
	if (query.include !== undefined && Object.keys(query.include).length > 0) {
		let includeString = params.get("include") || "";
		for (const key of Object.keys(query.include)) {
			if (query.include?.[key]) {
				includeString += `${key},`;
			}
		}
		includeString = includeString.slice(0, -1);
		if (includeString.length > 0) params.append("include", includeString);
	}
	// Append exclude query
	if (query.exclude !== undefined && Object.keys(query.exclude).length > 0) {
		let excludeString = params.get("exclude") || "";
		for (const key of Object.keys(query.exclude)) {
			if (query.exclude?.[key]) {
				excludeString += `${key},`;
			}
		}
		excludeString = excludeString.slice(0, -1);
		if (excludeString.length > 0) params.append("exclude", excludeString);
	}

	// Append filters query
	if (query.filters !== undefined && Object.keys(query.filters).length > 0) {
		for (const key of Object.keys(query.filters)) {
			const value = query.filters ? query.filters[key] : "";
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				params.append(`filter[${key}]`, value.join(","));
			}

			if (typeof value === "string" || typeof value === "number") {
				params.append(`filter[${key}]`, value.toString());
			}
		}
	}

	// Append perPage query
	if (query.perPage !== undefined) {
		params.append("perPage", query.perPage.toString());
	}

	return params.toString();
};

export default queryBuilder;
