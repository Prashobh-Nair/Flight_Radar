import React from 'react';
import { REGIONS } from '../hooks/useFlightData';

export default function RegionFilter({ value, onChange }) {
    return (
        <div>
            <div className="section-label">Region Filter</div>
            <select
                className="region-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {Object.entries(REGIONS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </select>
        </div>
    );
}
