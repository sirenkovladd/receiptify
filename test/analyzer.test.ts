import { expect, it } from "bun:test";
import { analyzeReceipt } from "../src/back/analyzer";

it("response", async () => {
	const img = await Bun.file("./test/example-receipt.png");
	const b64 = (await img.bytes()).toBase64();
	const response = await analyzeReceipt(b64, img.type);

	expect(response).toEqual({
		items: [
			{
				name: "EASY OFF OVEN",
				count: 1,
				price: 7.99,
			},
			{
				name: "CH ORG TURMERIC",
				count: 1,
				price: 2.79,
			},
			{
				name: "MORNING FRESH",
				count: 1,
				price: 17.99,
			},
			{
				name: "NEK SUN OIL",
				count: 1,
				price: 5.99,
			},
			{
				name: "BOM ELDER HON",
				count: 1,
				price: 6.89,
			},
			{
				name: "PHILA SOFT PLAIN",
				count: 1,
				price: 6.99,
			},
			{
				name: "PC RED RASPBERR",
				count: 1,
				price: 4.99,
			},
			{
				name: "PC WHL STRWBERIS",
				count: 1,
				price: 4.99,
			},
			{
				name: "TOMATO GRAPE",
				count: 1,
				price: 5.99,
			},
			{
				name: "ORANGE NAVEL LG",
				count: 1,
				price: 1.75,
			},
			{
				name: "CARROT",
				count: 1,
				price: 1.27,
			},
			{
				name: "CHKN BNLS SKNLS",
				count: 1,
				price: 15,
			},
			{
				name: "MASTRO GENOA",
				count: 1,
				price: 3.99,
			},
		],
		type: "grocery",
		storeName: "NOFRILLS",
		datetime: "2024-03-24 19:23:05",
	});
}, {
  timeout: 20000
});
