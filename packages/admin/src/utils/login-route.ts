import constants from "@/constants";

const MAINTAIN_PARAMS = [
	constants.errorQueryParams.errorMessage,
	constants.errorQueryParams.errorName,
];

const isSafeReturnPath = (value: string) => {
	try {
		const url = new URL(value, "https://admin.local");
		return (
			url.origin === "https://admin.local" &&
			(url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
		);
	} catch {
		return false;
	}
};

export const getLoginReturnPath = (search: string) => {
	const redirect = new URLSearchParams(search).get("redirect");
	return redirect && isSafeReturnPath(redirect) ? redirect : "/admin";
};

const getLoginRedirectURL = (target: string) => {
	const current = new URL(
		target.startsWith("/") ? target : `/admin${target}`,
		"https://admin.local",
	);
	const loginParams = new URLSearchParams();
	for (const key of MAINTAIN_PARAMS) {
		const value = current.searchParams.get(key);
		if (value) loginParams.set(key, value);
	}

	const returnPath = `${current.pathname}${current.search}${current.hash}`;
	if (current.pathname !== "/admin/login" && isSafeReturnPath(returnPath)) {
		loginParams.set("redirect", returnPath);
	}

	return `/admin/login${loginParams.size > 0 ? `?${loginParams.toString()}` : ""}`;
};

export default getLoginRedirectURL;
