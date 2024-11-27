export interface TableRowProps {
	index: number;
	selected?: boolean;

	options?: {
		isSelectable?: boolean;
	};
	callbacks?: {
		setSelected?: (i: number) => void;
	};
}
