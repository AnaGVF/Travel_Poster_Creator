document.addEventListener("DOMContentLoaded", () => {
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([58.6, 15.2], 5.85);

  // Layer 1: ESRI Topographic Shaded Relief
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    opacity: 0.65
  }).addTo(map);

  // Layer 2: Detailed Cartographic Base (Roads, Lakes, Borders, Water contours)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    opacity: 0.60
  }).addTo(map);

  const locations = [
    { name: "Flensburg (D)", coords: [54.7836, 9.4321], label: "S", type: "start" },
    { name: "Hillerød Camping (DK)", coords: [55.9328, 12.2890], label: "1" },
    { name: "Hjo Camping", coords: [58.3075, 14.2961], label: "2" },
    { name: "Karlstad Swecamp", coords: [59.3621, 13.3496], label: "3" },
    { name: "Östersund Camping", coords: [63.1672, 14.6738], label: "4", type: "north" },
    { name: "Sälstens Härnösand", coords: [62.6372, 17.9620], label: "5" },
    { name: "Camping Gävle", coords: [60.7259, 17.2694], label: "6" },
    { name: "Bredäng Camping Stockholm", coords: [59.2964, 17.9221], label: "7" },
    { name: "KronoCamping Saxnäs (Öland)", coords: [56.6341, 16.4820], label: "8" },
    { name: "First Camp Malmö-Sibbarp", coords: [55.5746, 12.9069], label: "9" },
    { name: "Scharnebeck (D)", coords: [53.2944, 10.5111], label: "Z", type: "end" }
  ];

  const latlngs = locations.map(loc => loc.coords);

  // Outer glow casing for the trail line
  L.polyline(latlngs, {
    color: '#ffffff',
    weight: 6,
    opacity: 0.95,
    lineCap: 'round'
  }).addTo(map);

  // Inner bold dashed trail line
  L.polyline(latlngs, {
    color: '#dc2626',
    weight: 3.5,
    opacity: 0.95,
    dashArray: '8, 8',
    lineCap: 'round'
  }).addTo(map);

  // Numbered map pins
  locations.forEach(loc => {
    let pinClass = 'pin-bubble';
    if(loc.type === 'start') pinClass += ' pin-start';
    if(loc.type === 'north') pinClass += ' pin-north';
    if(loc.type === 'end') pinClass += ' pin-end';

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="${pinClass}">${loc.label}</div>`,
      iconSize: [25, 25],
      iconAnchor: [12.5, 12.5]
    });

    L.marker(loc.coords, { icon: customIcon }).addTo(map);
  });

  // Auto-fit to view with padding for UI cards
  map.fitBounds(L.latLngBounds(latlngs), { 
    paddingTopLeft: [75, 45], 
    paddingBottomRight: [40, 120] 
  });
});
