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

	// Merge explicit includes/excludes with existing query parameters.
	for (const key of ["include", "exclude"] as const) {
		const entries = query[key];
		if (!entries) continue;

		const values = new Set((params.get(key) ?? "").split(",").filter(Boolean));
		for (const [name, enabled] of Object.entries(entries)) {
			if (enabled) values.add(name);
			else values.delete(name);
		}

		if (values.size) params.set(key, [...values].join(","));
		else params.delete(key);
	}

	// Append filters query
	if (query.filters !== undefined && Object.keys(query.filters).length > 0) {
		for (const key of Object.keys(query.filters)) {
			const value = query.filters ? query.filters[key] : "";
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				params.set(`filter[${key}]`, value.join(","));
			}

			if (typeof value === "string" || typeof value === "number") {
				params.set(`filter[${key}]`, value.toString());
			}
		}
	}

	if (query.page !== undefined) params.set("page", String(query.page));
	if (query.sort) {
		params.set(
			"sort",
			Object.entries(query.sort)
				.map(([key, direction]) => (direction === "desc" ? `-${key}` : key))
				.join(","),
		);
	}

	// Append perPage query
	if (query.perPage !== undefined) {
		params.set("perPage", query.perPage.toString());
	}

	return params.toString();
};

export default queryBuilder;
