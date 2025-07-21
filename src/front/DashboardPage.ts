import van from "vanjs-core";
import type { Receipt } from "./main";
import { NavLink, selectedReceipt } from "./utils"; // import shared value
const { div, h1, p, h3 } = van.tags;

const DashboardPage = () => {
	const receipts = van.state  <Receipt[]>([]);
	const loading = van.state(true);
	const error = van.state<string | null>(null);

	const fetchReceipts = async () => {
		try {
			loading.val = true;
			error.val = null;
			const response = await fetch("/api/receipts");
			if (!response.ok) {
				throw new Error("Failed to fetch receipts");
			}
			receipts.val = await response.json();
		} catch (err: any) {
			error.val = err.message || "An unknown error occurred.";
		} finally {
			loading.val = false;
		}
	};

	fetchReceipts();

	const handleReceiptClick = (receipt: Receipt) => {
		selectedReceipt.val = receipt;
	};

	return div(
		h1("Dashboard"),
		p("Here are your saved transactions."),
		() => {
			if (loading.val) return p("Loading receipts...");
			if (error.val) return p({ class: "error" }, `Error: ${error.val}`);
			if (receipts.val.length === 0) return p("No receipts found. Add one!");

			return div(
				{ class: "receipts-list" },
				receipts.val.map((receipt) =>
					NavLink(
						{
							path: `/edit/${receipt.id}`,
							onclick: () => handleReceiptClick(receipt),
						},
						h3(receipt.storeName || "Unnamed Store"),
						p(`Total: $${receipt.totalAmount}`),
						p(`Date: ${new Date(receipt.datetime).toLocaleString()}`),
					),
				),
			);
		}
	);
};

export default DashboardPage;
