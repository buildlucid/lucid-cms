import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<string, never>;

export const resetReq = (_params: Params) =>
	request<undefined>({
		url: "/lucid/api/v1/connection/reset",
		csrf: true,
		method: "POST",
	});

const useReset = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: resetReq,
		getSuccessToast: () => ({
			title: T()("toasts.connection.reset.title"),
			message: T()("toasts.connection.reset.message"),
		}),
		invalidates: [queryKeys.connection.status()],
		onSuccess: props?.onSuccess,
	});

export default useReset;
