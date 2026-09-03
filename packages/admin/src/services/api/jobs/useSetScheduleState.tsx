import type { JobScheduleSummary, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = {
	scheduleKey: string;
	state: JobScheduleSummary["state"];
};

const useSetScheduleState = () =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<Params>>({
		mutationFn: (params) =>
			request<ResponseBody<Params>, Params>({
				url: "/lucid/api/v1/jobs/schedules/state",
				csrf: true,
				config: { method: "PATCH", body: params },
			}),
		invalidates: ["jobs.getSchedules"],
		getSuccessToast: (_response, params) => ({
			title:
				params.state === "paused"
					? T()("toasts.jobs.schedule.paused.title")
					: T()("toasts.jobs.schedule.resumed.title"),
			message:
				params.state === "paused"
					? T()("toasts.jobs.schedule.paused.message")
					: T()("toasts.jobs.schedule.resumed.message"),
		}),
	});

export default useSetScheduleState;
