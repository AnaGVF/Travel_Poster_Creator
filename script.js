const STORAGE_KEY = 'travel_poster_creator_session';

const INITIAL_STATIONS = [
  { id: '1', name: "Flensburg (D)", coords: [54.7836, 9.4321], dates: "Start", startDate: "2026-07-18", endDate: "2026-07-18", type: "start" },
  { id: '2', name: "Hillerød Camping (DK)", coords: [55.9328, 12.2890], dates: "18.07. – 20.07.", startDate: "2026-07-18", endDate: "2026-07-20" },
  { id: '3', name: "Hjo Camping (Vättern)", coords: [58.3075, 14.2961], dates: "20.07. – 22.07.", startDate: "2026-07-20", endDate: "2026-07-22" },
  { id: '4', name: "Karlstad Swecamp", coords: [59.3621, 13.3496], dates: "22.07. – 25.07.", startDate: "2026-07-22", endDate: "2026-07-25" },
  { id: '5', name: "Östersund Camping", coords: [63.1672, 14.6738], dates: "25.07. – 28.07. (Norden)", startDate: "2026-07-25", endDate: "2026-07-28", type: "north" },
  { id: '6', name: "Sälstens Camping (Härnösand)", coords: [62.6372, 17.9620], dates: "28.07. – 30.07.", startDate: "2026-07-28", endDate: "2026-07-30" },
  { id: '7', name: "Camping Gävle", coords: [60.7259, 17.2694], dates: "30.07. – 01.08.", startDate: "2026-07-30", endDate: "2026-08-01" },
  { id: '8', name: "Bredäng Stockholm", coords: [59.2964, 17.9221], dates: "01.08. – 04.08.", startDate: "2026-08-01", endDate: "2026-08-04" },
  { id: '9', name: "Saxnäs Camping (Öland)", coords: [56.6341, 16.4820], dates: "04.08. – 06.08.", startDate: "2026-08-04", endDate: "2026-08-06" },
  { id: '10', name: "First Camp Malmö-Sibbarp", coords: [55.5746, 12.9069], dates: "06.08. – 08.08.", startDate: "2026-08-06", endDate: "2026-08-08" },
  { id: '11', name: "Scharnebeck (D)", coords: [53.2944, 10.5111], dates: "Rückreise / Ziel", startDate: "2026-08-08", endDate: "2026-08-08", type: "end" }
];

const DEFAULT_AESTHETICS = {
  saturation: 130,
  contrast: 108,
  brightness: 102,
  relief: 45,
  preset: 'vibrant'
};

const PRESETS = {
  vibrant: { saturation: 140, contrast: 110, brightness: 102, relief: 45 },
  natural: { saturation: 100, contrast: 100, brightness: 100, relief: 35 },
  pastel:  { saturation: 115, contrast: 95,  brightness: 106, relief: 25 }
};

let stations = JSON.parse(JSON.stringify(INITIAL_STATIONS));
let mapAesthetics = { ...DEFAULT_AESTHETICS };
let currentLang = 'de'; // 'de' or 'en'
let routeStyle = 'driving'; // 'driving' or 'direct'
let titleScale = 100; // in percent (70 to 160)
let legendScale = 100; // in percent (70 to 140)
let legendWidth = 230; // in px (160 to 520)
let sidebarWidth = 360; // in px (280 to 650)
const routeCache = new Map();
let currentRouteRequestId = 0;
let map, outerPolyline, innerPolyline;
let markers = [];
let isPickingMapLocation = false;
let mapTileLayer, hillshadeLayer;
let currentSearchResults = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initSidebarControls();
  initTitleResize();
  initLegendResize();
  initSidebarResize();
  const hasSavedState = loadSavedSession();
  applyMapAesthetics();
  applyTitleScale(titleScale);
  applyLegendScale(legendScale);
  applyLegendWidth(legendWidth);
  applySidebarWidth(sidebarWidth);
  renderPoster(!hasSavedState);
});

function getRouteCacheKey(stationList) {
  return stationList.map(s => `${s.coords[0].toFixed(5)},${s.coords[1].toFixed(5)}`).join(';');
}

function routeHasFerry(route) {
  if (!route || !route.legs) return false;
  for (const leg of route.legs) {
    if (leg.steps) {
      for (const step of leg.steps) {
        if (step.mode === 'ferry' || step.maneuver?.type === 'ferry') {
          return true;
        }
        const stepName = (step.name || '').toLowerCase();
        if (stepName.includes('ferry') || stepName.includes('fähre') || stepName.includes('færge') || stepName.includes('färja')) {
          return true;
        }
      }
    }
  }
  return false;
}

