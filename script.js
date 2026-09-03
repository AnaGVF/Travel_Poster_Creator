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
let map, outerPolyline, innerPolyline;
let markers = [];
let isPickingMapLocation = false;
let mapTileLayer, hillshadeLayer;
let currentSearchResults = [];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initSidebarControls();
  loadSavedSession();
  applyMapAesthetics();
  renderPoster();
});

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
    inertiaDeceleration: 3000
  }).setView([58.6, 15.2], 5.85);

  // Layer 1: ESRI Topographic Shaded Relief (High Quality)
  hillshadeLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16,
    detectRetina: true,
    opacity: mapAesthetics.relief / 100
  }).addTo(map);

  // Set initial map base tile layer based on selected language
  updateMapTileLayer();

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

function updateMapTileLayer() {
  if (mapTileLayer) {
    map.removeLayer(mapTileLayer);
  }

  // High-resolution tile configuration
  const isGerman = currentLang === 'de';
  const tileUrl = isGerman
    ? 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  mapTileLayer = L.tileLayer(tileUrl, {
    maxZoom: 19,
    maxNativeZoom: 18,
    detectRetina: true,
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

function renderPoster() {
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
    // Outer glow casing
    outerPolyline = L.polyline(latlngs, {
      color: '#ffffff',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round'
    }).addTo(map);

    // Inner bold dashed trail line
    innerPolyline = L.polyline(latlngs, {
      color: '#dc2626',
      weight: 3.5,
      opacity: 0.95,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(map);

    // Auto-fit to view with harmonious padding ensuring all stops clear Title and Legend cards
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
      map_aesthetic_label: "Karten-Farben & Optik",
      aesthetic_reset_btn: "Standard",
      slider_saturation: "Farbsättigung",
      slider_contrast: "Kontrast",
      slider_brightness: "Helligkeit",
      slider_relief: "Relief / Gelände",
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
      map_aesthetic_label: "Map Colors & Aesthetics",
      aesthetic_reset_btn: "Reset",
      slider_saturation: "Color Saturation",
      slider_contrast: "Contrast",
      slider_brightness: "Brightness",
      slider_relief: "Terrain Relief",
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

  // High-resolution print layout listeners
  window.addEventListener('afterprint', () => {
    if (map) {
      map.invalidateSize();
      renderPoster();
    }
  });

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
  const saveBtn = document.getElementById('save-session-btn');
  const saveBtnText = document.getElementById('save-session-btn-text');

  const sessionData = {
    stations: stations,
    aesthetics: mapAesthetics,
    title: titleInput ? titleInput.value : 'Schweden Reise',
    subtitle: subtitleInput ? subtitleInput.value : 'Sommer 2026',
    size: sizeSelect ? sizeSelect.value : 'a4',
    lang: currentLang
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
    if (!raw) return;

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
    if (data.lang && langToggle) {
      currentLang = data.lang;
      langToggle.checked = (data.lang === 'en');
      const event = new Event('change');
      langToggle.dispatchEvent(event);
    }
  } catch (e) {
    console.error('Error loading saved session:', e);
  }
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

/**
 * High-quality print function.
 * Invalidates the map layout so Leaflet re-renders all tiles at full resolution,
 * then triggers window.print() — no zoom manipulation, no view changes.
 */
function printPoster() {
  if (!map) { window.print(); return; }
  // Force Leaflet to recalculate tile layout at full size
  map.invalidateSize({ pan: false });
  // Brief delay to let any pending tile repaints settle, then print
  setTimeout(() => { window.print(); }, 200);
}
