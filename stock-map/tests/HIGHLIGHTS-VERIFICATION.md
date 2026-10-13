# Stock-map highlights — 2026-10-07

- Added per-house editable highlights with real-time document subscriptions, explicit Save, custom-over-website precedence, empty custom values, reset to website mode and transaction revision conflicts.
- Identity is SHA-256 of normalized project and house number, independent of spreadsheet row number. Website matching requires both fields and rejects ambiguous duplicates. New website listings are looked up by house number, then checked against project; no runtime full-site scan. Source wording refreshes through a five-minute CDN cache.
- Login uses the existing main-site Firebase Auth project and Admin/Host role records, with verified email required by the new rules. Public viewers cannot write. Public override documents contain no email/UID. Existing rules were backed up and preserved; only `stock_map_highlights` was added. Active release: `ce47bc68-3ca1-4706-9f50-1595b1763612`.
- Production Auth allowed-domain list gained only `stock-map-startupuprealestate.vercel.app`; existing entries preserved.
- Unit tests: 3 pass, including stable identity, ambiguous matching, custom/blank/reset precedence, length limit and stale revision rejection.
- Firestore emulator tests: 2 pass, covering public get/no list, denied unauthenticated/unapproved/unverified create and update, allowed verified admin writes, schema/type/size/time validation, immutable identity, monotonic revisions, reset and denied deletion.
- Browser QA used local Firebase Auth/Firestore emulators, never wrote test highlights to production. Verified website text for พฤกษา 93 / 24/182, first three items and expansion control, manual save, reload persistence, reset to website wording, independent content for พฤกษาวิลเลจ 2 / 55/56, and saving through the actual map popup. A temporary local sign-in fixture was removed after QA. Google popup sign-in itself was not completed in browser automation; approved-account state was tested via emulator email login.
- Checked 390px viewport: editor text uses 16px font, content width 240px without horizontal overflow. Popup height is bounded by the map, with internal scrolling. Browser viewport reset afterward.
- Targeted ESLint and optimized Next.js build pass. Full production flow still requires the user's existing Google Admin/Host account to sign in.
- Production deployment: dpl_A7wm8d8McCpmtSpVY1RcnNWeGexf, https://stock-map-startupuprealestate.vercel.app. Verified live API returns fresh highlights and the exact 24-182 source link. Live map popup for พฤกษา 93 / 24/182 shows 3 points, expands to 5, and offers sign-in to edit. No production highlight data was modified during QA.

## Follow-up: full list and missing matches

- Removed the three-item preview and expand/collapse button. Popup resizing also runs when the Firestore read completes, so delayed initial data cannot leave long content outside the map.
- Checked 103 current stock rows against 203 source listings. Eight failed matches were due to spelling differences, the project prefix, or abbreviated source names. All eight now match; 66 current stock rows match source listings, and no unmatched stock rows share a normalized house number with a source listing.
- Normalize source-only project spelling (ไทยสมบรูณ์ / ไทยสมบูรณ์) and the โครงการ prefix. Two verified abbreviated names are limited to their exact document ID, project and house number. Custom-highlight document IDs remain unchanged. Duplicate matches remain rejected.
- Unit tests: 5 pass, including all eight real cases, separate phases/units, scoped aliases, duplicate rejection and persisted identity preservation. Targeted ESLint and production build pass.
- Production API verified fresh nonempty highlights for 34/74, 48/66, 48/74, 33/345, 88/383, 5/557, 5/833 and 121/295. Browser verified 48/74 displays all four source points without an expansion button. No production data writes during verification.
- Final production deployment: dpl_5zqXvMu78aKzywbBWe95aspipj3m, https://stock-map-startupuprealestate.vercel.app.
- Final deployment browser check: Pruksa 72 / 243/97 renders all 8 points with no expansion control. Popup bounds stay inside the map (map y=130/h=629, popup y=135/h=486); content scrolls at 460px for a 594px list.

## Missing highlights summary

- Added an all-active-Stock summary, including count, project, house number, area and status. Sold properties are excluded through selectOwnedActive. The panel explicitly stays across all Stock regardless of map filters. Clicking a mapped house clears filters and opens its popup; an unlocated house opens the same highlights editor inline.
- Reads source highlights with a field mask and all pages, then uses public batchGet on known Stock override IDs. Existing Firestore rules stay unchanged (no list access, admin credentials, new collections or writes). Responses are validated for completeness; failures show an error instead of a false missing count. Server results coalesce concurrent requests and cache for 60 seconds; UI shows check time and retry.
- Local popup observations update counts immediately, preserving custom/blank/reset precedence. Later fresh summary reads supersede old local observations.
- Unit tests: 8 pass, including mixed source/custom/blank/reset, reordered batch responses, deduplication, missing response failures, source pagination and unknown new Stock rows. Targeted ESLint and production build pass.
- Local live-data API and browser: 103 active houses, 66 with highlights, 37 missing. Verified the list opens Pruksa Village 2 / 55/56 on the map and opens an inline highlights section for unlocated Lumpini / 32/167. No production data was changed during QA.
- API reference: https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/batchGet
- Production deployed as dpl_9oim9FGZogkPuDsBZL5boSxRaYYW. Live API and browser confirm 37 missing / 66 complete out of 103 Stock houses. At 390px the summary panel has no internal horizontal overflow (341px client/scroll width), all 37 entries accessible; viewport restored. Local server stopped.

## Address separator regression: Pruksa 13 / 37/1331

- User reported a false missing result. Main site stores house_number=37-1331, id=asu1rRYtB01ATmjWoa1H, with four highlight lines. Stock stores 37/1331. The prior audit only compared whitespace-normalized numbers and missed this case.
- Source matching now normalizes a slash/dash separator only between two complete numeric parts. Saved highlight identities remain unchanged. Cross-project, different numeric partitions (371/331), and ambiguous duplicate listings are still rejected.
- Live lookup for new source listings queries both slash/dash variants using IN, then applies the same strict project/unit match. Confirmed the public query returns the correct source document.
- Audited 103 current Stock houses against all 203 refreshed website records, also checked digit-only candidate numbers and public slugs for the unmatched rows. Found this one additional match; remaining unmatched count is 36. No numeric/slug candidates were found for those remaining 36; this does not establish whether their underlying address data contains other errors.
- Unit tests: 10 pass. Added the real 37/1331 source fixture and summary regression, separator variants, duplicate rejection and unit-boundary checks. Targeted ESLint and optimized build pass.
- Production deployed as dpl_3vF78ouzmToLtytHNQ5PJhEaZqBD. Live APIs confirm 37/1331 has four source highlight lines and is complete; summary has 67 complete / 36 missing out of 103. Browser confirms the missing list no longer includes 37/1331.
