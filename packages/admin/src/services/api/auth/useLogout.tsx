import { useNavigate } from "@solidjs/router";
import type { ResponseBody } from "@types";
import userStore from "@/store/userStore";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { clearCsrfSession } from "./useCsrf";

export const logoutReq = () => {
	return request<
		ResponseBody<{
			message: string;
		}>
	>({
		url: "/lucid/api/v1/auth/logout",
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

interface UseLogoutProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useLogout = (props?: UseLogoutProps) => {
	const navigate = useNavigate();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		unknown,
		ResponseBody<{
			message: string;
		}>
	>({
		mutationFn: logoutReq,
		getSuccessToast: () => ({
			title: T()("logout_success_toast_title"),
			message: T()("logout_success_toast_message"),
		}),
		invalidates: ["roles.getMultiple", "roles.getSingle"],
		onSuccess: () => {
			userStore.get.reset();
			navigate("/lucid/login");
			clearCsrfSession();
			props?.onSuccess?.();
		},
		onError: () => {
			navigate("/lucid/login");
			props?.onError?.();
		},
	});
};

export default useLogout;
