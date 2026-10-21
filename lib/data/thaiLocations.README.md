# Administrative locations for the property editor

`thaiLocations.js` is a bundled Thai name-only snapshot from
[kongvut/thai-province-data](https://github.com/kongvut/thai-province-data),
commit `3dddbb03345635206c96f7089297d3d6faf9057b`, retrieved 2026-10-21.
The upstream MIT license is preserved in `thaiLocations.LICENSE.txt`.

Source files at that commit: `api/latest/province.json`, `district.json`, and
`sub_district.json`. Join by `province_id` and `district_id`, keep `name.th`, omit
deleted rows and the two municipal-only district records prefixed `ท้องถิ่นเทศบาล`.
The result contains 77 provinces and 928 districts (including Bangkok's 50 districts),
mapped to subdistrict names. This is a community dataset, not a live government feed.

The editor loads this data with `AdminLocationFields` only when the form is rendered;
opening the dropdown makes no Firebase or third-party requests. Updating geography
requires replacing this snapshot and running `node --test tests/adminLocations.test.mjs`.

Existing website categories, aliases, custom canal/road names and the property's saved
selection are merged at render time. Nothing writes these options into Firestore or
automatically changes a property's saved location. District names shared by several
provinces are not automatically expanded without an unambiguous parent.
