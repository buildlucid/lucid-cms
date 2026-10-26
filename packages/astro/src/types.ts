/** Request context required to resolve an invocation-safe Lucid toolkit. */
export type LucidAstroContext = {
	request: Request;
	locals: object;
};

/** Options accepted by the Lucid Astro integration. */
export type LucidAstroOptions = {
	/** Path to `lucid.config.*`. Defaults to the config found from the current directory. */
	configPath?: string;
};
