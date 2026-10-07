const text = value => String(value || '').trim();
export const propertyMapZone = property => {
  const area = text(property.main_location) || text(property.district) || 'พื้นที่อื่นๆ';
  const sub = text(property.sub_location);
  return { key: JSON.stringify([area, sub]), name: sub && sub !== area ? `${area} · ${sub}` : area };
};

const average = points => ({
  lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
  lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
});

// The overview follows Stock Map: sub-area -> projects -> individual houses.
// Average project positions equally, so a project with many houses cannot pull the zone pin away.
export function groupPropertyMapZones(properties, getCoords) {
  const zones = new Map();
  properties.filter(property => property.badge !== 'Sold Out').forEach(property => {
    const zone = propertyMapZone(property);
    if (!zones.has(zone.key)) zones.set(zone.key, { ...zone, items: [], projects: new Map() });
    const group = zones.get(zone.key);
    group.items.push(property);
    const projectName = text(property.project_name) || 'ไม่ระบุชื่อโครงการ';
    if (!group.projects.has(projectName)) group.projects.set(projectName, { name: projectName, items: [] });
    group.projects.get(projectName).items.push(property);
  });
  return [...zones.values()].map(zone => {
    const projects = [...zone.projects.values()].map(project => ({
      ...project, ...average(project.items.map(getCoords)),
    }));
    return { ...zone, projects, ...average(projects) };
  });
}
