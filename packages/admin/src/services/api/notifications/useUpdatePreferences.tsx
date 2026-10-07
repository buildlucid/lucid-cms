import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	preferences: Array<{ type: string; email: boolean }>;
}

export const updatePreferencesReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/notifications/preferences",
		csrf: true,
		method: "PATCH",
		body: params,
	});
};

interface UseUpdatePreferencesProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdatePreferences = (props?: UseUpdatePreferencesProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updatePreferencesReq,
		getErrorToast: () => ({
			title: T()("notifications.preferences.update.error.title"),
			message: T()("notifications.preferences.update.error.message"),
		}),
		invalidates: [queryKeys.notifications.preferences()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdatePreferences;
