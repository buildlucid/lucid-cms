export interface QueryHook<T> {
	queryParams: T;
	key?: () => unknown;
	enabled?: () => boolean;
	refetchOnWindowFocus?: boolean;
}

export type ReadonlyData<T> = T extends object
	? { readonly [Key in keyof T]: ReadonlyData<T[Key]> }
	: T;
