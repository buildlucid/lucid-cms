import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	key: string;
	/** Whether another run is active, so this one waits behind it. */
	queued?: boolean;
};

const useRun = () =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<{ id: number }>>({
		mutationFn: (params) =>
			request<ResponseBody<{ id: number }>>({
				url: `/api/v1/deploys/${encodeURIComponent(params.key)}/run`,
				csrf: true,
				method: "POST",
			}),
		invalidates: [queryKeys.deploys.list(), queryKeys.deploys.runs()],
		getSuccessToast: (_response, params) =>
			params.queued
				? {
						title: T()("toasts.deploys.queued.title"),
						message: T()("toasts.deploys.queued.message"),
					}
				: {
						title: T()("toasts.deploys.started.title"),
						message: T()("toasts.deploys.started.message"),
					},
	});

export default useRun;
