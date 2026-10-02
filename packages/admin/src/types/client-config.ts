/** Config explicitly exposed to all admin components, including public routes. */
export type AdminClientConfig = {
	readonly brand: {
		readonly name: string;
	};
	/** Whether Home can open on the agent's chat box. */
	readonly agentHomescreen: boolean;
};
