interface QueryHook<T> {
	queryParams: T;
	key?: () => unknown;
	enabled?: () => boolean;
	refetchOnWindowFocus?: boolean;
}
