import React from 'react';

export default function Loader({ message = 'Fetching flight data...' }) {
    return (
        <div className="loader-overlay">
            <div className="loader-rings">
                <div className="loader-ring" />
                <div className="loader-ring-2" />
                <span style={{ fontSize: 24, position: 'absolute' }}>✈️</span>
            </div>
            <div className="loader-text">SKYTRACKER</div>
            <div className="loader-subtext">{message}</div>
        </div>
    );
}