async function queryOSRM(coordList) {
  try {
    const coordsStr = coordList.map(c => `${c[1]},${c[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&steps=true&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      return data.routes[0];
    }
  } catch (e) {
    // Network or parse failure
  }
  return null;
}

function offsetLeg(coords, offsetDist = 0.0024) {
  if (!coords || coords.length < 2) return coords;
  const n = coords.length;
  const result = [];

  for (let i = 0; i < n; i++) {
    const lat = coords[i][0];
    const lng = coords[i][1];

    let prevIdx = Math.max(0, i - 1);
    let nextIdx = Math.min(n - 1, i + 1);

    while (prevIdx > 0 && coords[prevIdx][0] === lat && coords[prevIdx][1] === lng) prevIdx--;
    while (nextIdx < n - 1 && coords[nextIdx][0] === lat && coords[nextIdx][1] === lng) nextIdx++;

    const cosLat = Math.cos((lat * Math.PI) / 180);
    const dLat = coords[nextIdx][0] - coords[prevIdx][0];
    const dLng = (coords[nextIdx][1] - coords[prevIdx][1]) * cosLat;
    const len = Math.sqrt(dLat * dLat + dLng * dLng);

    if (len === 0) {
      result.push([lat, lng]);
      continue;
    }

    // Perpendicular vector (normal to the right in driving direction)
    const nLat = -dLng / len;
    const nLng = (dLat / len) / cosLat;

    // Smooth tapering near the start and end of each leg so lines attach right to the marker tail
    let taper = 1.0;
    if (i < 5) taper = i / 5;
    else if (i >= n - 5) taper = (n - 1 - i) / 5;

    const offset = offsetDist * taper;
    result.push([lat + nLat * offset, lng + nLng * offset]);
  }

  return result;
}

async function fetchDrivingRoute(stationCoords) {
  if (!stationCoords || stationCoords.length < 2) return stationCoords;

  // Run leg-by-leg routing in parallel to guarantee no-ferry bridge routing per segment
  try {
    const legPromises = [];
    for (let i = 0; i < stationCoords.length - 1; i++) {
      const from = stationCoords[i];
      const to = stationCoords[i + 1];
      legPromises.push(fetchSingleLegDrivingRoute(from, to));
    }
    const legResults = await Promise.all(legPromises);
    
    // Apply slight right-hand driving offset to each leg so overlapping 2-way routes (e.g. across Denmark)
    // run in parallel and preserve their dashed trail without filling in each other's gaps!
    const offsetLegs = legResults.map(leg => offsetLeg(leg, 0.0024));
    
    return offsetLegs.length > 0 ? offsetLegs : [stationCoords];
  } catch (err) {
    console.error('Error fetching driving routes:', err);
    return [stationCoords];
  }
}

async function fetchSingleLegDrivingRoute(from, to) {
  try {
    // 1. Try direct route between the two stops
    const directRoute = await queryOSRM([from, to]);
    if (directRoute) {
      // If no ferry is used, return direct road geometry
      if (!routeHasFerry(directRoute)) {
        return directRoute.geometry.coordinates.map(pt => [pt[1], pt[0]]);
      }

      // If a ferry/ship was detected, route strictly through land & bridges instead:
      // Øresund Bridge (DK <-> SE): [55.5760, 12.8480]
      // Great Belt Bridge / Storebælt (Zealand <-> Funen): [55.3350, 10.9850]
      const bridgeCandidates = [
        [from, [55.5760, 12.8480], to],                          // Via Øresund Bridge
        [from, [55.3350, 10.9850], to],                          // Via Storebælt Bridge
        [from, [55.3350, 10.9850], [55.5760, 12.8480], to],     // Via Storebælt then Øresund
        [from, [55.5760, 12.8480], [55.3350, 10.9850], to]      // Via Øresund then Storebælt
      ];

      for (const candidate of bridgeCandidates) {
        const candidateRoute = await queryOSRM(candidate);
        if (candidateRoute && !routeHasFerry(candidateRoute)) {
          return candidateRoute.geometry.coordinates.map(pt => [pt[1], pt[0]]);
        }
      }

      // Fallback if unreachable without ferry
      return directRoute.geometry.coordinates.map(pt => [pt[1], pt[0]]);
    }
  } catch (e) {
    console.warn('Single leg routing error:', e);
  }
  return [from, to];
}

function toLocalDateStr(d) {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    wheelPxPerZoomLevel: 120,
    wheelDebounceTime: 40,
    zoomAnimation: true,
    zoomAnimationThreshold: 8,
    fadeAnimation: true,
    inertia: true,
    inertiaDeceleration: 3000,
    minZoom: 4.5      // Below this, even capital cities disappear from OSM tiles
  }).setView([58.6, 15.2], 5.85);

  // Layer 1: ESRI Topographic Shaded Relief (High Quality)
  hillshadeLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16,
    opacity: mapAesthetics.relief / 100
  }).addTo(map);

  // Set initial map base tile layer based on selected language
  updateMapTileLayer();

  // Real-time bidirectional zoom listeners
  map.on('zoom', updateZoomUI);
  map.on('zoomend', () => {
    updateZoomUI();
    if (!isPreparingPrint) saveSession(false);
  });
  map.on('moveend', () => {
    if (!isPreparingPrint) saveSession(false);
  });

  // Map Click Listener for "Pick Location" mode
  map.on('click', (e) => {
    if (!isPickingMapLocation) return;
    const lat = parseFloat(e.latlng.lat.toFixed(4));
    const lng = parseFloat(e.latlng.lng.toFixed(4));

    const todayStr = toLocalDateStr(new Date());
    const newStation = {
      id: Date.now().toString(),
      name: `Location (${lat}, ${lng})`,
      coords: [lat, lng],
      startDate: todayStr,
      endDate: todayStr,
      dates: formatDisplayDates(todayStr, todayStr)
    };

    stations.push(newStation);
    saveSession(false);
    renderPoster();
    
    // Reverse Geocode name asynchronously (request language based on currentLang)
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${currentLang}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const simpleName = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || data.address?.county || data.display_name.split(',')[0];
          newStation.name = simpleName;
          saveSession(false);
          renderPoster();
        }
      })
      .catch(() => {});

    // Turn off pick mode
    toggleMapPickMode(false);
  });
}

function updateZoomUI() {
  if (!map) return;
  const zoom = map.getZoom();
  const zoomFormatted = `${zoom.toFixed(2)}x`;

  // Sidebar zoom slider & indicator
  const sidebarZoomSlider = document.getElementById('slider-map-zoom');
  const sidebarZoomVal = document.getElementById('val-map-zoom');
  if (sidebarZoomSlider && document.activeElement !== sidebarZoomSlider) {
    sidebarZoomSlider.value = zoom;
  }
  if (sidebarZoomVal) {
    sidebarZoomVal.textContent = zoomFormatted;
  }
}

function fitRouteBounds() {
  if (!map) return;
  const latlngs = stations.map(loc => loc.coords);
  if (latlngs.length > 1) {
    try {
      map.fitBounds(L.latLngBounds(latlngs), { 
        paddingTopLeft: [115, 60], 
        paddingBottomRight: [75, 135],
        maxZoom: 12,
        animate: true
      });
    } catch(e) {}
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 7);
  }
}

function updateMapTileLayer() {
  if (mapTileLayer) {
    map.removeLayer(mapTileLayer);
  }

  // High-resolution tile configuration
  const isGerman = currentLang === 'de';
  const tileUrl = isGerman
    ? 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Standard tile configuration: consistent 1:1 scale, city labels appear at natural size
  mapTileLayer = L.tileLayer(tileUrl, {
    maxZoom: 19,
    maxNativeZoom: 18,
    tileSize: 256,
    zoomOffset: 0,
    opacity: 0.90
  }).addTo(map);

  applyMapAesthetics();
}

function applyMapAesthetics() {
  // Apply CSS color filters only to the map tiles canvas without touching pins, title, or legend
  const tilePane = document.querySelector('.leaflet-tile-pane');
  if (tilePane) {
    tilePane.style.filter = `saturate(${mapAesthetics.saturation}%) contrast(${mapAesthetics.contrast}%) brightness(${mapAesthetics.brightness}%)`;
  }

  // Update hillshade relief layer opacity
  if (hillshadeLayer) {
    hillshadeLayer.setOpacity(mapAesthetics.relief / 100);
  }

  // Update UI sliders and text indicators
  const satInput = document.getElementById('slider-saturation');
  const conInput = document.getElementById('slider-contrast');
  const briInput = document.getElementById('slider-brightness');
  const relInput = document.getElementById('slider-relief');

  const satVal = document.getElementById('val-saturation');
  const conVal = document.getElementById('val-contrast');
  const briVal = document.getElementById('val-brightness');
  const relVal = document.getElementById('val-relief');

  if (satInput) satInput.value = mapAesthetics.saturation;
  if (conInput) conInput.value = mapAesthetics.contrast;
  if (briInput) briInput.value = mapAesthetics.brightness;
  if (relInput) relInput.value = mapAesthetics.relief;

  if (satVal) satVal.textContent = `${mapAesthetics.saturation}%`;
  if (conVal) conVal.textContent = `${mapAesthetics.contrast}%`;
  if (briVal) briVal.textContent = `${mapAesthetics.brightness}%`;
  if (relVal) relVal.textContent = `${mapAesthetics.relief}%`;

  // Update preset pills active state
  document.querySelectorAll('.preset-pill').forEach(btn => {
    if (btn.dataset.preset === mapAesthetics.preset) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function formatDisplayDates(startStr, endStr) {
  if (!startStr) return '';
  const parseDate = (s) => {
    const parts = s.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.`;
    return s;
  };

  const formattedStart = parseDate(startStr);
  if (!endStr || startStr === endStr) {
    return formattedStart;
  }
  const formattedEnd = parseDate(endStr);
  return `${formattedStart} – ${formattedEnd}`;
}

function renderPoster(shouldAutoFit = false) {
  if (!map) return;

  // Clear existing markers & polylines
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  if (outerPolyline) map.removeLayer(outerPolyline);
  if (innerPolyline) map.removeLayer(innerPolyline);

  // Calculate dynamic labels & badge styles
  const total = stations.length;
  stations.forEach((loc, idx) => {
    loc.computedLabel = String(idx + 1);
    if (idx === 0) {
      loc.computedColor = '#2f855a';
    } else if (idx === total - 1) {
      loc.computedColor = '#dd6b20';
    } else {
      loc.computedColor = loc.type === 'north' ? '#c53030' : '#2b6cb0';
    }
  });

  const latlngs = stations.map(loc => loc.coords);

  if (latlngs.length > 1) {
    const routeKey = getRouteCacheKey(stations);
    const isDriving = (routeStyle === 'driving');
    const hasCachedRoute = isDriving && routeCache.has(routeKey);
    const initialLineCoords = hasCachedRoute ? routeCache.get(routeKey) : [latlngs];

    // Outer glow casing
    outerPolyline = L.polyline(initialLineCoords, {
      color: '#ffffff',
      weight: 5.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Inner bold dashed trail line
    innerPolyline = L.polyline(initialLineCoords, {
      color: '#dc2626',
      weight: 3.2,
      opacity: 0.95,
      dashArray: '7, 7',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Only auto-fit when explicitly requested (e.g. initial setup or user clicks Fit Route)
    if (shouldAutoFit) {
      try {
        map.fitBounds(L.latLngBounds(latlngs), { 
          paddingTopLeft: [115, 60], 
          paddingBottomRight: [75, 135],
          maxZoom: 12,
          animate: true
        });
      } catch(e) {}
    }

    // Asynchronously fetch driving route when not in cache
    if (isDriving && !hasCachedRoute) {
      const requestId = ++currentRouteRequestId;
      fetchDrivingRoute(latlngs)
        .then(roadCoords => {
          if (requestId === currentRouteRequestId && roadCoords && roadCoords.length > 0) {
            routeCache.set(routeKey, roadCoords);
            if (outerPolyline && innerPolyline) {
              outerPolyline.setLatLngs(roadCoords);
              innerPolyline.setLatLngs(roadCoords);
            }
          }
        })
        .catch(err => {
          console.warn('Driving route fetch error, retaining direct line:', err);
        });
    }
  } else if (latlngs.length === 1 && shouldAutoFit) {
    map.setView(latlngs[0], 7);
  }

  // Render Map Pins
  stations.forEach((loc, idx) => {
    let pinClass = 'pin-bubble';
    if (idx === 0) pinClass += ' pin-start';
    else if (idx === total - 1) pinClass += ' pin-end';
    else if (loc.type === 'north') pinClass += ' pin-north';

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="${pinClass}">${loc.computedLabel}</div>`,
      iconSize: [26, 34],      // bubble (26px) + tail (8px)
      iconAnchor: [13, 34]    // anchor = tail tip: horizontally centered, vertically at the very bottom
    });

    const marker = L.marker(loc.coords, { icon: customIcon }).addTo(map);
    markers.push(marker);
  });

  // Render Poster Legend
  renderLegend();

  // Render Sidebar Station Manager List
  renderSidebarStationList();
}

function renderLegend() {
  const legendList = document.getElementById('legend-list');
  if (!legendList) return;

  if (stations.length === 0) {
    const emptyMsg = currentLang === 'de' ? 'Keine Stationen vorhanden' : 'No stations added yet';
    legendList.innerHTML = `<div style="font-size: 11px; color: #a0aec0; padding: 6px 0; font-style: italic;">${emptyMsg}</div>`;
    return;
  }

  legendList.innerHTML = stations.map(loc => `
    <div class="stop-row">
      <span class="badge" style="background:${loc.computedColor};">${loc.computedLabel}</span>
      <div class="stop-details">
        <strong>${escapeHtml(loc.name)}</strong><br>
        <span class="stop-dates">${escapeHtml(loc.dates || '')}</span>
      </div>
    </div>
  `).join('');
}

function renderSidebarStationList() {
  const listEl = document.getElementById('station-list');
  const countEl = document.getElementById('station-count');
  if (!listEl) return;

  if (countEl) countEl.textContent = stations.length;

  if (stations.length === 0) {
    const emptySidebarMsg = currentLang === 'de'
      ? 'Keine Stationen. Nutze die Suche oben oder klicke auf die Karte, um Orte hinzuzufügen.'
      : 'No stations. Use the search above or click on the map to add locations.';
    listEl.innerHTML = `<div style="text-align: center; color: #a0aec0; padding: 32px 14px; font-size: 12px; line-height: 1.4;">${emptySidebarMsg}</div>`;
    return;
  }

  listEl.innerHTML = stations.map((loc, index) => `
    <div class="station-card-item" data-id="${loc.id}">
      <div class="station-item-top">
        <div class="station-item-info">
          <span class="station-badge-preview" style="background:${loc.computedColor};">${loc.computedLabel}</span>
          <input type="text" class="sidebar-input station-name-input" value="${escapeHtml(loc.name)}" placeholder="Station Name" data-index="${index}">
        </div>
        <div class="station-controls">
          <button class="icon-btn" onclick="moveStation(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move Up">↑</button>
          <button class="icon-btn" onclick="moveStation(${index}, 1)" ${index === stations.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
          <button class="icon-btn icon-btn-danger" onclick="removeStation(${index})" title="Delete">&times;</button>
        </div>
      </div>
      <div class="date-picker-row">
        <input type="text" class="sidebar-input date-range-picker" placeholder="Select Dates 📅" data-index="${index}">
      </div>
    </div>
  `).join('');

  // Add input listeners for name editing without triggering re-render blur
  listEl.querySelectorAll('.station-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (!isNaN(idx) && stations[idx]) {
        stations[idx].name = e.target.value;
        saveSession(false);
        renderLegend();
      }
    });
  });

  // Attach Flatpickr range calendars
  listEl.querySelectorAll('.date-range-picker').forEach(input => {
    const idx = parseInt(input.dataset.index);
    const station = stations[idx];
    if (!station) return;
    const defaultDates = (station.startDate && station.endDate) ? [station.startDate, station.endDate] : [];

    flatpickr(input, {
      mode: "range",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d.m.Y",
      defaultDate: defaultDates,
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          const start = toLocalDateStr(selectedDates[0]);
          const end = toLocalDateStr(selectedDates[1]);
          station.startDate = start;
          station.endDate = end;
          station.dates = formatDisplayDates(start, end);
          saveSession(false);
          renderLegend();
        } else if (selectedDates.length === 1) {
          const start = toLocalDateStr(selectedDates[0]);
          station.startDate = start;
          station.endDate = start;
          station.dates = formatDisplayDates(start, start);
          saveSession(false);
          renderLegend();
        }
      }
    });
  });
}

function initSidebarControls() {
  const sidebar = document.getElementById('editor-sidebar');
  const toggleBtn = document.getElementById('toggle-editor-btn');
  const closeBtn = document.getElementById('close-sidebar-btn');
  const titleInput = document.getElementById('poster-title-input');
  const subtitleInput = document.getElementById('poster-subtitle-input');
  const displayTitle = document.getElementById('display-poster-title');
  const displaySubtitle = document.getElementById('display-poster-subtitle');
  const searchInput = document.getElementById('location-search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsDropdown = document.getElementById('search-results-dropdown');
  const pickMapBtn = document.getElementById('pick-map-btn');
  const resetBtn = document.getElementById('reset-default-btn');
  const saveSessionBtn = document.getElementById('save-session-btn');

  const langToggle = document.getElementById('language-toggle');
  const langDeLabel = document.getElementById('lang-de-label');
  const langEnLabel = document.getElementById('lang-en-label');

  // Aesthetic slider inputs
  const satInput = document.getElementById('slider-saturation');
  const conInput = document.getElementById('slider-contrast');
  const briInput = document.getElementById('slider-brightness');
  const relInput = document.getElementById('slider-relief');
  const resetAestheticBtn = document.getElementById('reset-aesthetic-btn');

  const translations = {
    de: {
      app_title: "Reiseposter Ersteller",
      manage_btn: "Stationen & Poster verwalten",
      save_btn: "Poster speichern / drucken",
      sidebar_title: "Stationen-Manager",
      dimensions_label: "Poster-Format & Größe",
      poster_header_label: "Poster-Überschrift",
      title_placeholder: "Titel (z.B. Schweden Reise)",
      subtitle_placeholder: "Untertitel (z.B. Sommer 2026)",
      route_style_label: "Routen-Stil",
      route_style_driving: "Fahrstrecke (Auto / Straßen)",
      route_style_direct: "Direktlinie (Luftlinie)",
      title_size_label: "Titel-Box Größe",
      legend_size_label: "Stationen-Menü Größe",
      map_zoom_section_label: "Karten-Zoom & Ausschnitt",
      fit_route_btn: "Route einpassen",
      map_aesthetic_label: "Karten-Farben & Optik",
      aesthetic_reset_btn: "Standard",
      slider_saturation: "Farbsättigung",
      slider_contrast: "Kontrast",
      slider_brightness: "Helligkeit",
      slider_relief: "Relief / Gelände",
      slider_zoom: "Zoomstufe",
      preset_vibrant: "Lebendig",
      preset_natural: "Natürlich",
      preset_pastel: "Sanft",
      search_label: "Station suchen & hinzufügen",
      search_input_placeholder: "Stadt oder Ort eingeben...",
      search_btn: "Suchen",
      pick_map_btn: "Auf Karte klicken um Ort zu wählen",
      pick_map_cancel: "Auf Karte klicken um Station hinzuzufügen... (Abbrechen)",
      route_stations_label: "Routen-Stationen",
      reset_btn: "Alle löschen",
      save_session_btn: "Session speichern",
      session_saved: "✓ Gespeichert!",
      legend_header: "STATIONEN",
      station_name_placeholder: "Station Name",
      select_dates_placeholder: "Daten wählen 📅",
      opt_a4: "A4 Hochformat (210 × 297 mm)",
      opt_a3: "A3 Hochformat (297 × 420 mm)",
      opt_a5: "A5 Minidruck (148 × 210 mm)",
      opt_square_small: "Quadratisch (210 × 210 mm)",
      opt_square_large: "Quadratisch Groß (297 × 297 mm)"
    },
    en: {
      app_title: "Travel Poster Creator",
      manage_btn: "Manage Stations & Poster",
      save_btn: "Save / Print Poster",
      sidebar_title: "Station Manager",
      dimensions_label: "Poster Dimensions & Size",
      poster_header_label: "Poster Header",
      title_placeholder: "Title (e.g. Sweden Trip)",
      subtitle_placeholder: "Subtitle (e.g. Summer 2026)",
      route_style_label: "Route Style",
      route_style_driving: "Driving Route (Car / Roads)",
      route_style_direct: "Direct Line (Beeline)",
      title_size_label: "Title Box Size",
      legend_size_label: "Station Menu Size",
      map_zoom_section_label: "Map Zoom & Framing",
      fit_route_btn: "Fit Route",
      map_aesthetic_label: "Map Colors & Aesthetics",
      aesthetic_reset_btn: "Reset",
      slider_saturation: "Color Saturation",
      slider_contrast: "Contrast",
      slider_brightness: "Brightness",
      slider_relief: "Terrain Relief",
      slider_zoom: "Zoom Level",
      preset_vibrant: "Vibrant",
      preset_natural: "Natural",
      preset_pastel: "Pastel",
      search_label: "Search & Add Station",
      search_input_placeholder: "Type city or place name...",
      search_btn: "Search",
      pick_map_btn: "Click on Map to Pick Location",
      pick_map_cancel: "Click anywhere on map to add station... (Cancel)",
      route_stations_label: "Route Stations",
      reset_btn: "Clear all",
      save_session_btn: "Save Session",
      session_saved: "✓ Saved!",
      legend_header: "STATIONS",
      station_name_placeholder: "Station Name",
      select_dates_placeholder: "Select Dates 📅",
      opt_a4: "A4 Portrait (210 × 297 mm)",
      opt_a3: "A3 Portrait (297 × 420 mm)",
      opt_a5: "A5 Mini Print (148 × 210 mm)",
      opt_square_small: "Square Art (210 × 210 mm)",
      opt_square_large: "Square Wall Art (297 × 297 mm)"
    }
  };

  const applyTranslations = () => {
    const t = translations[currentLang];

    // Update text content of data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    // Update placeholders & input text
    if (titleInput) titleInput.placeholder = t.title_placeholder;
    if (subtitleInput) subtitleInput.placeholder = t.subtitle_placeholder;
    if (searchInput) searchInput.placeholder = t.search_input_placeholder;

    // Update select options text
    const sizeSelect = document.getElementById('poster-size-select');
    if (sizeSelect && sizeSelect.options.length >= 5) {
      sizeSelect.options[0].text = t.opt_a4;
      sizeSelect.options[1].text = t.opt_a3;
      sizeSelect.options[2].text = t.opt_a5;
      sizeSelect.options[3].text = t.opt_square_small;
      sizeSelect.options[4].text = t.opt_square_large;
    }

    // Update route style select options text
    const routeSelect = document.getElementById('route-style-select');
    if (routeSelect && routeSelect.options.length >= 2) {
      routeSelect.options[0].text = t.route_style_driving;
      routeSelect.options[1].text = t.route_style_direct;
    }
  };

  const updateLanguageUI = () => {
    if (langToggle.checked) {
      currentLang = 'en';
      langEnLabel.classList.add('active');
      langDeLabel.classList.remove('active');
    } else {
      currentLang = 'de';
      langDeLabel.classList.add('active');
      langEnLabel.classList.remove('active');
    }
    applyTranslations();
    updateMapTileLayer();
    saveSession(false);
    renderPoster();
  };

  langDeLabel.classList.add('active');
  langToggle.addEventListener('change', updateLanguageUI);

  // Toggle Sidebar
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
  closeBtn.addEventListener('click', () => sidebar.classList.remove('active'));

  const sizeSelect = document.getElementById('poster-size-select');
  const pageContainer = document.querySelector('.page-container');
  const saveBtnText = document.getElementById('save-btn-text');

  // Dynamic @page style element for print size override
  let dynamicPageStyle = document.getElementById('dynamic-page-style');
  if (!dynamicPageStyle) {
    dynamicPageStyle = document.createElement('style');
    dynamicPageStyle.id = 'dynamic-page-style';
    document.head.appendChild(dynamicPageStyle);
  }

  const updatePosterDimensions = () => {
    const selectedOption = sizeSelect.options[sizeSelect.selectedIndex];
    const width = selectedOption.dataset.width;
    const height = selectedOption.dataset.height;
    const name = selectedOption.dataset.name;
    const sizeVal = sizeSelect.value;

    const wVal = parseFloat(width);
    const hVal = parseFloat(height);
    const aspect = wVal / hVal;

    // Update screen canvas aspect ratio & print size variables
    pageContainer.style.setProperty('--poster-aspect', aspect);
    pageContainer.style.setProperty('--poster-width', width);
    pageContainer.style.setProperty('--poster-height', height);

    // Update print @page size rule dynamically
    if (sizeVal.startsWith('square')) {
      dynamicPageStyle.innerHTML = `@media print { @page { size: ${width} ${height}; margin: 0; } }`;
    } else {
      dynamicPageStyle.innerHTML = `@media print { @page { size: ${sizeVal} portrait; margin: 0; } }`;
    }

    // Update save button label
    if (saveBtnText) {
      saveBtnText.textContent = `Save ${name}`;
    }

    // Re-fit leaflet map layout
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
        renderPoster();
      }, 200);
    }
    saveSession(false);
  };

  sizeSelect.addEventListener('change', updatePosterDimensions);

  const routeSelect = document.getElementById('route-style-select');
  if (routeSelect) {
    routeSelect.addEventListener('change', (e) => {
      routeStyle = e.target.value;
      saveSession(false);
      renderPoster();
    });
  }

  const titleScaleInput = document.getElementById('slider-title-scale');
  if (titleScaleInput) {
    titleScaleInput.addEventListener('input', (e) => {
      titleScale = parseInt(e.target.value);
      applyTitleScale(titleScale, false);
      saveSession(false);
    });
  }

  const legendScaleInput = document.getElementById('slider-legend-scale');
  if (legendScaleInput) {
    legendScaleInput.addEventListener('input', (e) => {
      legendScale = parseInt(e.target.value);
      applyLegendScale(legendScale, false);
      saveSession(false);
    });
  }

  // High-resolution print layout listeners
  window.addEventListener('beforeprint', prepareForPrint);
  window.addEventListener('afterprint', cleanupAfterPrint);

  // Aesthetic Sliders Input Listeners
  if (satInput) {
    satInput.addEventListener('input', (e) => {
      mapAesthetics.saturation = parseInt(e.target.value);
      mapAesthetics.preset = 'custom';
      applyMapAesthetics();
      saveSession(false);
    });
  }
  if (conInput) {
    conInput.addEventListener('input', (e) => {
      mapAesthetics.contrast = parseInt(e.target.value);
      mapAesthetics.preset = 'custom';
      applyMapAesthetics();
      saveSession(false);
    });
  }
  if (briInput) {
    briInput.addEventListener('input', (e) => {
      mapAesthetics.brightness = parseInt(e.target.value);
      mapAesthetics.preset = 'custom';
      applyMapAesthetics();
      saveSession(false);
    });
  }
  if (relInput) {
    relInput.addEventListener('input', (e) => {
      mapAesthetics.relief = parseInt(e.target.value);
      mapAesthetics.preset = 'custom';
      applyMapAesthetics();
      saveSession(false);
    });
  }

  // Sidebar Map Zoom Slider & Fit Route Button
  const sidebarZoomSlider = document.getElementById('slider-map-zoom');
  if (sidebarZoomSlider) {
    sidebarZoomSlider.addEventListener('input', (e) => {
      const zoom = parseFloat(e.target.value);
      if (map) map.setZoom(zoom);
    });
  }

  const fitRouteBtn = document.getElementById('fit-route-btn');
  if (fitRouteBtn) {
    fitRouteBtn.addEventListener('click', () => {
      fitRouteBounds();
    });
  }

  // Aesthetic Presets Click Listeners
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const presetKey = pill.dataset.preset;
      if (PRESETS[presetKey]) {
        mapAesthetics = { ...PRESETS[presetKey], preset: presetKey };
        applyMapAesthetics();
        saveSession(false);
      }
    });
  });

  // Reset Aesthetic Button
  if (resetAestheticBtn) {
    resetAestheticBtn.addEventListener('click', () => {
      mapAesthetics = { ...DEFAULT_AESTHETICS };
      applyMapAesthetics();
      saveSession(false);
    });
  }

  // Title / Subtitle updates
  titleInput.addEventListener('input', (e) => {
    displayTitle.textContent = e.target.value || 'Schweden Reise';
    saveSession(false);
  });
  subtitleInput.addEventListener('input', (e) => {
    displaySubtitle.textContent = e.target.value || 'Sommer 2026';
    saveSession(false);
  });

  // Manual Save Session Button
  if (saveSessionBtn) {
    saveSessionBtn.addEventListener('click', () => {
      saveSession(true);
    });
  }

  // Location Search (Nominatim API)
  const triggerSearch = () => {
    const query = searchInput.value.trim();
    if (!query) return;

    searchBtn.textContent = '...';
    currentSearchResults = [];
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=${currentLang}`)
      .then(res => res.json())
      .then(data => {
        searchBtn.textContent = currentLang === 'de' ? 'Suchen' : 'Search';
        if (!data || data.length === 0) {
          const noResultText = currentLang === 'de' ? 'Keine Ergebnisse gefunden' : 'No results found';
          resultsDropdown.innerHTML = `<div class="search-item">${noResultText}</div>`;
          resultsDropdown.classList.add('active');
          return;
        }

        currentSearchResults = data;
        resultsDropdown.innerHTML = data.map((item, idx) => `
          <div class="search-item" data-index="${idx}">
            ${escapeHtml(item.display_name)}
          </div>
        `).join('');
        resultsDropdown.classList.add('active');
      })
      .catch(err => {
        searchBtn.textContent = currentLang === 'de' ? 'Suchen' : 'Search';
        alert('Error searching place: ' + err.message);
      });
  };

  // Event Delegation for dropdown click events
  resultsDropdown.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.search-item');
    if (!itemEl || itemEl.dataset.index === undefined) return;

    const idx = parseInt(itemEl.dataset.index);
    const item = currentSearchResults[idx];
    if (!item) return;

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const simpleName = item.display_name.split(',')[0].trim();

    const todayStr = toLocalDateStr(new Date());
    stations.push({
      id: Date.now().toString(),
      name: simpleName,
      coords: [lat, lon],
      startDate: todayStr,
      endDate: todayStr,
      dates: formatDisplayDates(todayStr, todayStr)
    });

    resultsDropdown.classList.remove('active');
    searchInput.value = '';
    saveSession(false);
    renderPoster();
  });

  searchBtn.addEventListener('click', triggerSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerSearch();
  });

  // Pick on Map Toggle
  pickMapBtn.addEventListener('click', () => {
    toggleMapPickMode(!isPickingMapLocation);
  });

  // Reset / Clear All Stations
  resetBtn.addEventListener('click', () => {
    const confirmMsg = currentLang === 'de'
      ? 'Möchtest du wirklich alle Stationen von der Karte und dem Poster entfernen?'
      : 'Do you really want to clear all stations from the map and poster?';
    if (confirm(confirmMsg)) {
      stations = [];
      saveSession(false);
      renderPoster();
    }
  });
}

function saveSession(showFeedback = false) {
  const titleInput = document.getElementById('poster-title-input');
  const subtitleInput = document.getElementById('poster-subtitle-input');
  const sizeSelect = document.getElementById('poster-size-select');
  const routeSelect = document.getElementById('route-style-select');
  const saveBtn = document.getElementById('save-session-btn');
  const saveBtnText = document.getElementById('save-session-btn-text');

  const sessionData = {
    stations: stations,
    aesthetics: mapAesthetics,
    title: titleInput ? titleInput.value : 'Schweden Reise',
    subtitle: subtitleInput ? subtitleInput.value : 'Sommer 2026',
    size: sizeSelect ? sizeSelect.value : 'a4',
    routeStyle: routeSelect ? routeSelect.value : routeStyle,
    titleScale: titleScale,
    legendScale: legendScale,
    legendWidth: legendWidth,
    sidebarWidth: sidebarWidth,
    lang: currentLang,
    mapCenter: map ? [map.getCenter().lat, map.getCenter().lng] : null,
    mapZoom: map ? map.getZoom() : null
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));

    if (showFeedback && saveBtn) {
      saveBtn.classList.add('saved');
      const savedText = currentLang === 'de' ? '✓ Gespeichert!' : '✓ Saved!';
      if (saveBtnText) saveBtnText.textContent = savedText;
      setTimeout(() => {
        saveBtn.classList.remove('saved');
        if (saveBtnText) saveBtnText.textContent = currentLang === 'de' ? 'Session speichern' : 'Save Session';
      }, 1500);
    }
  } catch (e) {
    console.error('Error saving session to localStorage:', e);
  }
}

function loadSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (data.stations && Array.isArray(data.stations)) {
      stations = data.stations;
    }
    if (data.aesthetics) {
      mapAesthetics = { ...DEFAULT_AESTHETICS, ...data.aesthetics };
    }

    const titleInput = document.getElementById('poster-title-input');
    const subtitleInput = document.getElementById('poster-subtitle-input');
    const displayTitle = document.getElementById('display-poster-title');
    const displaySubtitle = document.getElementById('display-poster-subtitle');
    const sizeSelect = document.getElementById('poster-size-select');
    const routeSelect = document.getElementById('route-style-select');
    const langToggle = document.getElementById('language-toggle');

    if (data.title && titleInput && displayTitle) {
      titleInput.value = data.title;
      displayTitle.textContent = data.title;
    }
    if (data.subtitle && subtitleInput && displaySubtitle) {
      subtitleInput.value = data.subtitle;
      displaySubtitle.textContent = data.subtitle;
    }
    if (data.size && sizeSelect) {
      sizeSelect.value = data.size;
      const event = new Event('change');
      sizeSelect.dispatchEvent(event);
    }
    if (data.routeStyle) {
      routeStyle = data.routeStyle;
      if (routeSelect) {
        routeSelect.value = data.routeStyle;
      }
    }
    if (data.titleScale !== undefined) {
      titleScale = data.titleScale;
      applyTitleScale(titleScale, true);
    }
    if (data.legendScale !== undefined) {
      legendScale = data.legendScale;
      applyLegendScale(legendScale, true);
    }
    if (data.legendWidth !== undefined) {
      legendWidth = data.legendWidth;
      applyLegendWidth(legendWidth);
    }
    if (data.sidebarWidth !== undefined) {
      sidebarWidth = data.sidebarWidth;
      applySidebarWidth(sidebarWidth);
    }
    if (data.lang && langToggle) {
      currentLang = data.lang;
      langToggle.checked = (data.lang === 'en');
      const event = new Event('change');
      langToggle.dispatchEvent(event);
    }
    if (data.mapCenter && data.mapZoom && map) {
      map.setView(data.mapCenter, data.mapZoom, { animate: false });
      updateZoomUI();
    }
    return true;
  } catch (e) {
    console.error('Error loading saved session:', e);
    return false;
  }
}

