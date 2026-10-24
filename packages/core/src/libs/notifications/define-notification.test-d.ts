import z from "zod";
import defineNotification from "./define-notification.js";

declare module "../email/types.js" {
	interface EmailTemplates {
		"order-failed": {
			title: string;
			body?: string | null;
			orderId: number;
			[key: string]: unknown;
		};
		"order-summary": { [key: string]: unknown };
		receipt: { total: number };
	}
}

const base = {
	key: "shop:order-failed",
	category: { key: "shop", label: "Shop" },
	name: "Order failed",
	audience: "recipients",
	data: z.object({ orderId: z.number() }),
	render: () => ({ title: "Order failed" }),
} as const;

// Lucid's own template takes any extra data.
defineNotification({ ...base, email: { data: () => ({ anything: true }) } });
defineNotification({
	...base,
	email: {
		template: "order-failed",
		data: ({ data }) => ({ orderId: data.orderId }),
	},
});
defineNotification({ ...base, email: { template: "order-summary" } });

// @ts-expect-error The template has a prop Lucid doesn't send, so `data` is required.
defineNotification({ ...base, email: { template: "order-failed" } });
defineNotification({
	...base,
	// @ts-expect-error `orderId` must be a number.
	email: { template: "order-failed", data: () => ({ orderId: "12" }) },
});
// @ts-expect-error The template doesn't accept the data Lucid sends.
defineNotification({ ...base, email: { template: "receipt" } });
