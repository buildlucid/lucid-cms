import { queryKeys } from "@/services/query-keys";

/** Query groups invalidated by request changes. */
export const requestChangeKeys = () => [
	queryKeys.requests.all(),
	queryKeys.notifications.summary(),
	queryKeys.review.all(),
];
