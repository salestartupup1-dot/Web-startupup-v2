# Multi-select house status filter

Verified 2026-10-12.

- `node --test tests/status-filters.test.mjs`: 5 passing tests (status counts, union, all vs none, checkbox toggling, group presets, new/blank statuses).
- `npx eslint pages/index.js lib/statusFilters.mjs tests/status-filters.test.mjs`: passed.
- `npx next build`: passed. Existing coordinate snapshot retained for this UI change.
- Browser with current Master Stock: 103 houses, statuses 30 unfinished / 41 vacant / 10 loan application / 5 concurrent application / 10 appraisal / 7 awaiting transfer.
- Vacant + awaiting transfer: 48 results.
- Clear selection: 0 results, no matching data message, options/counts remain available.
- At 390 × 844: two-column checkbox layout; appraisal + awaiting transfer: 17 results.
- Select all restores 103. Customer group preset selects four statuses (32); checking vacant afterward yields 73.
- Awaiting transfer + house-number search `18/50`: 1 result in Khlong Luang Khlong 3.
- Map, house list, location/project counts and summary tables use the same status predicate. Missing-highlights audit remains explicitly scoped to all stock as before.
- Production deployment `dpl_2Y5aPb81RZ4WfKrU8pzfky7UFG4Q` is READY at https://stock-map-startupuprealestate.vercel.app/. Live browser verified all six checkboxes and vacant + awaiting transfer = 48 houses.
