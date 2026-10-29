# 🗺️ Travel Poster Creator

<p align="center">
  <strong>A high-performance, interactive web studio for designing, styling, and printing elegant, high-resolution road trip maps and personalized travel posters.</strong>
</p>

<p align="center">
  <a href="https://anagvf.github.io/Travel_Poster_Creator/"><strong>Explore the Live Studio »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live%20on%20GitHub%20Pages-success?style=for-the-badge&logo=github&logoColor=white" alt="Deployment Status" />
  <img src="https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Routing-OSRM%20Engine-0078FF?style=for-the-badge" alt="OSRM Routing" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Print-Ready%20A3%20%2F%20A4%20%2F%20A5-E11D48?style=for-the-badge" alt="Print Formats" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20In--Browser-10B981?style=for-the-badge" alt="Privacy First" />
</p>

---

## 💡 Why Travel Poster Creator?

Commercial map print services and custom poster generators often come with frustrating limitations:
- **Steep costs & paywalls**: Commercial poster services charge heavy markups for simple static map prints.
- **Rigid, inflexible templates**: Most map makers draw straight lines between points rather than actual driving routes, ignoring the true curves, highways, and bridges of your road trip.
- **Cluttered markers & overlapping lines**: Return routes often completely obscure outbound journeys, and generic map markers blot out city names and coastal borders.
- **Zero real-time visual control**: You are stuck with fixed color palettes with no ability to tune saturation, contrast, topographic hillshading, or frame scaling on the fly.

**Travel Poster Creator** solves all of this:
1. **100% In-Browser & Free**: Everything runs client-side with zero account sign-ups, subscriptions, watermarks, or hidden paywalls.
2. **Authentic Road Trip Geometry**: Computes authentic turn-by-turn car routes via the Open Source Routing Machine (OSRM), complete with ferry detection and smart leg-offsetting algorithms so round trips never merge into a single confusing line.
3. **Studio-Grade Aesthetic & Typography Controls**: Real-time post-processing filters (Saturation, Contrast, Brightness, Topographic Relief) applied strictly to the map canvas, combined with interactive drag-to-resize title cards, customizable station legends, and elegant teardrop balloon pins.
4. **Print-Ready Perfection**: Export pixel-perfect posters in standard dimensions (**A3**, **A4**, **A5**, or **Square**) with dedicated print styling that strips away UI chrome and delivers clean, bleed-to-edge PDFs.

---

## 🚀 Key Features

### 🛣️ Turn-by-Turn Driving Routing (OSRM)
- **Authentic Road Trip Paths**: Automatically plots genuine driving paths across motorways, scenic mountain passes, coastal bridges, and country highways powered by the Open Source Routing Machine (OSRM).
- **Intelligent Leg Offsetting**: Employs normal-vector coordinate offsetting (`offsetLeg`) on overlapping road segments so return journeys remain clearly visible alongside outbound legs.
- **Ferry & Sea Crossing Detection**: Accurately recognizes and renders ferry transit legs between islands and international borders.
- **Dual Routing Modes**: Toggle instantly between **Fahrstrecke (Driving Route)** and **Direktlinie (Direct Beeline)** modes.

### 🎨 Real-Time Map Aesthetics & Color Grading
- **Live Post-Processing Sliders**: Fine-tune **Farbsättigung (Saturation)**, **Kontrast (Contrast)**, **Helligkeit (Brightness)**, and **Relief / Gelände (Esri Hillshade)** in real time.
- **Instant Aesthetic Presets**:
  - 🌟 **Lebendig (Vibrant)**: Rich color saturation and elevated contrast for lively vacation posters.
  - 🌿 **Natürlich (Natural)**: Balanced, true-to-life tones for classical cartography.
  - 🌸 **Sanft (Pastel)**: Muted tones with soft contrast for modern Scandinavian wall decor.
- **Non-Destructive Filtering**: Color shaders apply exclusively to the base tile layers, ensuring markers, text labels, polyline strokes, and legend elements remain razor sharp.

