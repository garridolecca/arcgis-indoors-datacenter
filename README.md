# ArcGIS Indoors - Data Center Intelligence Platform

A comprehensive showcase application demonstrating the power of **ArcGIS Indoors** for data center facility management, built with the ArcGIS Maps SDK for JavaScript.

## Live Demo

**[View Live Application](https://garridolecca.github.io/arcgis-indoors-datacenter/)**

![ArcGIS Indoors Data Center](https://img.shields.io/badge/ArcGIS-Indoors-0079C1?style=for-the-badge&logo=esri&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## Overview

This application demonstrates how ArcGIS Indoors transforms data center operations by providing spatial intelligence across every aspect of facility management. The app simulates a Tier III data center with 4 floors, 342 server racks, and full indoor mapping capabilities.

## Features Showcased

### Floor-Aware Indoor Maps
- Interactive 2D and 3D floor plans of the data center facility
- Multi-floor navigation with floor selector (Network Core, Server Hall, Storage & Backup, Operations Center)
- Zone-based visualization with color-coded areas

### Indoor Routing & Wayfinding
- Turn-by-turn navigation between any two points in the facility
- Corridor-aware pathfinding through the data center
- Route statistics: distance, walk time, floor changes
- Accessible and security-cleared route options
- Start/end point visualization with directional markers

### Space Management
- Real-time zone utilization visualization (color-coded racks by capacity)
- Space allocation views by business unit (Cloud Services, Enterprise Hosting, Network Infrastructure, Storage & Backup)
- Available capacity identification for expansion planning
- Interactive Space Planner with capacity summary (rack positions, power headroom, cooling capacity)
- Three view modes: Utilization, Allocation, Available

### Asset Tracking
- Locate and monitor 1,247+ assets across all floors
- Asset categories: Servers (684), Network Equipment (298), Power Systems (142), Cooling Units (123)
- Real-time status indicators (Online, Warning, Critical)
- Click-to-locate functionality with map zoom
- Searchable asset inventory with filtering
- Equipment details via map popups (Dell PowerEdge, Cisco Nexus, Eaton UPS, Schneider CRAC, APC PDU)

### Safety & Emergency Management
- Evacuation route visualization with emergency exit mapping
- Security camera coverage overlay with field-of-view indicators
- FM-200 fire suppression system locations
- Access control point mapping (Biometric, Badge, Key access levels)
- Ingress/egress point management
- Emergency contact directory
- Normal/emergency status indicators

### Environmental Monitoring
- Temperature heatmap overlay with hot spot detection
- Humidity, airflow, and power draw monitoring
- Color-coded environmental zones (Cool, Normal, Warm, Hot)
- Real-time alerts for threshold violations
- PUE (Power Usage Effectiveness) tracking

### Additional Capabilities
- 2D/3D view toggle
- Real-time data simulation with live PUE updates
- Interactive popups with detailed rack/asset information
- Responsive design for desktop and tablet
- Dark theme optimized for NOC environments

## Technology Stack

- **ArcGIS Maps SDK for JavaScript 4.29** - Core mapping and spatial analysis
- **ArcGIS Indoors Concepts** - Floor-aware mapping, indoor routing, space management
- **HTML5 / CSS3 / ES6 JavaScript** - Frontend implementation
- **Dark UI Theme** - Optimized for 24/7 operations center use

## Project Structure

```
arcgis-indoors-datacenter/
├── index.html          # Main application entry point
├── css/
│   └── style.css       # Application styles (dark theme)
├── js/
│   └── app.js          # Core application logic (ArcGIS JS API)
└── README.md
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/garridolecca/arcgis-indoors-datacenter.git
   ```

2. Open `index.html` in a modern web browser, or serve locally:
   ```bash
   # Using Python
   python -m http.server 8080

   # Using Node.js
   npx serve .
   ```

3. Navigate through the feature tabs to explore different ArcGIS Indoors capabilities.

## How It Works

The application creates a simulated data center floor plan using ArcGIS Graphics Layers, representing:

- **Building footprint** with interior walls and corridors
- **8 functional zones** (Cloud Services, Enterprise, Storage, Network Core, Expansion, NOC, Power Room, Cooling Plant)
- **160+ server racks** with randomized utilization data
- **Indoor routing network** using corridor-based pathfinding
- **Environmental sensors** generating temperature heatmaps
- **Safety systems** including cameras, fire suppression, and access control

Each feature demonstrates a core ArcGIS Indoors capability applied to the data center vertical.

## ArcGIS Indoors Capabilities Demonstrated

| Capability | Implementation |
|---|---|
| Floor-Aware Maps | Multi-level floor selector with per-floor visualization |
| Indoor Navigation | Corridor-based routing with turn-by-turn directions |
| Space Planning | Zone utilization, allocation views, capacity planning |
| Asset Management | 1,247 tracked assets with locate-on-map |
| Safety Operations | Evacuation routes, cameras, fire systems, access control |
| Environmental Monitoring | Temperature heatmap, humidity, airflow, power tracking |
| Indoor Positioning | Simulated real-time asset/personnel location |
| Workplace Management | Space allocation by business unit |

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

- [Esri](https://www.esri.com) - ArcGIS Maps SDK for JavaScript & ArcGIS Indoors
- [ArcGIS Indoors](https://www.esri.com/en-us/arcgis/products/arcgis-indoors/overview) - Indoor mapping and spatial analytics platform
