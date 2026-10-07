import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface Params {
	type: string;
	enabled: boolean;
	email: boolean;
	roleIds: number[] | null;
}

export const updateTypeSettingsReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: `/lucid/api/v1/notifications/types/${encodeURIComponent(params.type)}`,
		csrf: true,
		method: "PATCH",
		body: {
			enabled: params.enabled,
			email: params.email,
			roleIds: params.roleIds,
		},
	});
};

interface UseUpdateTypeSettingsProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdateTypeSettings = (props?: UseUpdateTypeSettingsProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateTypeSettingsReq,
		getErrorToast: () => ({
			title: T()("notifications.settings.update.error.title"),
			message: T()("notifications.settings.update.error.message"),
		}),
		invalidates: [queryKeys.notifications.types()],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdateTypeSettings;
