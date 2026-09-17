import type { JobReceipt, ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
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
				method: "POST",
				body: params,
			}),
		invalidates: [queryKeys.jobs.schedules(), queryKeys.jobs.list()],
		getSuccessToast: () => ({
			title: T()("toasts.jobs.schedule.triggered.title"),
			message: T()("toasts.jobs.schedule.triggered.message"),
		}),
	});

export default useTriggerSchedule;
