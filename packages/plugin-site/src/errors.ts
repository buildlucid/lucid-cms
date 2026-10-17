import type { redirectStatuses } from "./constants.js";

export type RedirectStatus = (typeof redirectStatuses)[number];

export class SiteNotFoundError extends Error {
	constructor() {
		super("The page was not found.");
		this.name = "SiteNotFoundError";
	}
}

export class SiteRedirectError extends Error {
	readonly location: string;
	readonly status: RedirectStatus;

	constructor(location: string, status: RedirectStatus) {
		super(`Redirect to ${location}.`);
		this.name = "SiteRedirectError";
		this.location = location;
		this.status = status;
	}
}
