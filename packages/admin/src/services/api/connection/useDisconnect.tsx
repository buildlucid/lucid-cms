import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<string, never>;

export const disconnectReq = (_params: Params) =>
	request<undefined>({
		url: "/lucid/api/v1/connection",
		csrf: true,
		method: "DELETE",
	});

const useDisconnect = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: disconnectReq,
		getSuccessToast: () => ({
			title: T()("toasts.connection.disconnected.title"),
			message: T()("toasts.connection.disconnected.message"),
		}),
		invalidates: [queryKeys.connection.status()],
		onSuccess: props?.onSuccess,
	});

export default useDisconnect;
