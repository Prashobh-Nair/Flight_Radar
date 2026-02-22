import React from 'react';

const fmt = (v, unit = '', decimals = 0) =>
    v != null ? `${Number(v).toFixed(decimals)}${unit}` : 'N/A';

const heading2dir = (deg) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
};

export default function FlightInfoPanel({ flight, onClose }) {
    if (!flight) return null;

    return (
        <div className="flight-info-panel">
            <div className="flight-info-card glass-card">
                {/* Header */}
                <div className="flight-info-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="flight-callsign">{flight.callsign}</div>
                        <div className="flight-country-badge">{flight.country}</div>
                    </div>
                    <button className="close-btn" onClick={onClose} title="Close">×</button>
                </div>

                {/* Info Grid */}
                <div className="flight-info-grid">
                    <InfoItem label="ICAO24" value={flight.icao24.toUpperCase()} highlight />
                    <InfoItem
                        label="Altitude"
                        value={flight.altitude != null ? `${flight.altitude.toLocaleString()} m` : 'N/A'}
                    />
                    <InfoItem
                        label="Speed"
                        value={flight.velocity != null ? `${flight.velocity} km/h` : 'N/A'}
                    />
                    <InfoItem
                        label="Heading"
                        value={flight.heading != null
                            ? `${Math.round(flight.heading)}° ${heading2dir(flight.heading)}`
                            : 'N/A'}
                    />
                    <InfoItem
                        label="Latitude"
                        value={fmt(flight.latitude, '°', 4)}
                    />
                    <InfoItem
                        label="Longitude"
                        value={fmt(flight.longitude, '°', 4)}
                    />
                    <InfoItem
                        label="Vert. Rate"
                        value={flight.verticalRate != null
                            ? `${flight.verticalRate > 0 ? '↑' : '↓'} ${Math.abs(Math.round(flight.verticalRate))} m/s`
                            : 'N/A'}
                    />
                    <InfoItem label="On Ground" value={flight.onGround ? 'Yes' : 'No'} />
                    <InfoItem label="Origin" value={flight.country} />
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value, highlight }) {
    return (
        <div className="info-item">
            <div className="info-item-label">{label}</div>
            <div className={`info-item-value${highlight ? ' highlight' : ''}`}>{value}</div>
        </div>
    );
}
