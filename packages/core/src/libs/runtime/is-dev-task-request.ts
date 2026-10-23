import constants from "../../constants/constants.js";
import type { LucidDevBuild } from "./types.js";

/** Checks a request is one of Lucid's development tasks, sent with the dev server's task token. */
const isDevTaskRequest = (request: Request, dev: LucidDevBuild) =>
	request.method === "POST" &&
	new URL(request.url).pathname.startsWith(constants.dev.taskPath) &&
	request.headers.get(constants.dev.taskTokenHeader) === dev.token;

export default isDevTaskRequest;
