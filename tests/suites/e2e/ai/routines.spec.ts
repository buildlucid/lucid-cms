import { finishRoutine, script } from "#harness/client";
import { expect, requires, test } from "#harness/playwright";
import { createRoutine } from "#shared/helpers/agent";
import { repliesIn } from "#shared/helpers/agent-pages";
import { connectLucid } from "#shared/helpers/ai";

test.describe("routines", () => {
	requires("agent:harness", "harness:outbox");

	test.beforeAll(async ({ lucid }) => {
		await connectLucid(lucid);
	});

	test("runs a routine now and shows the run's summary", async ({
		page,
		lucid,
	}) => {
		const name = `Weekly check ${crypto.randomUUID().slice(0, 8)}`;
		await createRoutine(await lucid.admin(), {
			name,
			instructions: script(finishRoutine("Everything looks tidy.")),
		});

		await page.goto("/admin/agent/routines");
		const row = page.getByRole("row").filter({ hasText: name });
		await row.getByRole("button", { name: "Show Options" }).click();
		await page.getByRole("menuitem", { name: "Run Now" }).click();

		//* the run opens in its own chat, with the routine's details beside it
		await expect(
			repliesIn(page).getByText("Everything looks tidy."),
		).toBeVisible();
		const details = page.getByRole("complementary", { name });
		await details.getByRole("button", { name: "View Runs" }).click();
		await expect(
			page.getByRole("dialog").getByText("Everything looks tidy."),
		).toBeVisible();
	});
});
