import type { Locator, Page } from "@playwright/test";

/** The chat box, once it can be typed in. It shows a placeholder while the chat loads. */
export const composerIn = (scope: Page | Locator): Locator =>
	scope
		.getByRole("textbox", { name: "Message the agent" })
		.and(scope.locator('[contenteditable="true"]'));

/** Types into the chat box and sends, as a person would. */
export const sendFromComposer = async (
	scope: Page | Locator,
	text: string,
): Promise<void> => {
	await composerIn(scope).fill(text);
	await scope.getByRole("button", { name: "Send", exact: true }).click();
};

/** The agent's replies in the open chat. */
export const repliesIn = (scope: Page | Locator): Locator =>
	scope.locator('[data-chat-role="assistant"]');
