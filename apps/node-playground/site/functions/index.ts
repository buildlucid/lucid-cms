import localePaths from "./locale-paths.js";
import pageGreeting from "./page-greeting.js";
import wait from "./wait.js";

export const functions = { localePaths, pageGreeting, wait };

type Functions = typeof functions;

declare module "@lucidkiln/core" {
	interface KilnFunctions extends Functions {}
}
