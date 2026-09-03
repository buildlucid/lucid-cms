import type { JobReceipt, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = { scheduleKey: string };

const useTriggerSchedule = () =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<JobReceipt>>({
		mutationFn: (params) =>
			request<ResponseBody<JobReceipt>>({
				url: "/lucid/api/v1/jobs/schedules/trigger",
				csrf: true,
				config: {
					method: "POST",
					body: params,
				},
			}),
		invalidates: ["jobs.getSchedules", "jobs.getMultiple"],
		getSuccessToast: () => ({
			title: T()("toasts.jobs.schedule.triggered.title"),
			message: T()("toasts.jobs.schedule.triggered.message"),
		}),
	});

export default useTriggerSchedule;
