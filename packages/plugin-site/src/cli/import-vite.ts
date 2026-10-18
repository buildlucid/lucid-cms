/** Loads Vite, an optional peer dependency, or returns null when the project hasn't installed it. */
const importVite = async () => {
	try {
		return await import("vite");
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			error.code === "ERR_MODULE_NOT_FOUND"
		) {
			return null;
		}
		throw error;
	}
};

export default importVite;
