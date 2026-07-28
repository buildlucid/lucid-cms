import constants from "@/constants";

const MAINTAIN_PARAMS = [
	constants.errorQueryParams.errorMessage,
	constants.errorQueryParams.errorName,
];

const isSafeReturnPath = (value: string) => {
	try {
		const url = new URL(value, "https://lucid.local");
		return (
			url.origin === "https://lucid.local" &&
			(url.pathname === "/lucid" || url.pathname.startsWith("/lucid/"))
		);
	} catch {
		return false;
	}
};

export const getLoginReturnPath = (search: string) => {
	const redirect = new URLSearchParams(search).get("redirect");
	return redirect && isSafeReturnPath(redirect) ? redirect : "/lucid";
};

const getLoginRedirectURL = (target: string) => {
	const current = new URL(
		target.startsWith("/") ? target : `/lucid${target}`,
		"https://lucid.local",
	);
	const loginParams = new URLSearchParams();
	for (const key of MAINTAIN_PARAMS) {
		const value = current.searchParams.get(key);
		if (value) loginParams.set(key, value);
	}

	const returnPath = `${current.pathname}${current.search}${current.hash}`;
	if (current.pathname !== "/lucid/login" && isSafeReturnPath(returnPath)) {
		loginParams.set("redirect", returnPath);
	}

	return `/lucid/login${loginParams.size > 0 ? `?${loginParams.toString()}` : ""}`;
};

export default getLoginRedirectURL;
