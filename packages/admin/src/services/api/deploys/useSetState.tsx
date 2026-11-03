import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	key: string;
	enabled: boolean;
};

const useSetState = () =>
	serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: (params) =>
			request<undefined, Pick<Params, "enabled">>({
				url: `/api/v1/deploys/${encodeURIComponent(params.key)}/state`,
				csrf: true,
				method: "PATCH",
				body: { enabled: params.enabled },
			}),
		invalidates: [queryKeys.deploys.list(), queryKeys.deploys.runs()],
		getSuccessToast: (_response, params) =>
			params.enabled
				? {
						title: T()("toasts.deploys.enabled.title"),
						message: T()("toasts.deploys.enabled.message"),
					}
				: {
						title: T()("toasts.deploys.disabled.title"),
						message: T()("toasts.deploys.disabled.message"),
					},
	});

export default useSetState;
