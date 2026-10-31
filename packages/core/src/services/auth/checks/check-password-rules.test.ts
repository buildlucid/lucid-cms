import { afterAll, expect, test } from "vitest";
import z from "zod";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import checkPasswordRules from "./check-password-rules.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

const createContext = async (schema?: z.ZodType<string>) => {
	const config = await testConfig.getConfig();
	return createServiceContext({
		config: {
			...config,
			auth: {
				...config.auth,
				password: { ...config.auth.password, ...(schema && { schema }) },
			},
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
};

test("passwords follow the default rules unless a schema replaces them", async () => {
	const defaultContext = await createContext();
	const customContext = await createContext(
		z.string().min(6).regex(/\d/, "Include a number."),
	);

	const tooShort = await checkPasswordRules(defaultContext, {
		password: "short",
		field: "newPassword",
	});
	expect(tooShort.error?.errors).toMatchObject({
		newPassword: { code: "too_small" },
	});

	const missingNumber = await checkPasswordRules(customContext, {
		password: "abcdef",
		field: "password",
	});
	expect(missingNumber.error?.errors).toMatchObject({
		password: { message: { value: "Include a number." } },
	});

	const valid = await checkPasswordRules(customContext, {
		password: "abc123",
		field: "password",
	});
	expect(valid.error).toBeUndefined();
});
