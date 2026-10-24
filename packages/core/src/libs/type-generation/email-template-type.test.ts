import { expect, test } from "vitest";
import generateEmailTemplateTypes from "./email-template-type.js";

const template = (html: string) => ({ html, lastModified: "" });

test("generates data types for sendable templates from their props", async () => {
	const result = await generateEmailTemplateTypes({
		receipt: template(
			'{% props total: number, note: string = "" %}<p>{{ total }}</p>',
		),
		"user-invite": template("{% props inviteLink: string %}"),
	});

	const schema = result?.files?.[0]?.declarations?.[0];
	expect(schema).toContain(
		'import type { KilnMarkup as Markup } from "@lucidcms/core/types";',
	);
	expect(schema).toContain("total: number;");
	expect(schema).not.toContain("user-invite");
	expect(result?.moduleAugmentations[0]?.declarations).toEqual([
		'interface EmailTemplates {\n\t\t"receipt": EmailSchema["templates"]["receipt"]["context"];\n\t}',
	]);
});

test("keeps props inherited from internal templates", async () => {
	const result = await generateEmailTemplateTypes({
		"invite-reminder": template('{% extends "user-invite" %}'),
		"user-invite": template("{% props inviteLink: string %}"),
	});

	expect(result?.files?.[0]?.declarations?.[0]).toContain(
		"inviteLink: string | Markup;",
	);
});

test("generates nothing when only internal templates exist", async () => {
	const result = await generateEmailTemplateTypes({
		"user-invite": template("{% props inviteLink: string %}"),
	});

	expect(result).toBeUndefined();
});
