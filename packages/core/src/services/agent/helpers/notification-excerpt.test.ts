import { expect, test } from "vitest";
import notificationExcerpt from "./notification-excerpt.js";

test("notification excerpts turn markdown replies into one plain line", () => {
	expect(notificationExcerpt("The sum is **7**.")).toBe("The sum is 7.");
	expect(
		notificationExcerpt(
			"## Report\n\n- Updated [the home page](/admin/documents/page/1)\n- Fixed `meta_title` on _two_ pages",
		),
	).toBe("Report Updated the home page Fixed meta_title on two pages");
	expect(notificationExcerpt("Check snake_case_names stay intact")).toBe(
		"Check snake_case_names stay intact",
	);
	expect(notificationExcerpt("x".repeat(200))).toHaveLength(160);
});
