import type { AgentRoutine, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { RoutineBody } from "./useCreateRoutine";

type Params = { id: string; body: Partial<RoutineBody> };

const useUpdateRoutine = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<AgentRoutine>>({
		mutationFn: (params) =>
			request<ResponseBody<AgentRoutine>>({
				url: `/lucid/api/v1/agent/routines/${params.id}`,
				method: "PATCH",
				body: params.body,
			}),
		getSuccessToast: (_response, params) =>
			params.body.enabled !== undefined && Object.keys(params.body).length === 1
				? {
						title: params.body.enabled
							? T()("toasts.agent.routine.resumed.title")
							: T()("toasts.agent.routine.paused.title"),
						message: params.body.enabled
							? T()("toasts.agent.routine.resumed.message")
							: T()("toasts.agent.routine.paused.message"),
					}
				: {
						title: T()("toasts.agent.routine.updated.title"),
						message: T()("toasts.agent.routine.updated.message"),
					},
		invalidates: [queryKeys.agent.routines()],
		onSuccess: props?.onSuccess,
	});

export default useUpdateRoutine;
