const MAINTAIN_PARAMS = ["errorName", "errorMessage"];

const getLoginRedirectURL = (search: string) => {
	const urlQueryParams = new URLSearchParams(search);
	for (const key of urlQueryParams.keys()) {
		if (MAINTAIN_PARAMS.includes(key)) continue;
		urlQueryParams.delete(key);
	}

	return `/admin/login${urlQueryParams.size > 0 ? `?${urlQueryParams.toString()}` : ""}`;
};

export default getLoginRedirectURL;
