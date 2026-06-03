# obsidian-raindrop — fork & fix handoff

> **For Claude Code:** This is a context/starting prompt. We've forked the
> `mtopping/obsidian-raindrop` Obsidian plugin to fix the build and extend it.
> Work is done **in-vault** (cloned directly into the vault's plugins folder).
> Pick up from the **Pending tasks** section. Preserve the confidence-flag
> convention below in any docs/answers you produce.

**Confidence legend:** ✅ Confirmed (tested) · 📖 From docs (not tested) · ⚠️ Uncertain / needs verification

---

## Goal

Get `mtopping/obsidian-raindrop` working on a current Obsidian + Node 22, then
extend it. The plugin renders a dynamic, query-driven list of Raindrop.io
bookmarks via a fenced ` ```raindrop ` code block (not a one-time import — that's
the specific behavior we want, and the only feature actually shipped; "create
bookmark" / "create note from bookmark" are listed as *planned*, unimplemented). ✅

## Why the fork was needed

- Not in the Obsidian community store; last upstream release was **1.1.0 (Aug 2022)**. ✅
- Repo ships **TypeScript only** — `main.js` is a build artifact you must generate. ✅

## Project location & build

- Cloned into the vault plugins dir (plugin id `obsidian-raindrop`):
  `/Users/miro/prj/synced-notes/.obsidian/plugins/obsidian-raindrop/` ⚠️ *(confirm exact vault root)*
- Toolchain: Node 22, npm. Build scripts: `npm run dev` (esbuild watch → writes
  `main.js` in place), `npm run build` (`tsc -noEmit -skipLibCheck` + esbuild production). ✅
- Files Obsidian needs: `main.js` (built) + `manifest.json` (in repo). No `styles.css`
  — styles are bundled inside the Svelte components. ✅
- Dev loop: `npm run dev`, then reload the plugin in Obsidian (toggle off/on, or `Cmd+R`;
  optionally pjeby's Hot-Reload plugin). ✅

## Status — DONE (verified)

1. **Build fix (the only thing actually broken):** removed `node-sass` `^7.0.1`
   from `devDependencies`. It fails to compile native bindings on Node 18+.
   The repo already has dart-sass (`sass` `^1.49.9`); `svelte-preprocess` uses it
   automatically when `node-sass` is absent. After removal: `npm install` clean,
   `tsc` 0 errors, esbuild produced a ~149 KB `main.js`. ✅
   - **Do NOT run `npm audit fix --force`** — it would bump the 2022-era
     esbuild/svelte/eslint toolchain across majors and likely break the build.
     The audit warnings are all dev-only transitive deps that never ship into the
     bundle. ✅
2. Installed in-vault, enabled, and the `raindrop` block **renders bookmarks**. ✅
   (Switch the note to Reading view / Live Preview — code-block processors don't
   run in raw source mode.)

## Verified reference facts

### Raindrop API (official docs) 📖
- List bookmarks: `GET https://api.raindrop.io/rest/v1/raindrops/{collectionId}`
- Pagination: `perpage` max **50**; `page` is **0-indexed**. Last page = a page
  returning fewer than `perpage` items.
- Collections carry numeric `_id` and `title`:
  - `GET /rest/v1/collections` → root collections
  - `GET /rest/v1/collections/childrens` → nested (have positive `parent.$id`)
- Auth: Raindrop **test token** (Settings → Integrations → create app → test token).
  No OAuth flow needed for own-account access.

### Plugin behavior (read from source) ✅
- Code block params parsed in `main.ts`; `collection` is run through `parseInt`,
  so collections are referenced by **numeric ID, not name**.
- `getRaindropsCollection` in `src/raindrop.ts` sends only `search` and `sort` —
  **no `perpage`, no `page`, no `nested`**. Consequences:
  - Returns only the API's default first page → "not all bookmarks" bug.
  - A parent-folder query (`collection: <parentID>`) returns only raindrops filed
    *directly* in it; bookmarks in child collections are excluded (no `nested=true`).
- Obsidian API surface is small and uses only stable, still-current symbols
  (`Plugin`, `PluginSettingTab`, `Setting`, `registerMarkdownCodeBlockProcessor`).
  Nothing removed/deprecated → low runtime-compat risk. ✅

## Pending tasks (in priority order)

### 1. Apply the pagination patch (fixes "not all bookmarks")
Replace `getRaindropsCollection` in `src/raindrop.ts` with the version below.
**This compiles cleanly** (verified with `tsc` + esbuild). ✅ Runtime against a
live account **not yet verified** — confirm the rendered count matches expectations. ⚠️

```ts
const getRaindropsCollection = async (
  collectionID: number = 0,
  search: string,
  sort: string,
  accessToken: string
) => {
  const PERPAGE = 50;     // Raindrop API maximum
  const MAX_PAGES = 100;  // safety cap (= up to 5000 bookmarks)
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
      headers: { Authorization: `Bearer ${accessToken}` },
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
```
- ⚠️ More pages = more sequential calls. Raindrop rate limit is 120 req/min — fine
  for normal libraries; raise `MAX_PAGES` only if a single query exceeds ~5000 items.

### 2. Add a `nested:` code-block param (optional)
So `collection: <parentID>` + `nested: true` pulls the whole subtree. Threads through:
`src/types.ts` (add to the query type) → `main.ts` (parse the param, default false) →
`src/raindrop.ts` (pass `nested` into `params` when true). Not yet written. 📖

### 3. Optional `limit:` / `perpage:` code-block param
Per-query cap on results, for when you *don't* want "fetch everything". Not yet written. 📖

## Open question / runtime unknown ⚠️

`src/raindrop.ts` uses `fetch` for the Raindrop call. If that hits CORS in the
Obsidian renderer, the fix is Obsidian's `requestUrl` (from the `obsidian` module),
which bypasses CORS. **Bookmarks did render in testing**, so `fetch` may be fine —
but if a query ever shows an empty block with a CORS/network error in the dev
console (`Cmd+Opt+I`), switch the call to `requestUrl`. Not yet needed/verified.

## Appendix — list collections as CSV (verified jq) ✅

All fields, nested objects flattened to dotted columns, union-of-keys so `parent.*`
columns appear even when the first row is a root collection. Tested on jq 1.7.

```bash
export RAINDROP_TOKEN="your-test-token"

curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" \
  "https://api.raindrop.io/rest/v1/collections" \
  | jq -r '
    def flatten:
      . as $in
      | reduce paths(scalars) as $p ({}; .[$p | map(tostring) | join(".")] = ($in | getpath($p)));
    (.items | map(flatten)) as $rows
    | ($rows | map(keys_unsorted) | add | reduce .[] as $k ([]; if index($k) then . else .+[$k] end)) as $cols
    | ($cols | @csv),
      ($rows[] | [ .[$cols[]] ] | @csv)
  '
```

Root + children merged in one CSV (uses `-s` slurp; combined form **not** run end-to-end ⚠️):

```bash
{ curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" "https://api.raindrop.io/rest/v1/collections";
  curl -s -H "Authorization: Bearer $RAINDROP_TOKEN" "https://api.raindrop.io/rest/v1/collections/childrens"; } \
  | jq -s -r '
    def flatten:
      . as $in
      | reduce paths(scalars) as $p ({}; .[$p | map(tostring) | join(".")] = ($in | getpath($p)));
    ([.[].items[]] | map(flatten)) as $rows
    | ($rows | map(keys_unsorted) | add | reduce .[] as $k ([]; if index($k) then . else .+[$k] end)) as $cols
    | ($cols | @csv),
      ($rows[] | [ .[$cols[]] ] | @csv)
  '
```

Notes:
- `paths(scalars)` also expands arrays (`cover.0`, `cover.1`…); empty arrays/objects
  produce no column. ✅
- For just ID + title: `jq -r '.items[] | [._id, .title] | @csv'`. ✅
