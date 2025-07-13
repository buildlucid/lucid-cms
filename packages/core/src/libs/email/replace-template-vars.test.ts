import { describe, it, expect } from "vitest";
import replaceTemplateVariables from "./replace-template-vars.js";

describe("replaceTemplateVariables", () => {
	it("should replace single variable with string value", () => {
		const template = "Hello {{name}}!";
		const data = { name: "John" };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("Hello John!");
	});

	it("should replace multiple variables", () => {
		const template = "Hello {{name}}, you have {{count}} messages.";
		const data = { name: "Alice", count: 5 };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("Hello Alice, you have 5 messages.");
	});

	it("should handle repeated variables", () => {
		const template = "{{name}} is great! {{name}} is awesome!";
		const data = { name: "Bob" };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("Bob is great! Bob is awesome!");
	});

	it("should replace with empty string when value is null", () => {
		const template = "Hello {{name}}!";
		const data = { name: null };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("Hello !");
	});

	it("should handle arrays by converting to string", () => {
		const template = "Items: {{items}}";
		const data = { items: ["apple", "banana", "cherry"] };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("Items: apple,banana,cherry");
	});

	it("should return original template when data is null", () => {
		const template = "Hello {{name}}!";
		const result = replaceTemplateVariables(template, null);

		expect(result).toBe("Hello {{name}}!");
	});

	it("should handle template with no variables", () => {
		const template = "This is just plain text.";
		const data = { name: "John" };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("This is just plain text.");
	});

	it("should handle empty template", () => {
		const template = "";
		const data = { name: "John" };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("");
	});

	it("should handle HTML content", () => {
		const template = "<h1>{{title}}</h1><p>{{content}}</p>";
		const data = {
			title: "Welcome",
			content: "This is the content",
		};
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("<h1>Welcome</h1><p>This is the content</p>");
	});

	it("should handle special string values", () => {
		const template = "{{message}}";
		const data = { message: "Hello & goodbye <script>alert('test')</script>" };
		const result = replaceTemplateVariables(template, data);

		expect(result).toBe("Hello & goodbye <script>alert('test')</script>");
	});
});
