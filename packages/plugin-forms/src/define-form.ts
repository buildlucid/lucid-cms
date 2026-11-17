import type { FormDefinition, FormDefinitionInput } from "./types.js";

/**
 * Defines a form in code. Add it to the forms plugin's `forms`. Websites read it at
 * `/api/v1/content/e/forms/<key>` and post to `/api/v1/content/e/forms/<key>/submit`.
 *
 * @example
 * ```ts
 * const contact = defineForm({
 * 	key: "contact",
 * 	name: "Contact",
 * 	fields: [
 * 		formField.text("name", { label: "Name", required: true, width: 6 }),
 * 		formField.email("email", { label: "Email", required: true, width: 6 }),
 * 		formField.textarea("message", { label: "Message", required: true }),
 * 	],
 * 	emails: [
 * 		{
 * 			to: "team@example.com",
 * 			subject: "New enquiry from {{name}}",
 * 			replyTo: "{{email}}",
 * 		},
 * 	],
 * });
 * ```
 */
const defineForm = (definition: FormDefinitionInput): FormDefinition => ({
	...definition,
	type: "form-definition",
});

export default defineForm;
