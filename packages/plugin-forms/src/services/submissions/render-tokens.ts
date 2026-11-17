const token = /\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g;

/**
 * Replaces `{{name}}` tokens with answers. Tokens that name no answer are removed. Answers lose
 * their line breaks unless `multiline` is set, so one can't add lines to an email header.
 */
const renderTokens = (
	template: string,
	answers: Record<string, string>,
	options: { multiline?: boolean } = {},
): string =>
	template.replace(token, (_match, name: string) => {
		//* only the form's own answers, never what every object inherits, such as `constructor`
		const answer = Object.hasOwn(answers, name) ? (answers[name] ?? "") : "";
		return options.multiline ? answer : answer.replace(/[\r\n]+/g, " ");
	});

export default renderTokens;
