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
3. **Pagination** — `getRaindropsCollection` loops pages (50/req, short-page break).
   Runtime-verified against the live account: a nested parent query returned all
   **163** bookmarks across 4 pages (50+50+50+13). `sort` (`-created`, `title`) and
   `search` confirmed working server-side. ✅
4. **`nested:` param** — added (`types.ts` → `main.ts` → `src/raindrop.ts`); passes
   `nested=true` to the API. Verified: `2-a` (66266433) returns 0 directly, 163 with
   `nested: true`. ✅
5. **`limit:` param** — caps total results; shrinks page size when `limit < 50` to
   avoid over-fetching. Compiled into the bundle. ✅
6. **Security:** the test token had been hardcoded in `get-collection-*.sh` and pushed
   to the **public** GitHub repo (commit `5297d94`). Scripts rewritten to read the token
   from the gitignored `data.json`; **the exposed token was rotated** and the old one
   confirmed dead. ✅

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
- `getRaindropsCollection` in `src/raindrop.ts` now paginates (`perpage=50` + `page`)
  and accepts `nested` and `limit`. The historical "not all bookmarks" bug (first page
  only) and the "parent folder excludes children" limitation are both fixed — use
  `nested: true` to pull the subtree. ✅
- Obsidian API surface is small and uses only stable, still-current symbols
  (`Plugin`, `PluginSettingTab`, `Setting`, `registerMarkdownCodeBlockProcessor`).
  Nothing removed/deprecated → low runtime-compat risk. ✅

## Completed (2026-06-03 session) ✅

All three originally-pending tasks are done — built (`npm run build`, `tsc` 0 errors),
plugin reloaded via the Obsidian CLI (`obsidian plugin:reload id=obsidian-raindrop`),
and verified against the live account:

1. **Pagination** — fetches every page, not just the first. Verified (163 across 4 pages).
2. **`nested:`** — `collection: <parentID>` + `nested: true` pulls the whole subtree.
3. **`limit:`** — per-query cap on total results (e.g. `sort: -created` + `limit: 10`).

The full param reference + collection-ID list now live in the vault note
`notes/2-area/INFRA/apps/Raindrop bookmark query blocks.md`, with a regeneration
guide/prompt appended to `notes/2-area/INFRA/+2-A-INFRA MOC.md`. README updated too.

### Possible next steps (not requested)
- Add a `count` field to `get-collection-ids.sh` output so the reference note can be
  regenerated entirely from the script (counts currently need a separate API read).
- README's "search optional = N" cell is misleading — `search` is optional; the real
  requirement is `collection` **or** `raindropIDs`.

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
