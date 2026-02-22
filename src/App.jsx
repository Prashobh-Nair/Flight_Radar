import React, { useState, useMemo, useCallback } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import FlightInfoPanel from './components/FlightInfoPanel';
import StatsWidget from './components/StatsWidget';
import SearchBar from './components/SearchBar';
import RegionFilter from './components/RegionFilter';
import Loader from './components/Loader';
import useFlightData from './hooks/useFlightData';

export default function App() {
  const [region, setRegion] = useState('india');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { flights, loading, error, lastUpdate, stats } = useFlightData(region);

  const handleRegionChange = useCallback((r) => {
    setRegion(r);
    setSelected(null);
  }, []);

  // Filter by search query
  const filteredFlights = useMemo(() => {
    if (!search.trim()) return flights;
    const q = search.trim().toLowerCase();
    return flights.filter(
      f => f.icao24.toLowerCase().includes(q) || f.callsign.toLowerCase().includes(q)
    );
  }, [flights, search]);

  const handleSelectFlight = useCallback((flight) => {
    setSelected(prev => prev?.icao24 === flight.icao24 ? null : flight);
  }, []);

  const handleClosePanel = useCallback(() => setSelected(null), []);

  return (
    <div className="app-container">
      <Navbar
        flightCount={flights.length}
      />

      <div className="main-layout">
        {/* Map area */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', height: '100%' }}>
          {loading && <Loader />}

          {error && (
            <div className="error-banner">
              <span>⚠️</span>
              {error.includes('401') || error.includes('403')
                ? 'Authentication error — check API credentials'
                : error.includes('429')
                  ? 'Rate limit reached — retrying in 20s'
                  : error}
            </div>
          )}

          <MapView
            flights={filteredFlights}
            selectedFlight={selected}
            onSelectFlight={handleSelectFlight}
          />

          {selected && (
            <FlightInfoPanel
              flight={selected}
              onClose={handleClosePanel}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="sidebar">
          <SearchBar value={search} onChange={setSearch} />
          <div className="sidebar-divider" />
          <RegionFilter value={region} onChange={handleRegionChange} />
          <div className="sidebar-divider" />
          <StatsWidget stats={stats} />
        </aside>
      </div>
    </div>
  );
}