function applyTitleScale(scalePercent, updateSlider = true) {
  titleScale = scalePercent;
  const titleCard = document.getElementById('title-card');
  const titleScaleInput = document.getElementById('slider-title-scale');
  const titleScaleVal = document.getElementById('val-title-scale');
  if (titleCard) {
    titleCard.style.setProperty('--title-scale', (scalePercent / 100).toString());
  }
  if (titleScaleVal) {
    titleScaleVal.textContent = `${scalePercent}%`;
  }
  if (updateSlider && titleScaleInput) {
    titleScaleInput.value = scalePercent;
  }
}

function initTitleResize() {
  const titleCard = document.getElementById('title-card');
  const handle = document.getElementById('title-resize-handle');
  if (!titleCard || !handle) return;

  let isDragging = false;
  let startX, startY, startScale;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    handle.classList.add('active');
    startX = e.clientX;
    startY = e.clientY;
    startScale = titleScale;
    document.body.style.cursor = 'nwse-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX; // Dragging right increases scale
    const deltaY = e.clientY - startY; // Dragging down increases scale
    const delta = (deltaX + deltaY) / 2;

    const newScale = Math.max(70, Math.min(160, Math.round(startScale + (delta * 0.35))));
    applyTitleScale(newScale, true);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      saveSession(false);
    }
  });
}

