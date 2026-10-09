// A catalogue can be stale. Preview only descriptive fields, never commercial data.
const PREVIEW_FIELDS = [
  'id', 'custom_id', 'project_name', 'house_number', 'soi', 'category',
  'images', 'imageUrl', 'area_wah', 'bedrooms', 'bathrooms', 'parking',
  'main_location', 'sub_location', 'district', 'subdistrict', 'lat', 'lng',
];

export function createPropertyPreview(property) {
  return Object.fromEntries([
    ...PREVIEW_FIELDS.filter(key => property[key] !== undefined).map(key => [key, property[key]]),
    ['_detailsPending', true],
  ]);
}
