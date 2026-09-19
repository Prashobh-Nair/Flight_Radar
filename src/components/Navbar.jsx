import React from 'react';

export default function Navbar({ flightCount, onRefresh, loading }) {
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
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="nav-pill"
                        style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s ease'
                        }}
                        title="Refresh flight data"
                    >
                        <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s ease' }}>
                            🔄
                        </span>
                        {loading ? 'Updating...' : 'Refresh'}
                    </button>
                )}
                <div className="live-badge">
                    <span className="live-dot" />
                    LIVE
                </div>
            </div>
        </nav>
    );
}