function applyLegendScale(scalePercent, updateSlider = true) {
  legendScale = scalePercent;
  const legendCard = document.getElementById('legend-card');
  const legendScaleInput = document.getElementById('slider-legend-scale');
  const legendScaleVal = document.getElementById('val-legend-scale');
  if (legendCard) {
    legendCard.style.setProperty('--legend-scale', (scalePercent / 100).toString());
  }
  if (legendScaleVal) {
    legendScaleVal.textContent = `${scalePercent}%`;
  }
  if (updateSlider && legendScaleInput) {
    legendScaleInput.value = scalePercent;
  }
}

function applyLegendWidth(widthPx) {
  legendWidth = widthPx;
  const legendCard = document.getElementById('legend-card');
  if (legendCard) {
    legendCard.style.setProperty('--legend-width', `${widthPx}px`);
    if (widthPx >= 300) {
      legendCard.classList.add('multi-column');
    } else {
      legendCard.classList.remove('multi-column');
    }
  }
}

function applySidebarWidth(widthPx) {
  sidebarWidth = widthPx;
  const sidebar = document.getElementById('editor-sidebar');
  if (sidebar) {
    sidebar.style.setProperty('--sidebar-width', `${widthPx}px`);
  }
}

function initLegendResize() {
  const legendCard = document.getElementById('legend-card');
  const handle = document.getElementById('legend-resize-handle');
  if (!legendCard || !handle) return;

  let isDragging = false;
  let startX, startY, startWidth, startScale;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    handle.classList.add('active');
    startX = e.clientX;
    startY = e.clientY;
    startWidth = legendCard.offsetWidth;
    startScale = legendScale;
    document.body.style.cursor = 'nwse-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = startX - e.clientX; // Dragging left increases width because anchored on right
    const deltaY = startY - e.clientY; // Dragging up increases scale smoothly

    const newWidth = Math.max(160, Math.min(520, startWidth + deltaX));
    applyLegendWidth(newWidth);

    // If vertical movement is significant, scale font smoothly
    if (Math.abs(deltaY) > 15) {
      const newScale = Math.max(70, Math.min(140, Math.round(startScale + (deltaY * 0.25))));
      applyLegendScale(newScale, true);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      saveSession(false);
    }
  });
}

