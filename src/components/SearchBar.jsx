import React from 'react';

export default function SearchBar({ value, onChange }) {
    return (
        <div>
            <div className="section-label">Search Flights</div>
            <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="ICAO24 or callsign..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                />
                {value && (
                    <button className="search-clear" onClick={() => onChange('')}>×</button>
                )}
            </div>
        </div>
    );
}
