import { useId, useMemo } from 'react';
import { adminLocationOptions } from '../../lib/adminLocations';

export default function AdminLocationFields({ locations, main, sub, onChange }) {
  const id = useId();
  const { mainOptions, subOptions } = useMemo(
    () => adminLocationOptions(locations, main, sub), [locations, main, sub],
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="label" htmlFor={`${id}-main`}>ทำเล (หลัก)</label>
        <select id={`${id}-main`} className="input-modern" value={main || ''}
          onChange={event => onChange({ main_location: event.target.value, sub_location: '' })}>
          <option value="">- เลือกทำเลหลัก -</option>
          {mainOptions.map(area => <option key={area} value={area}>{area}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${id}-sub`}>ทำเลย่อย</label>
        <select id={`${id}-sub`} className="input-modern" value={sub || ''} disabled={!main}
          onChange={event => onChange({ main_location: main, sub_location: event.target.value })}>
          <option value="">- เลือกทำเลย่อย -</option>
          {subOptions.map(area => <option key={area} value={area}>{area}</option>)}
        </select>
      </div>
    </div>
  );
}
