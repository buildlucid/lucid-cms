/** The Vite mode a project's env loads for: the one given, otherwise `production` when `NODE_ENV` is, else `development`. */
const resolveEnvMode = (mode?: string) =>
	mode ??
	(process.env.NODE_ENV === "production" ? "production" : "development");

export default resolveEnvMode;
