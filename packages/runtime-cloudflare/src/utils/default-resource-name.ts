import toResourceName from "./to-resource-name.js";

/** Names a binding's resource after its Worker, such as `my-site-lucid-kv`. */
const defaultResourceName = (workerName: string, binding: string) =>
	toResourceName(`${workerName}-${binding}`);

export default defaultResourceName;
