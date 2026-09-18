/** Config explicitly exposed to all admin components, including public routes. */
export type AdminClientConfig = {
	readonly brand: {
		readonly name: string;
	};
};
