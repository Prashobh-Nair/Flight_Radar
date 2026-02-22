import React, { useMemo } from 'react';

export default function StatsWidget({ stats }) {
    const topCountries = useMemo(() => {
        return Object.entries(stats.byCountry)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [stats.byCountry]);

    const maxCount = topCountries[0]?.[1] || 1;

    return (
        <div>
            {/* Main Stats */}
            <div className="section-label">Live Statistics</div>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">✈️</div>
                    <div className="stat-value">{stats.total.toLocaleString()}</div>
                    <div className="stat-label">Airborne</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏔️</div>
                    <div className="stat-value">
                        {stats.avgAltitude ? `${(stats.avgAltitude / 1000).toFixed(1)}k` : '—'}
                    </div>
                    <div className="stat-label">Avg Alt (m)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-value">
                        {stats.maxSpeed ? stats.maxSpeed.toLocaleString() : '—'}
                    </div>
                    <div className="stat-label">Top Speed km/h</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🌍</div>
                    <div className="stat-value">{Object.keys(stats.byCountry).length}</div>
                    <div className="stat-label">Countries</div>
                </div>
            </div>

            {/* Country Breakdown */}
            {topCountries.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <div className="section-label" style={{ marginBottom: 8 }}>Top Countries</div>
                    <div className="country-list">
                        {topCountries.map(([country, count]) => (
                            <div key={country}>
                                <div className="country-item">
                                    <span className="country-name">{country}</span>
                                    <span className="country-count">{count}</span>
                                </div>
                                <div className="country-bar">
                                    <div
                                        className="country-bar-fill"
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
