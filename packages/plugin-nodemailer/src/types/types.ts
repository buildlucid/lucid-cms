import type { Transporter } from "nodemailer";
import type { priorityHeaders } from "../constants.js";

export interface PluginOptions {
	/** Your Nodemailer transporter instance */
	transporter: Transporter;
	/**
	 * Limits for fetching URL-based attachments before passing them to Nodemailer.
	 */
	remoteAttachments?: {
		/**
		 * Maximum remote attachment size in bytes. Defaults to 10MB.
		 */
		maxBytes?: number;
		/**
		 * Remote attachment request timeout in milliseconds. Defaults to 15 seconds.
		 */
		timeoutMs?: number;
	};
}

export type EmailPriority = keyof typeof priorityHeaders;

export type EmailWithPriority = {
	priority?: EmailPriority;
	headers?: Record<string, string> | null;
};
