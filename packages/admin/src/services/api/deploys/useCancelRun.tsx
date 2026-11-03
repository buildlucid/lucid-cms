import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import type { DeployRunCancellation } from "@/utils/deploys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	id: number;
	/** How the cancel plays out, for the toast. */
	cancellation: DeployRunCancellation;
};

const useCancelRun = () =>
	serviceHelpers.useMutationWrapper<Params, undefined>({
		mutationFn: (params) =>
			request<undefined>({
				url: `/api/v1/deploys/runs/${params.id}/cancel`,
				csrf: true,
				method: "POST",
			}),
		invalidates: [queryKeys.deploys.list(), queryKeys.deploys.runs()],
		getSuccessToast: (_response, params) => {
			switch (params.cancellation) {
				case "queued":
					return {
						title: T()("toasts.deploys.run.cancelled.queued.title"),
						message: T()("toasts.deploys.run.cancelled.queued.message"),
					};
				case "host":
					return {
						title: T()("toasts.deploys.run.cancelled.host.title"),
						message: T()("toasts.deploys.run.cancelled.host.message"),
					};
				case "waiting":
					return {
						title: T()("toasts.deploys.run.cancelled.waiting.title"),
						message: T()("toasts.deploys.run.cancelled.waiting.message"),
					};
			}
		},
	});

export default useCancelRun;
