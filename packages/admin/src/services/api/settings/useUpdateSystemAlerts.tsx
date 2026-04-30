import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	alertEmail: string | null;
}

export const updateSystemAlertsReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/settings/system-alerts",
		csrf: true,
		config: {
			method: "PATCH",
			body: {
				alertEmail: params.alertEmail,
			},
		},
	});
};

interface UseUpdateSystemAlertsProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateSystemAlerts = (props?: UseUpdateSystemAlertsProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateSystemAlertsReq,
		getSuccessToast: () => ({
			title: T()("update_toast_title", { name: T()("system_alerts") }),
			message: T()("system_alerts_update_toast_message"),
		}),
		invalidates: ["settings.getSettings"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateSystemAlerts;
