import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

const useCancelRun = () =>
	serviceHelpers.useMutationWrapper<{ id: string }, unknown>({
		mutationFn: (params) =>
			request({
				url: `/lucid/api/v1/agent/runs/${params.id}/cancel`,
				method: "POST",
			}),
		invalidates: [queryKeys.agent.all()],
	});

export default useCancelRun;
