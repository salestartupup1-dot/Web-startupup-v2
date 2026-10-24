import { selectPublicProperties } from './propertyOwners.js';

// Listing HTML needs card fields, not every gallery and facilities paragraph.
// Opening a house still reads the complete, current document through /api/property.
export function seoCatalogue(properties = []) {
  const fields = ['id', 'custom_id', 'project_name', 'house_number', 'property_owner', 'category', 'status', 'badge',
    'inventoryState', 'price', 'main_location', 'sub_location', 'district', 'subdistrict', 'province', 'bedrooms', 'bathrooms',
    'area_wah', 'parking', 'lat', 'lng', 'imageUrl', 'createdAt', 'updatedAt'];
  return selectPublicProperties(properties).map(property => ({
    ...Object.fromEntries(fields.filter(key => property[key] !== undefined).map(key => [key, property[key]])),
    images: property.images?.slice(0, 1) || [],
  }));
}
