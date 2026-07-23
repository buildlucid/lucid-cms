export type ConsoleTransportOptions = {
	colors?: boolean;
	timestamps?: boolean;
	verbose?: boolean;
};

export type ResolvedConsoleTransportOptions = Required<ConsoleTransportOptions>;
