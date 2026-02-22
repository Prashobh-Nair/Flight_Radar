import React from 'react';

export default function Navbar({ flightCount }) {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <span className="brand-icon">✈</span>
                <div>
                    <div className="brand-title">FlightTracker</div>
                    <div className="brand-subtitle">Live Air Traffic</div>
                </div>
            </div>

            <div className="navbar-controls">
                <div className="nav-pill">
                    ✈ {flightCount ?? '—'} flights
                </div>
                <div className="live-badge">
                    <span className="live-dot" />
                    LIVE
                </div>
            </div>
        </nav>
    );
}