function initSidebarResize() {
  const sidebar = document.getElementById('editor-sidebar');
  const handle = document.getElementById('sidebar-resize-handle');
  if (!sidebar || !handle) return;

  let isDragging = false;
  let startX, startWidth;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    sidebar.classList.add('resizing');
    handle.classList.add('active');
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = 'ew-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(280, Math.min(650, startWidth + deltaX));
    applySidebarWidth(newWidth);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      sidebar.classList.remove('resizing');
      handle.classList.remove('active');
      document.body.style.cursor = '';
      saveSession(false);
    }
  });
}

function toggleMapPickMode(enable) {
  const pickMapBtn = document.getElementById('pick-map-btn');
  const pickTextSpan = document.getElementById('pick-map-btn-text');
  isPickingMapLocation = enable;
  if (isPickingMapLocation) {
    pickMapBtn.classList.add('active');
    const text = currentLang === 'de' 
      ? 'Auf Karte klicken um Station hinzuzufügen... (Abbrechen)'
      : 'Click anywhere on map to add station... (Cancel)';
    if (pickTextSpan) pickTextSpan.textContent = text;
  } else {
    pickMapBtn.classList.remove('active');
    const text = currentLang === 'de'
      ? 'Auf Karte klicken um Ort zu wählen'
      : 'Click on Map to Pick Location';
    if (pickTextSpan) pickTextSpan.textContent = text;
  }
}

