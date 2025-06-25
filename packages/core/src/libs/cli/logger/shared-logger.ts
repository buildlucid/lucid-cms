export type SharedLogger = {
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
};

const sharedLogger = (): SharedLogger => ({
	error: (message: string, error?: unknown) => {
		console.error(`❌ ${message}`);
		if (error) {
			console.error(error);
		}
	},
	info: (message: string) => {
		console.log(`ℹ️  ${message}`);
	},
});

export default sharedLogger;
