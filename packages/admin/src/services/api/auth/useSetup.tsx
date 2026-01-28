import { useNavigate } from "@solidjs/router";
import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	email: string;
	username: string;
	firstName?: string;
	lastName?: string;
	password: string;
}

export const setupReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: "/lucid/api/v1/auth/setup",
		csrf: true,
		config: {
			method: "POST",
			body: params,
		},
	});
};

interface UseSetupProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useSetup = (props?: UseSetupProps) => {
	const navigate = useNavigate();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: setupReq,
		getSuccessToast: () => ({
			title: T()("setup_success_toast_title"),
			message: T()("setup_success_toast_message"),
		}),
		invalidates: ["auth.setupRequired"],
		onSuccess: () => {
			navigate("/lucid/login");
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default useSetup;
