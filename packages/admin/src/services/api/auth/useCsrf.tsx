import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

export const csrfSessionKey = "_csrf";

export const csrfReq = async () => {
	const csrfToken = sessionStorage.getItem(csrfSessionKey);
	if (csrfToken) {
		return csrfToken;
	}

	const res = await request<
		ResponseBody<{
			_csrf: string;
		}>
	>({
		url: "/api/v1/auth/csrf",
		config: {
			method: "GET",
		},
	});

	if (res.data) {
		sessionStorage.setItem(csrfSessionKey, res.data._csrf);
		return res.data._csrf;
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
