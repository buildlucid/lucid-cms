import type { AgentRoutine, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type RoutineBody = Pick<
	AgentRoutine,
	| "name"
	| "instructions"
	| "conversationMode"
	| "modelSelection"
	| "cron"
	| "timezone"
	| "enabled"
	| "tools"
>;

const useCreateRoutine = (props?: {
	onSuccess?: (response: ResponseBody<AgentRoutine>) => void;
}) =>
	serviceHelpers.useMutationWrapper<
		RoutineBody & Pick<AgentRoutine, "agentKey">,
		ResponseBody<AgentRoutine>
	>({
		mutationFn: (body) =>
			request<ResponseBody<AgentRoutine>>({
				url: "/lucid/api/v1/agent/routines",
				method: "POST",
				body,
			}),
		getSuccessToast: (response) => ({
			title: T()("toasts.agent.routine.created.title"),
			message: T()(
				response.data.enabled
					? "toasts.agent.routine.created.message"
					: "toasts.agent.routine.created.paused.message",
			),
		}),
		invalidates: [queryKeys.agent.routines()],
		onSuccess: props?.onSuccess,
	});

export default useCreateRoutine;
