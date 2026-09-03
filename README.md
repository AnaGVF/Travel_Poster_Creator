# 🗺️ Travel Poster Creator

> **Craft stunning, personalized print-ready travel posters from your road trips and journeys.**

An interactive web application designed to create elegant, high-resolution travel posters featuring customized map backgrounds, custom route polylines, station pins with smart balloon labels, dynamic legends, and real-time color aesthetic controls.

---

## 🌐 Live Demo

Try the application directly in your browser:  
👉 **[https://anagvf.github.io/Travel_Poster_Creator/](https://anagvf.github.io/Travel_Poster_Creator/)**

---

## ✨ Features

### 🎨 Map Aesthetics & Post-Processing
* **Real-time Color Controls**: Fine-tune map **Farbsättigung (Saturation)**, **Kontrast (Contrast)**, **Helligkeit (Brightness)**, and **Relief / Gelände (Hillshade)** via smooth interactive sliders.
* **One-Click Presets**: Instant aesthetic styling with **Lebendig (Vibrant)**, **Natürlich (Natural)**, and **Sanft (Pastel)** presets.
* **Non-Destructive Filtering**: Color grading applies strictly to the background map canvas, keeping station markers, route lines, titles, and legends crisp and readable.

### 📍 Route & Station Management
* **Smart Balloon Station Markers**: Elevated teardrop pins with pointer tails that point precisely at coordinates without covering city labels (e.g., Stockholm, Karlstad).
* **Global Location Search**: Search cities or landmarks worldwide powered by the Nominatim Geocoding API.
* **Interactive Map Pinning**: Click anywhere directly on the map canvas to place new route stops.
* **Sequential Reordering**: Move stations up or down with `↑` and `↓` controls; numbers dynamically update across markers, legend badges, and sidebar items.
* **Date Integration**: Set stay durations per station using an interactive [Flatpickr](https://flatpickr.js.org/) calendar range picker.

### 🖼️ Poster Formats & High-Res Printing
* **Multiple Print Formats**: Pre-configured dimensions for **A4**, **A3**, **A5**, and **Square (210×210mm & 297×297mm)** formats with dynamic layout refitting.
* **Print & PDF Export**: Optimized `@media print` layout stripping away sidebar controls and fitting full bleed to target paper dimensions.
* **Seamless Zoom & Smooth Kinematics**: Smooth fractional zooming (`zoomSnap: 0.25`) for fluid navigation.

### 💾 Persistence & Localization
* **Session Auto-Save & Manual Save**: Edits are stored automatically in browser `localStorage`. Includes a dedicated **"Session speichern" / "Save Session"** toolbar button with instant confirmation feedback.
* **Bilingual Support (DE / EN)**: Instant toggle between German and English for UI controls, legend headers, and map tile labels.
* **One-Click Reset**: Easily start fresh with the controlled **"Standard zurücksetzen" / "Reset Defaults"** action.

---

## 🛠️ Technology Stack

| Component | Technology Used |
| :--- | :--- |
| **Frontend Core** | HTML5, CSS3, JavaScript (Vanilla ES6) |
| **Interactive Maps** | [Leaflet.js](https://leafletjs.com/) (v1.9.4) |
| **Map Base Tiles** | [OpenStreetMap](https://www.openstreetmap.org/) & [OpenStreetMap DE](https://www.openstreetmap.de/) |
| **Topographic Relief** | [Esri World Hillshade](https://www.esri.com/) |
| **Geocoding & Search** | [Nominatim API](https://nominatim.org/) |
| **Date Selection** | [Flatpickr](https://flatpickr.js.org/) |

---

## 🚀 Quick Start

No complex build pipeline or package installation required. 

1. **Clone or Download** the repository:
   ```bash
   git clone https://github.com/AnaGVF/Travel_Poster_Creator.git
   ```
2. **Open `index.html`** in any modern browser:
   * Double-click `index.html` or open via a local development server (e.g. VS Code Live Server).

---

## 📖 How to Use

1. **Customize Title & Dates**: Open the **Stationen & Poster verwalten** sidebar to update the poster title and subtitle.
2. **Add & Edit Stations**: Search locations in the search box, click the map directly, or edit existing stops and dates in the list.
3. **Adjust Aesthetics**: Tweak color saturation, contrast, brightness, or hillshade intensity to match your desired aesthetic.
4. **Select Paper Format**: Pick your target dimensions (e.g., A4 or A3) from the format dropdown.
5. **Export / Print**: Click **Poster speichern / drucken** to save as PDF or send directly to your printer.

---

## 📁 Project Structure

```text
Travel_Poster_Creator/
├── index.html        # Main HTML layout & top toolbar structure
├── style.css         # Poster styling, pin aesthetics, & @media print rules
├── script.js        # Leaflet map logic, session storage, i18n & controls
└── README.md         # Project documentation
```

---

## ⚖️ Credits & License

* Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
* Topographic relief tiles © [Esri](https://www.esri.com/).
* Open source software distributed under the MIT License.