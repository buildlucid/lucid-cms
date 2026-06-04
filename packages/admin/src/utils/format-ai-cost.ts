type AiCost = {
	currency: string;
	totalCostMinor: number;
};

const formatAiCost = (cost?: AiCost): string | undefined => {
	if (!cost) return undefined;

	const amount = cost.totalCostMinor / 100;
	if (cost.currency.toUpperCase() === "USD") return `$${amount.toFixed(2)}`;

	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: cost.currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	} catch (_error) {
		return `${amount.toFixed(2)} ${cost.currency}`;
	}
};

export default formatAiCost;