function moveStation(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= stations.length) return;
  const temp = stations[index];
  stations[index] = stations[newIndex];
  stations[newIndex] = temp;
  saveSession(false);
  renderPoster();
}

function removeStation(index) {
  stations.splice(index, 1);
  saveSession(false);
  renderPoster();
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str).replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[match]));
}

let savedMapState = null;
let isPreparingPrint = false;

function prepareForPrint() {
  if (!map || isPreparingPrint) return;
  isPreparingPrint = true;
  savedMapState = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bounds: map.getBounds()
  };
  document.body.classList.add('preparing-print');
  map.invalidateSize({ pan: false });
  // Exact boundary framing so the printed poster matches the screen view 1:1
  map.fitBounds(savedMapState.bounds, { animate: false, padding: [0, 0] });
  renderPoster(false);
}

function cleanupAfterPrint() {
  if (!map || !isPreparingPrint) return;
  isPreparingPrint = false;
  document.body.classList.remove('preparing-print');
  if (savedMapState) {
    map.invalidateSize({ pan: false });
    map.setView(savedMapState.center, savedMapState.zoom, { animate: false });
    updateZoomUI();
    savedMapState = null;
  } else {
    map.invalidateSize({ pan: false });
    updateZoomUI();
  }
  renderPoster(false);
}

/**
 * High-quality print function.
 * Expands poster to full print dimensions, renders all tiles across the canvas,
 * and triggers window.print() before seamlessly restoring screen view.
 */
function printPoster() {
  if (!map) {
    window.print();
    return;
  }

  prepareForPrint();

  // Give Leaflet tiles 250ms to load and render across the full print canvas
  setTimeout(() => {
    window.print();
    // Safety fallback in case afterprint does not fire in some browsers
    setTimeout(() => {
      cleanupAfterPrint();
    }, 150);
  }, 250);
}
