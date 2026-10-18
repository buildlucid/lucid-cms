import pageGreeting from "./page-greeting.js";

export const functions = { pageGreeting };

type Functions = typeof functions;

declare module "@lucidkiln/core" {
	interface KilnFunctions extends Functions {}
}