### 📍 Station Management & Smart Markers
- **Elevated Teardrop Balloon Pins**: Custom SVG map markers with pointer tails designed to highlight exact coordinates without obscuring city labels or terrain.
- **Global Location Search**: Instant search for cities, regions, and landmarks across the globe via the Nominatim Geocoding API.
- **Interactive Map Pinning**: Click directly anywhere on the map to drop a new waypoint with automatic geocoded coordinates.
- **Dynamic Sequence Reordering**: Reorder itinerary stops using `↑` and `↓` buttons with automatic sequential number updates across pins, legend badges, and drawer lists.
- **Date Integration**: Assign custom stay durations per station using integrated [Flatpickr](https://flatpickr.js.org/) date range calendars.

### 📐 Interactive Layout & Drag-to-Resize Studio
- **Direct Visual Resizing**: Drag handles on the **Title Card**, **Station Legend Box**, and **Sidebar Drawer** for intuitive manual resizing directly on screen.
- **Live Scale Sliders**: Adjust Title Box scale (70% – 160%) and Legend Box scale (70% – 140%) with live percentage badges.
- **Precision Fractional Zoom**: Smooth map scaling (`zoomSnap: 0.25`) with a dedicated **Route einpassen (Fit Route)** button to frame your entire journey automatically.

### 🖨️ Multi-Format Print & PDF Export Hub
- **1:1 WYSIWYG Print Fidelity**: Proportional logarithmic scaling eliminates map-shifting or zooming out; what you frame on screen matches the print preview down to the millimeter.
- **Direct PDF & Print Export**: Click **Poster speichern / drucken** to immediately open the print dialog to save as a lossless vector PDF or send to your printer.
- **Standard Print Formats**: Pre-calculated aspect ratios and dimension presets:
  - **A4 Portrait** (210 × 297 mm)
  - **A3 Portrait** (297 × 420 mm)
  - **A5 Minidruck** (148 × 210 mm)
  - **Square Art** (210 × 210 mm)
  - **Square Wall Art** (297 × 297 mm)
- **Full-Bleed Vector PDF**: Dedicated `@media print` rules strip out sidebar controls and browser headers, producing clean, bleed-to-edge outputs ready for professional framing.

### 💾 Safe Session Recovery & Bilingual Localization
- **Instant Persistence**: Automatically saves your route, custom stops, dates, and aesthetic preferences in browser `localStorage`.
- **Manual Save & Status Feedback**: Dedicated **Session speichern** button with instant visual confirmation.
- **Bilingual Interface (DE / EN)**: Seamlessly switch between German and English for UI labels, titles, and map tiles with a single click.
- **Safe Reset**: One-click restore to sample route presets whenever you want to begin a fresh itinerary.

---

## 🏗️ How it Works Under the Hood

```
   [ Search Location / Click Map ]
              │
              ▼
   [ Nominatim Geocoding ] ────────► Lat/Lon Coordinates & Waypoints
              │
              ▼
   [ OSRM Driving Engine ] ────────► GeoJSON Road Geometry + Ferry Detection
              │
              ▼
   [ Route Leg Offsetting ] ───────► Overlapping Highway & Return Leg Offset
              │
              ▼
   [ Leaflet Canvas Pipeline ] ────► Multi-Layer: OSM Tiles + Esri World Hillshade
              │
              ▼
   [ Real-Time Color Shader ] ─────► Non-Destructive CSS Filters (Saturation / Contrast)
              │
              ▼
   [ Interactive Studio ] ─────────► Scalable Title & Station Cards + Teardrop Pins
              │
              └───► [ High-Resolution Print / PDF Export (A3 / A4 / A5 / Square) ]
```

---

## 🎬 How to Create and Export Your Poster

Creating your print-ready wall art takes just five straightforward steps:

1. **Set Up Title & Details**:
   - Open the **Stationen & Poster verwalten** drawer.
   - Enter your journey title (e.g., *Schweden Reise*) and subtitle or year (e.g., *Sommer 2026*).
2. **Add Your Waypoints**:
   - Search for cities using the search bar, or click **Auf Karte klicken um Ort zu wählen** to pin coordinates directly on the map.
   - Pick arrival and departure dates using the interactive calendar picker.
   - Reorder stations up or down using the `↑` and `↓` buttons.
3. **Choose Routing & Framing**:
   - Choose between **Fahrstrecke (Auto / Straßen)** for real highway curves or **Direktlinie** for clean flight paths.
   - Click **Route einpassen** to frame the entire journey perfectly within the poster canvas.
4. **Dial In the Visual Aesthetic**:
   - Pick a color preset (*Lebendig*, *Natürlich*, *Sanft*) or tweak the Saturation, Contrast, Brightness, and Relief sliders.
   - Adjust the Title Box and Station Legend sizes using the drag handles or scale sliders.
5. **Print or Save as PDF**:
   - Select your desired print dimension (e.g., **A4** or **A3**).
   - Click **Poster speichern / drucken**.
   - In your browser's print dialog, choose **Save as PDF** or select your photo printer, set Margins to *None*, and enjoy your custom travel poster!

---

## 💻 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **[Vanilla JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)** | Core application logic, coordinate math, and state management |
| **[Leaflet.js 1.9.4](https://leafletjs.com/)** | Interactive map canvas, smooth kinematics, and custom layer orchestration |
| **[OSRM Routing API](https://project-osrm.org/)** | Turn-by-turn automotive route calculation and GeoJSON path geometries |
| **[Nominatim API](https://nominatim.org/)** | Global geocoding and location search engine |
| **[Esri World Hillshade](https://www.esri.com/)** | Shaded topographic relief tiles for realistic terrain depth |
| **[OpenStreetMap DE](https://www.openstreetmap.de/)** | Reliable global base cartographic tiles with unrestricted community access |
| **[Flatpickr](https://flatpickr.js.org/)** | Lightweight, responsive date range picker for travel itineraries |
| **HTML5 & CSS3** | Custom glassmorphism, responsive drawer layout, and `@media print` engine |
| **LocalStorage API** | Seamless, zero-backend persistent session caching |

---

## 🛠️ Local Development & Setup

### Prerequisites
You only need a modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari). No package managers or build tools are required.

### 1. Clone the repository
```bash
git clone https://github.com/AnaGVF/Travel_Poster_Creator.git
cd Travel_Poster_Creator
```

### 2. Run locally
Open `index.html` directly in your browser:
- **Option A**: Double-click `index.html` from your file explorer.
- **Option B (Recommended)**: Use a lightweight local server (such as the VS Code Live Server extension or Python):
  ```bash
  # Using Python 3
  python -m http.server 8000
  ```
  Then open:
  ```text
  http://localhost:8000
  ```

---

## 📁 Project Structure

```text
Travel_Poster_Creator/
├── index.html        # App layout, top navigation bar, and station drawer
├── style.css         # Poster formatting, pin styles, sliders, and @media print rules
├── script.js         # Leaflet map logic, OSRM routing, leg offsetting, i18n & storage
└── README.md         # Project documentation
```

---

## 🌐 Deployment

The project is hosted and deployed automatically via **[GitHub Pages](https://pages.github.com/)**. Any update pushed to the `main` branch immediately updates the live production studio at:
👉 **[https://anagvf.github.io/Travel_Poster_Creator/](https://anagvf.github.io/Travel_Poster_Creator/)**

---

## 👩‍💻 Author & Credits

Created and maintained by:

**Ana Graciela Vassallo Fedotkin**  
- 🌐 **Live Website**: [https://anagvf.github.io/Travel_Poster_Creator/](https://anagvf.github.io/Travel_Poster_Creator/)  
- 🐙 **GitHub**: [@AnaGVF](https://github.com/AnaGVF)  
- 📁 **Repository**: [Travel_Poster_Creator](https://github.com/AnaGVF/Travel_Poster_Creator)

---

## 📄 License & Intellectual Property

*Copyright © 2026 Ana Graciela Vassallo Fedotkin. All rights reserved.*  
Personal project built with passion for travelers, road trippers, and cartography enthusiasts worldwide.

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- Topographic relief tiles © [Esri](https://www.esri.com/).
