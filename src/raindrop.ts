import type { BlockQueryMap } from "./types";

const RAINDROP_API_BASE = "https://api.raindrop.io/rest/v1/";

const getRaindropsCollection = async (
	collectionID: number = 0,
	search: string,
	sort: string,
	accessToken: string
) => {
	const PERPAGE = 50; // Raindrop API maximum
	const MAX_PAGES = 100; // safety cap (= up to 5000 bookmarks)
	let page = 0;
	let allItems: any[] = [];

	while (page < MAX_PAGES) {
		const params: Record<string, any> = { perpage: PERPAGE, page };
		if (search) params.search = search;
		if (sort) params.sort = sort;

		const url = new URL(`${RAINDROP_API_BASE}raindrops/${collectionID}`);
		url.search = new URLSearchParams(params).toString();

		const result = await fetch(url.toString(), {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const raindrops = await result.json();
		const items = raindrops.items ?? [];
		allItems = allItems.concat(items);

		if (items.length < PERPAGE) break; // short page = last page
		page++;
	}

	console.log("getRaindropsCollection total", allItems.length);
	return allItems;
};
// const getRaindropsCollection = async (
//   collectionID: number = 0,
//   search: string,
//   sort: string,
//   accessToken: string
// ) => {
//   // console.info('getRaindropsCollection');
//   let params: Record<string, any> = {};
//   let url = new URL(`${RAINDROP_API_BASE}raindrops/${collectionID}`);
//
//   if (search) params = { search, ...params };
//   if (sort) params = { sort, ...params };
//
//   url.search = new URLSearchParams(params).toString();
//
//   const result = await fetch(url.toString(), {
//     method: "GET",
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//     },
//   });
//
//   const raindrops = await result.json();
//   console.log("getRaindropsCollection result", raindrops);
//   return raindrops.items;
// };
//
const getRaindrop = async (raindropID: number = 0, accessToken: string) => {
	console.info("getRaindrop", raindropID);
	let params: Record<string, any> = {};
	let url = new URL(`${RAINDROP_API_BASE}raindrop/${raindropID}`);

	const result = await fetch(url.toString(), {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const raindrop = await result.json();
	console.log("getRaindrop result", raindrop);
	return raindrop;
};

const getRaindrops = async (params: BlockQueryMap, accessToken: string) => {
	console.info('getRaindrops', params);
	let raindrops: any[] = [];

	if (params.collection !== null) {
		raindrops = await getRaindropsCollection(
			params["collection"],
			params["search"],
			params["sort"],
			accessToken
		);

		return raindrops;
	}

	const raindropIDArr = params.raindropIDs.split(",");
	for (const raindropID of raindropIDArr) {
		const result = await getRaindrop(parseInt(raindropID), accessToken);

		if (result.item !== undefined) {
			raindrops.push(result.item);
		}
	}

	return raindrops;
};

export { getRaindropsCollection, getRaindrops };
