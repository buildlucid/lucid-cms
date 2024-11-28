import T from "@/translations";
import { useNavigate } from "@solidjs/router";
import userStore from "@/store/userStore";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import { clearCsrfSession } from "./useCsrf";
import type { ResponseBody } from "@types";

export const logoutReq = () => {
	return request<
		ResponseBody<{
			message: string;
		}>
	>({
		url: "/api/v1/auth/logout",
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
			navigate("/admin/login");
			clearCsrfSession();
			props?.onSuccess?.();
		},
		onError: () => {
			navigate("/admin/login");
			props?.onError?.();
		},
	});
};

export default useLogout;
