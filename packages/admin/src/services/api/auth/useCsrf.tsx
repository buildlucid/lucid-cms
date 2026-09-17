import serviceHelpers from "@/utils/service-helpers";

export const csrfSessionKey = "_csrf";

export const csrfReq = async () => {
	const csrfToken = sessionStorage.getItem(csrfSessionKey);
	if (csrfToken) {
		return csrfToken;
	}

	// This bootstrap request must never trigger a session refresh itself.
	const response = await fetch("/lucid/api/v1/auth/csrf", {
		credentials: "include",
	});
	if (!response.ok) throw new Error("Unable to load the CSRF token.");

	const result: unknown = await response.json();
	if (
		result &&
		typeof result === "object" &&
		"data" in result &&
		result.data &&
		typeof result.data === "object" &&
		"_csrf" in result.data &&
		typeof result.data._csrf === "string"
	) {
		sessionStorage.setItem(csrfSessionKey, result.data._csrf);
		return result.data._csrf;
	}

	return null;
};

export const clearCsrfSession = () => {
	sessionStorage.removeItem(csrfSessionKey);
};

interface UseCSRFProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useCsrf = (props: UseCSRFProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<unknown, string | null>({
		mutationFn: csrfReq,
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useCsrf;
