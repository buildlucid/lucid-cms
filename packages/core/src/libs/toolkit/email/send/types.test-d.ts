import { safe } from "@lucidkiln/core";
import type { KilnMarkup } from "../../../email/types.js";
import type { ToolkitEmail } from "../index.js";
import type { ToolkitEmailSendInput } from "./types.js";

declare module "../../../email/types.js" {
	interface EmailTemplates {
		invoice: { total: number; note?: string | KilnMarkup | null };
		welcome: { name: string | KilnMarkup };
	}
}

declare const email: ToolkitEmail;
const base = { to: "ada@example.com", subject: "Hello" };

email.send({ ...base, template: "invoice", data: { total: 10 } });
// @ts-expect-error `invoice` needs its own data.
email.send({ ...base, template: "invoice", data: { name: "Ada" } });

const welcome: ToolkitEmailSendInput = {
	...base,
	template: "welcome",
	data: { name: "Ada" },
};
email.send(welcome);
export const mismatched: ToolkitEmailSendInput = {
	...base,
	template: "invoice",
	// @ts-expect-error Annotated inputs keep each template paired with its data.
	data: { name: "Ada" },
};

email.send({
	...base,
	template: "welcome",
	// @ts-expect-error Safe markup doesn't survive email storage.
	data: { name: safe("<b>Ada</b>") },
});
