import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

export const clearKVReq = () => {
	return request<ResponseBody<null>>({
		url: "/api/v1/settings/kv",
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseClearKVProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useClearKV = (props: UseClearKVProps) => {
	return serviceHelpers.useMutationWrapper<unknown, ResponseBody<null>>({
		mutationFn: clearKVReq,
		getSuccessToast: () => ({
			title: T()("clear_cache_toast_title"),
			message: T()("clear_cache_toast_message"),
		}),
		invalidates: [],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useClearKV;
