import type { AgentRoutine, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type RoutineBody = Pick<
	AgentRoutine,
	"title" | "instructions" | "cron" | "timezone" | "enabled"
>;

const useCreateRoutine = (props?: { onSuccess?: () => void }) =>
	serviceHelpers.useMutationWrapper<RoutineBody, ResponseBody<AgentRoutine>>({
		mutationFn: (body) =>
			request<ResponseBody<AgentRoutine>>({
				url: "/lucid/api/v1/agent/routines",
				method: "POST",
				body,
			}),
		getSuccessToast: () => ({
			title: T()("toasts.agent.routine.created.title"),
			message: T()("toasts.agent.routine.created.message"),
		}),
		invalidates: [queryKeys.agent.routines()],
		onSuccess: props?.onSuccess,
	});

export default useCreateRoutine;
