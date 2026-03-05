require([
  "esri/Map",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/geometry/Point",
  "esri/geometry/Polygon",
  "esri/geometry/Polyline",
  "esri/geometry/Extent",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/PopupTemplate",
  "esri/widgets/Zoom",
  "esri/widgets/ScaleBar",
  "esri/Color"
], function (
  Map, MapView, SceneView, Graphic, GraphicsLayer, FeatureLayer,
  Point, Polygon, Polyline, Extent,
  SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, TextSymbol,
  PictureMarkerSymbol, PopupTemplate, Zoom, ScaleBar, Color
) {
  // ============================================
  // Configuration
  // ============================================
  const CENTER = [-77.0369, 38.9072]; // Washington DC area (simulated DC location)
  const BUILDING_CENTER = { x: -77.0369, y: 38.9072 };

  // Data center floor plan dimensions (in degrees, scaled for visualization)
  const SCALE = 0.0008;
  const FLOOR_ORIGIN = { x: BUILDING_CENTER.x - SCALE * 1.2, y: BUILDING_CENTER.y - SCALE * 0.8 };

  // ============================================
  // Layers
  // ============================================
  const buildingLayer = new GraphicsLayer({ id: "building", title: "Building Footprint" });
  const zonesLayer = new GraphicsLayer({ id: "zones", title: "Zones" });
  const racksLayer = new GraphicsLayer({ id: "racks", title: "Server Racks" });
  const routeLayer = new GraphicsLayer({ id: "route", title: "Route" });
  const assetsLayer = new GraphicsLayer({ id: "assets", title: "Assets" });
  const safetyLayer = new GraphicsLayer({ id: "safety", title: "Safety" });
  const envLayer = new GraphicsLayer({ id: "environment", title: "Environment" });
  const labelsLayer = new GraphicsLayer({ id: "labels", title: "Labels" });

  // ============================================
  // Map & View
  // ============================================
  const map = new Map({
    basemap: "dark-gray-vector",
    layers: [buildingLayer, zonesLayer, envLayer, racksLayer, assetsLayer, safetyLayer, routeLayer, labelsLayer]
  });

  let currentView;
  let is3D = false;

  function createMapView() {
    return new MapView({
      container: "viewDiv",
      map: map,
      center: CENTER,
      zoom: 19,
      ui: { components: ["attribution"] },
      constraints: { minZoom: 17, maxZoom: 23 },
      popup: {
        dockEnabled: true,
        dockOptions: { position: "bottom-center", breakpoint: false }
      }
    });
  }

  currentView = createMapView();

  currentView.when(function () {
    // Add zoom widget
    const zoom = new Zoom({ view: currentView });
    currentView.ui.add(zoom, "top-left");

    // Build the data center floor plan
    buildFloorPlan();
    updateLegend("overview");

    // Hide loading screen
    setTimeout(function () {
      document.getElementById("loading-screen").classList.add("hidden");
    }, 2200);
  });

  // ============================================
  // Floor Plan Builder
  // ============================================
  function buildFloorPlan() {
    clearAllLayers();
    drawBuilding();
    drawZones();
    drawRacks();
    drawLabels();
  }

  function clearAllLayers() {
    [buildingLayer, zonesLayer, racksLayer, routeLayer, assetsLayer, safetyLayer, envLayer, labelsLayer].forEach(function (l) {
      l.removeAll();
    });
  }

  function ox(val) { return FLOOR_ORIGIN.x + val * SCALE; }
  function oy(val) { return FLOOR_ORIGIN.y + val * SCALE; }

  function makeRect(x, y, w, h) {
    return new Polygon({
      rings: [[
        [ox(x), oy(y)],
        [ox(x + w), oy(y)],
        [ox(x + w), oy(y + h)],
        [ox(x), oy(y + h)],
        [ox(x), oy(y)]
      ]],
      spatialReference: { wkid: 4326 }
    });
  }

  function drawBuilding() {
    // Main building outline
    var bldg = new Graphic({
      geometry: makeRect(-0.1, -0.1, 2.6, 1.8),
      symbol: new SimpleFillSymbol({
        color: [17, 24, 39, 200],
        outline: { color: [0, 180, 216, 180], width: 2 }
      }),
      attributes: { name: "Data Center Facility - Building A" },
      popupTemplate: new PopupTemplate({
        title: "Data Center Facility",
        content: "Total Area: 50,000 sq ft | 4 Floors | Tier III Certified"
      })
    });
    buildingLayer.add(bldg);

    // Interior walls
    var wallSymbol = new SimpleLineSymbol({ color: [42, 58, 78, 200], width: 1 });

    // Horizontal corridors
    [[0, 0.55, 2.4, 0.55], [0, 1.15, 2.4, 1.15]].forEach(function (c) {
      buildingLayer.add(new Graphic({
        geometry: new Polyline({
          paths: [[[ox(c[0]), oy(c[1])], [ox(c[2]), oy(c[3])]]],
          spatialReference: { wkid: 4326 }
        }),
        symbol: new SimpleLineSymbol({ color: [42, 58, 78, 120], width: 0.5, style: "dash" })
      }));
    });
  }

  // Zone definitions
  var zones = [
    { id: "A", name: "Zone A - Cloud Services", x: 0, y: 0, w: 0.8, h: 0.5, color: [0, 180, 216, 60], border: [0, 180, 216, 150] },
    { id: "B", name: "Zone B - Enterprise", x: 0.85, y: 0, w: 0.8, h: 0.5, color: [6, 214, 160, 60], border: [6, 214, 160, 150] },
    { id: "C", name: "Zone C - Storage", x: 1.7, y: 0, w: 0.7, h: 0.5, color: [239, 71, 111, 60], border: [239, 71, 111, 150] },
    { id: "D", name: "Zone D - Network Core", x: 0, y: 0.6, w: 0.8, h: 0.5, color: [255, 209, 102, 60], border: [255, 209, 102, 150] },
    { id: "E", name: "Zone E - Expansion", x: 0.85, y: 0.6, w: 0.8, h: 0.5, color: [155, 93, 229, 60], border: [155, 93, 229, 150] },
    { id: "NOC", name: "NOC Room", x: 1.7, y: 0.6, w: 0.7, h: 0.5, color: [0, 150, 183, 40], border: [0, 150, 183, 150] },
    { id: "PWR", name: "Power Room", x: 0, y: 1.2, w: 1.15, h: 0.4, color: [255, 150, 50, 40], border: [255, 150, 50, 120] },
    { id: "CLG", name: "Cooling Plant", x: 1.2, y: 1.2, w: 1.2, h: 0.4, color: [50, 150, 255, 40], border: [50, 150, 255, 120] }
  ];

  function drawZones() {
    zones.forEach(function (z) {
      var g = new Graphic({
        geometry: makeRect(z.x, z.y, z.w, z.h),
        symbol: new SimpleFillSymbol({
          color: z.color,
          outline: { color: z.border, width: 1.5 }
        }),
        attributes: { id: z.id, name: z.name },
        popupTemplate: new PopupTemplate({
          title: "{name}",
          content: "Zone ID: {id}<br/>Click for detailed analytics"
        })
      });
      zonesLayer.add(g);
    });
  }

  function drawRacks() {
    var rackColor = [42, 58, 78, 200];
    var rackOutline = { color: [60, 80, 100], width: 0.5 };

    // Generate rack rows for server zones
    var rackZones = [
      { zx: 0.05, zy: 0.05, rows: 4, cols: 8, w: 0.08, h: 0.06, gapX: 0.01, gapY: 0.06 },
      { zx: 0.9, zy: 0.05, rows: 4, cols: 8, w: 0.08, h: 0.06, gapX: 0.01, gapY: 0.06 },
      { zx: 1.75, zy: 0.05, rows: 4, cols: 6, w: 0.08, h: 0.06, gapX: 0.01, gapY: 0.06 },
      { zx: 0.05, zy: 0.65, rows: 3, cols: 8, w: 0.08, h: 0.06, gapX: 0.01, gapY: 0.08 },
      { zx: 0.9, zy: 0.65, rows: 3, cols: 8, w: 0.08, h: 0.06, gapX: 0.01, gapY: 0.08 }
    ];

    var rackId = 0;
    rackZones.forEach(function (rz, zi) {
      for (var r = 0; r < rz.rows; r++) {
        for (var c = 0; c < rz.cols; c++) {
          rackId++;
          var rx = rz.zx + c * (rz.w + rz.gapX);
          var ry = rz.zy + r * (rz.h + rz.gapY);

          // Simulate utilization with color coding
          var util = 40 + Math.floor(Math.random() * 55);
          var col;
          if (util > 85) col = [239, 71, 111, 180];
          else if (util > 70) col = [255, 209, 102, 160];
          else col = [6, 214, 160, 120];

          var g = new Graphic({
            geometry: makeRect(rx, ry, rz.w, rz.h),
            symbol: new SimpleFillSymbol({ color: col, outline: rackOutline }),
            attributes: {
              id: "RACK-" + String(rackId).padStart(3, "0"),
              utilization: util,
              zone: ["A", "B", "C", "D", "E"][zi],
              row: r + 1,
              position: c + 1,
              temperature: (20 + Math.random() * 8).toFixed(1)
            },
            popupTemplate: new PopupTemplate({
              title: "Rack {id}",
              content:
                "<b>Zone:</b> {zone}<br/>" +
                "<b>Row:</b> {row} | <b>Position:</b> {position}<br/>" +
                "<b>Utilization:</b> {utilization}%<br/>" +
                "<b>Temperature:</b> {temperature}°C<br/>" +
                "<b>Status:</b> Active"
            })
          });
          racksLayer.add(g);
        }
      }
    });
  }

  function drawLabels() {
    var labels = [
      { text: "ZONE A\nCloud Services", x: 0.4, y: 0.25 },
      { text: "ZONE B\nEnterprise", x: 1.25, y: 0.25 },
      { text: "ZONE C\nStorage", x: 2.05, y: 0.25 },
      { text: "ZONE D\nNetwork Core", x: 0.4, y: 0.85 },
      { text: "ZONE E\nExpansion", x: 1.25, y: 0.85 },
      { text: "NOC\nRoom", x: 2.05, y: 0.85 },
      { text: "POWER\nROOM", x: 0.55, y: 1.4 },
      { text: "COOLING\nPLANT", x: 1.8, y: 1.4 }
    ];

    labels.forEach(function (l) {
      labelsLayer.add(new Graphic({
        geometry: new Point({ x: ox(l.x), y: oy(l.y), spatialReference: { wkid: 4326 } }),
        symbol: new TextSymbol({
          text: l.text,
          color: [200, 210, 225, 180],
          font: { size: 9, weight: "bold", family: "Inter, sans-serif" },
          haloColor: [10, 14, 23, 180],
          haloSize: 1
        })
      }));
    });
  }

  // ============================================
  // Navigation / Panel Switching
  // ============================================
  var navBtns = document.querySelectorAll(".nav-btn");
  var panels = document.querySelectorAll(".panel-content");

  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-panel");
      navBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      panels.forEach(function (p) { p.classList.remove("active"); });
      document.getElementById("panel-" + target).classList.add("active");

      // Update map visualization
      updateMapForPanel(target);
      updateLegend(target);
    });
  });

  function updateMapForPanel(panel) {
    routeLayer.removeAll();
    safetyLayer.removeAll();
    envLayer.removeAll();
    racksLayer.visible = true;
    zonesLayer.visible = true;

    switch (panel) {
      case "routing":
        break;
      case "spaces":
        showSpaceVisualization();
        break;
      case "assets":
        showAssetMarkers();
        break;
      case "safety":
        break;
      case "environment":
        showEnvironmentHeatmap();
        break;
      default:
        break;
    }
  }

  // ============================================
  // Routing Feature
  // ============================================
  var routeLocations = {
    entrance: { x: 1.2, y: -0.1, label: "Main Entrance" },
    noc: { x: 2.05, y: 0.85, label: "NOC Room" },
    a1: { x: 0.15, y: 0.1, label: "Zone A1" },
    b2: { x: 1.05, y: 0.2, label: "Zone B2" },
    c3: { x: 1.85, y: 0.15, label: "Zone C3" },
    mdf: { x: 0.4, y: 0.85, label: "Main Distribution Frame" },
    power: { x: 0.55, y: 1.3, label: "Power Room A" },
    cooling: { x: 1.8, y: 1.3, label: "Cooling Plant" },
    generator: { x: 0.1, y: 1.5, label: "Generator Room" },
    loading: { x: 1.2, y: 1.65, label: "Loading Dock" }
  };

  document.getElementById("calculate-route").addEventListener("click", function () {
    var fromKey = document.getElementById("route-from").value;
    var toKey = document.getElementById("route-to").value;
    calculateRoute(fromKey, toKey);
  });

  document.getElementById("swap-route").addEventListener("click", function () {
    var fromSel = document.getElementById("route-from");
    var toSel = document.getElementById("route-to");
    var temp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = temp;
  });

  function calculateRoute(fromKey, toKey) {
    routeLayer.removeAll();

    var from = routeLocations[fromKey];
    var to = routeLocations[toKey];
    if (!from || !to) return;

    // Generate a simulated route with waypoints through corridors
    var waypoints = generateWaypoints(from, to);
    var pathCoords = waypoints.map(function (wp) {
      return [ox(wp.x), oy(wp.y)];
    });

    // Draw route line
    var routeLine = new Graphic({
      geometry: new Polyline({ paths: [pathCoords], spatialReference: { wkid: 4326 } }),
      symbol: new SimpleLineSymbol({
        color: [0, 180, 216, 220],
        width: 4,
        style: "solid",
        cap: "round",
        join: "round"
      })
    });
    routeLayer.add(routeLine);

    // Animated dashed overlay
    var routeDash = new Graphic({
      geometry: new Polyline({ paths: [pathCoords], spatialReference: { wkid: 4326 } }),
      symbol: new SimpleLineSymbol({
        color: [255, 255, 255, 80],
        width: 2,
        style: "dash"
      })
    });
    routeLayer.add(routeDash);

    // Start marker
    routeLayer.add(new Graphic({
      geometry: new Point({ x: ox(from.x), y: oy(from.y), spatialReference: { wkid: 4326 } }),
      symbol: new SimpleMarkerSymbol({
        color: [6, 214, 160],
        size: 14,
        outline: { color: [255, 255, 255], width: 2 }
      })
    }));

    // End marker
    routeLayer.add(new Graphic({
      geometry: new Point({ x: ox(to.x), y: oy(to.y), spatialReference: { wkid: 4326 } }),
      symbol: new SimpleMarkerSymbol({
        color: [239, 71, 111],
        size: 14,
        outline: { color: [255, 255, 255], width: 2 },
        style: "diamond"
      })
    }));

    // Turn point markers
    waypoints.slice(1, -1).forEach(function (wp) {
      routeLayer.add(new Graphic({
        geometry: new Point({ x: ox(wp.x), y: oy(wp.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: [0, 180, 216, 180],
          size: 6,
          outline: { color: [255, 255, 255, 150], width: 1 }
        })
      }));
    });

    // Calculate stats
    var totalDist = 0;
    for (var i = 1; i < waypoints.length; i++) {
      var dx = waypoints[i].x - waypoints[i - 1].x;
      var dy = waypoints[i].y - waypoints[i - 1].y;
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    var distMeters = Math.round(totalDist * 50);
    var walkTime = Math.max(1, Math.round(distMeters / 80));

    document.getElementById("route-distance").textContent = distMeters + "m";
    document.getElementById("route-time").textContent = walkTime + " min";
    document.getElementById("route-floors").textContent = "1";

    // Generate directions
    var directions = generateDirections(from, to, waypoints);
    var dirList = document.getElementById("directions-list");
    dirList.innerHTML = "";
    directions.forEach(function (d) {
      var li = document.createElement("li");
      li.textContent = d;
      dirList.appendChild(li);
    });

    document.getElementById("route-results").classList.remove("hidden");
  }

  function generateWaypoints(from, to) {
    var points = [{ x: from.x, y: from.y }];

    // Use corridor-based routing (simplified)
    var corridorY1 = 0.55;
    var corridorY2 = 1.15;

    // Move to nearest corridor
    if (from.y < corridorY1) {
      points.push({ x: from.x, y: corridorY1 });
    } else if (from.y > corridorY2) {
      points.push({ x: from.x, y: corridorY2 });
    }

    // Determine target corridor
    var targetCorridorY = to.y < corridorY1 ? corridorY1 : (to.y > corridorY2 ? corridorY2 : to.y);

    // Move along corridor to align with destination X
    var lastPt = points[points.length - 1];
    if (Math.abs(lastPt.x - to.x) > 0.1) {
      points.push({ x: to.x, y: lastPt.y });
    }

    // Move to target corridor if different
    lastPt = points[points.length - 1];
    if (Math.abs(lastPt.y - targetCorridorY) > 0.05) {
      points.push({ x: lastPt.x, y: targetCorridorY });
    }

    // Approach destination
    lastPt = points[points.length - 1];
    if (Math.abs(lastPt.x - to.x) > 0.05 || Math.abs(lastPt.y - to.y) > 0.05) {
      points.push({ x: to.x, y: to.y });
    }

    // Ensure we end at destination
    lastPt = points[points.length - 1];
    if (lastPt.x !== to.x || lastPt.y !== to.y) {
      points.push({ x: to.x, y: to.y });
    }

    return points;
  }

  function generateDirections(from, to, waypoints) {
    var dirs = [
      "Start at " + from.label,
      "Proceed through security checkpoint",
    ];

    if (waypoints.length > 3) {
      dirs.push("Walk along main corridor heading " + (to.x > from.x ? "east" : "west"));
      dirs.push("Continue past server rows");
    }

    if (Math.abs(from.y - to.y) > 0.3) {
      dirs.push("Turn " + (to.y > from.y ? "south" : "north") + " at intersection");
    }

    dirs.push("Follow aisle markers to destination");
    dirs.push("Arrive at " + to.label);

    return dirs;
  }

  // ============================================
  // Space Management Visualization
  // ============================================
  function showSpaceVisualization() {
    // Already shown via zones, just ensure visibility
    zonesLayer.visible = true;
    racksLayer.visible = true;
  }

  var spaceToggles = document.querySelectorAll("#panel-spaces .toggle-btn");
  spaceToggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      spaceToggles.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");

      var mode = btn.getAttribute("data-mode");
      updateSpaceView(mode);
    });
  });

  function updateSpaceView(mode) {
    // Update rack colors based on view mode
    racksLayer.graphics.forEach(function (g) {
      var util = g.attributes ? g.attributes.utilization : 50;
      var col;

      switch (mode) {
        case "utilization":
          if (util > 85) col = [239, 71, 111, 180];
          else if (util > 70) col = [255, 209, 102, 160];
          else col = [6, 214, 160, 120];
          break;
        case "allocation":
          var zone = g.attributes ? g.attributes.zone : "A";
          var zoneColors = { A: [0, 180, 216], B: [6, 214, 160], C: [239, 71, 111], D: [255, 209, 102], E: [155, 93, 229] };
          var c = zoneColors[zone] || [100, 100, 100];
          col = [c[0], c[1], c[2], 160];
          break;
        case "available":
          col = util < 60 ? [6, 214, 160, 200] : [42, 58, 78, 100];
          break;
      }

      if (col && g.symbol && g.symbol.type === "simple-fill") {
        g.symbol = new SimpleFillSymbol({
          color: col,
          outline: { color: [60, 80, 100], width: 0.5 }
        });
      }
    });
  }

  // ============================================
  // Asset Tracking
  // ============================================
  var assetLocations = [
    { id: "srv-001", name: "Dell PowerEdge R750xs", type: "server", x: 0.15, y: 0.1, status: "online" },
    { id: "sw-001", name: "Cisco Nexus 9300", type: "network", x: 1.05, y: 0.2, status: "online" },
    { id: "ups-001", name: "Eaton 9PX UPS", type: "power", x: 1.85, y: 0.15, status: "warning" },
    { id: "crac-001", name: "Schneider CRAC InRow", type: "cooling", x: 1.1, y: 0.9, status: "critical" },
    { id: "pdu-001", name: "APC Rack PDU 9000", type: "power", x: 0.6, y: 0.2, status: "online" }
  ];

  function showAssetMarkers() {
    assetsLayer.removeAll();
    var statusColors = {
      online: [6, 214, 160],
      warning: [255, 209, 102],
      critical: [239, 71, 111]
    };

    assetLocations.forEach(function (asset) {
      var col = statusColors[asset.status] || [100, 100, 100];
      assetsLayer.add(new Graphic({
        geometry: new Point({ x: ox(asset.x), y: oy(asset.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: col,
          size: asset.status === "critical" ? 16 : 12,
          outline: { color: [255, 255, 255], width: 2 },
          style: asset.type === "server" ? "circle" : asset.type === "network" ? "diamond" : "square"
        }),
        attributes: { name: asset.name, id: asset.id, status: asset.status, type: asset.type },
        popupTemplate: new PopupTemplate({
          title: "{name}",
          content: "<b>Asset ID:</b> {id}<br/><b>Type:</b> {type}<br/><b>Status:</b> {status}"
        })
      }));

      // Pulsing ring for critical assets
      if (asset.status === "critical") {
        assetsLayer.add(new Graphic({
          geometry: new Point({ x: ox(asset.x), y: oy(asset.y), spatialReference: { wkid: 4326 } }),
          symbol: new SimpleMarkerSymbol({
            color: [239, 71, 111, 0],
            size: 28,
            outline: { color: [239, 71, 111, 100], width: 2 }
          })
        }));
      }
    });
  }

  // Asset locate buttons
  document.querySelectorAll(".locate-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var item = btn.closest(".asset-item");
      var assetId = item.getAttribute("data-id");
      var asset = assetLocations.find(function (a) { return a.id === assetId; });
      if (asset) {
        currentView.goTo({
          center: [ox(asset.x), oy(asset.y)],
          zoom: 21
        }, { duration: 800 });

        // Flash effect
        showAssetMarkers();
      }
    });
  });

  // Asset filter chips
  document.querySelectorAll(".filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
    });
  });

  // ============================================
  // Safety Features
  // ============================================
  document.getElementById("btn-evac-routes").addEventListener("click", function () {
    this.classList.toggle("active");
    if (this.classList.contains("active")) {
      showEvacRoutes();
    } else {
      safetyLayer.removeAll();
    }
  });

  document.getElementById("btn-cameras").addEventListener("click", function () {
    this.classList.toggle("active");
    if (this.classList.contains("active")) {
      showCameras();
    } else {
      // Remove camera graphics only
      safetyLayer.graphics.toArray().forEach(function (g) {
        if (g.attributes && g.attributes.type === "camera") {
          safetyLayer.remove(g);
        }
      });
    }
  });

  document.getElementById("btn-fire-systems").addEventListener("click", function () {
    this.classList.toggle("active");
    if (this.classList.contains("active")) {
      showFireSystems();
    } else {
      safetyLayer.graphics.toArray().forEach(function (g) {
        if (g.attributes && g.attributes.type === "fire") {
          safetyLayer.remove(g);
        }
      });
    }
  });

  document.getElementById("btn-access-points").addEventListener("click", function () {
    this.classList.toggle("active");
    if (this.classList.contains("active")) {
      showAccessPoints();
    } else {
      safetyLayer.graphics.toArray().forEach(function (g) {
        if (g.attributes && g.attributes.type === "access") {
          safetyLayer.remove(g);
        }
      });
    }
  });

  function showEvacRoutes() {
    // Evacuation routes to exits
    var exits = [
      { x: 2.5, y: 0.5, label: "Emergency Exit A (East)" },
      { x: -0.1, y: 0.8, label: "Emergency Exit B (West)" },
      { x: 1.2, y: -0.1, label: "Main Entrance (North)" },
      { x: 1.2, y: 1.7, label: "Loading Dock (South)" }
    ];

    // Draw exit markers
    exits.forEach(function (exit) {
      safetyLayer.add(new Graphic({
        geometry: new Point({ x: ox(exit.x), y: oy(exit.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: [239, 71, 111],
          size: 16,
          style: "triangle",
          outline: { color: [255, 255, 255], width: 2 }
        }),
        attributes: { name: exit.label, type: "evacuation" },
        popupTemplate: new PopupTemplate({ title: "{name}", content: "Emergency exit point" })
      }));
    });

    // Draw evacuation routes from center
    var routeSymbol = new SimpleLineSymbol({
      color: [239, 71, 111, 180],
      width: 3,
      style: "short-dash"
    });

    var center = { x: 1.2, y: 0.55 };
    exits.forEach(function (exit) {
      safetyLayer.add(new Graphic({
        geometry: new Polyline({
          paths: [[[ox(center.x), oy(center.y)], [ox(exit.x), oy(exit.y)]]],
          spatialReference: { wkid: 4326 }
        }),
        symbol: routeSymbol,
        attributes: { type: "evacuation" }
      }));
    });
  }

  function showCameras() {
    var cameras = [
      { x: 0.0, y: 0.0 }, { x: 1.2, y: 0.0 }, { x: 2.4, y: 0.0 },
      { x: 0.0, y: 0.55 }, { x: 1.2, y: 0.55 }, { x: 2.4, y: 0.55 },
      { x: 0.0, y: 1.15 }, { x: 1.2, y: 1.15 }, { x: 2.4, y: 1.15 },
      { x: 0.6, y: 1.6 }, { x: 1.8, y: 1.6 }
    ];

    cameras.forEach(function (cam, i) {
      safetyLayer.add(new Graphic({
        geometry: new Point({ x: ox(cam.x), y: oy(cam.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: [0, 180, 216, 200],
          size: 10,
          style: "square",
          outline: { color: [255, 255, 255], width: 1.5 }
        }),
        attributes: { name: "Camera " + (i + 1), type: "camera", status: "Active" },
        popupTemplate: new PopupTemplate({
          title: "Security {name}",
          content: "Status: {status}<br/>Coverage: 120° FOV<br/>Recording: 24/7"
        })
      }));

      // Coverage cone (simplified as circle)
      safetyLayer.add(new Graphic({
        geometry: new Point({ x: ox(cam.x), y: oy(cam.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: [0, 180, 216, 20],
          size: 40,
          outline: { color: [0, 180, 216, 40], width: 1 }
        }),
        attributes: { type: "camera" }
      }));
    });
  }

  function showFireSystems() {
    var sprinklers = [];
    for (var sx = 0.2; sx < 2.4; sx += 0.4) {
      for (var sy = 0.1; sy < 1.5; sy += 0.3) {
        sprinklers.push({ x: sx, y: sy });
      }
    }

    sprinklers.forEach(function (sp, i) {
      safetyLayer.add(new Graphic({
        geometry: new Point({ x: ox(sp.x), y: oy(sp.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: [255, 209, 102, 150],
          size: 8,
          style: "circle",
          outline: { color: [255, 209, 102, 80], width: 1 }
        }),
        attributes: { name: "Suppression Node " + (i + 1), type: "fire" },
        popupTemplate: new PopupTemplate({
          title: "{name}",
          content: "Type: FM-200 Clean Agent<br/>Status: Armed<br/>Last Test: 2024-02-15"
        })
      }));
    });
  }

  function showAccessPoints() {
    var accessPts = [
      { x: 1.2, y: -0.1, label: "Main Entrance", level: "Biometric + Badge" },
      { x: 0.0, y: 0.55, label: "Zone D Entry", level: "Badge" },
      { x: 0.85, y: 0.55, label: "Zone E Entry", level: "Badge" },
      { x: 1.7, y: 0.55, label: "NOC Entry", level: "Biometric" },
      { x: 1.2, y: 1.15, label: "Utility Access", level: "Key + Badge" }
    ];

    accessPts.forEach(function (ap) {
      safetyLayer.add(new Graphic({
        geometry: new Point({ x: ox(ap.x), y: oy(ap.y), spatialReference: { wkid: 4326 } }),
        symbol: new SimpleMarkerSymbol({
          color: [6, 214, 160, 200],
          size: 12,
          style: "diamond",
          outline: { color: [255, 255, 255], width: 2 }
        }),
        attributes: { name: ap.label, type: "access", level: ap.level },
        popupTemplate: new PopupTemplate({
          title: "Access Point: {name}",
          content: "Security Level: {level}<br/>Status: Active"
        })
      }));
    });
  }

  // ============================================
  // Environment Heatmap
  // ============================================
  function showEnvironmentHeatmap() {
    envLayer.removeAll();

    // Create temperature gradient cells
    for (var ex = 0; ex < 2.4; ex += 0.15) {
      for (var ey = 0; ey < 1.1; ey += 0.15) {
        var temp = 20 + Math.random() * 6;
        // Create a hot spot near Zone B3
        var distToHotspot = Math.sqrt(Math.pow(ex - 1.1, 2) + Math.pow(ey - 0.9, 2));
        if (distToHotspot < 0.3) {
          temp += (0.3 - distToHotspot) * 30;
        }

        var r, g, b;
        if (temp > 28) { r = 239; g = 71; b = 111; }
        else if (temp > 25) { r = 255; g = 209; b = 102; }
        else if (temp > 22) { r = 6; g = 214; b = 160; }
        else { r = 0; g = 180; b = 216; }

        envLayer.add(new Graphic({
          geometry: makeRect(ex, ey, 0.14, 0.14),
          symbol: new SimpleFillSymbol({
            color: [r, g, b, 50],
            outline: { color: [r, g, b, 20], width: 0 }
          }),
          attributes: { temperature: temp.toFixed(1) + "°C" }
        }));
      }
    }
  }

  var envToggles = document.querySelectorAll("#panel-environment .toggle-btn");
  envToggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      envToggles.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      showEnvironmentHeatmap();
    });
  });

  // ============================================
  // Floor Selector
  // ============================================
  document.getElementById("floor-select").addEventListener("change", function () {
    buildFloorPlan();
    var activePanel = document.querySelector(".nav-btn.active");
    if (activePanel) {
      updateMapForPanel(activePanel.getAttribute("data-panel"));
    }
  });

  // Floor items in overview
  document.querySelectorAll(".floor-item").forEach(function (item) {
    item.addEventListener("click", function () {
      document.querySelectorAll(".floor-item").forEach(function (i) { i.classList.remove("active"); });
      item.classList.add("active");
      var floor = item.getAttribute("data-floor");
      document.getElementById("floor-select").value = floor;
      buildFloorPlan();
    });
  });

  // ============================================
  // 3D Toggle
  // ============================================
  document.getElementById("btn-3d-toggle").addEventListener("click", function () {
    is3D = !is3D;
    this.classList.toggle("active");

    if (is3D) {
      currentView.container = null;
      currentView = new SceneView({
        container: "viewDiv",
        map: map,
        camera: {
          position: { x: CENTER[0], y: CENTER[1] - 0.003, z: 500 },
          tilt: 60,
          heading: 0
        },
        environment: {
          background: { type: "color", color: [10, 14, 23] },
          starsEnabled: false,
          atmosphereEnabled: false
        }
      });
    } else {
      currentView.container = null;
      currentView = createMapView();
      currentView.when(function () {
        buildFloorPlan();
      });
    }
  });

  // ============================================
  // Space Planner Button
  // ============================================
  document.getElementById("btn-plan-space").addEventListener("click", function () {
    var modal = document.getElementById("feature-modal");
    var body = document.getElementById("modal-body");
    body.innerHTML =
      '<h2 style="margin-bottom:12px">Space Planner</h2>' +
      '<p style="color:#8899aa;margin-bottom:16px">Interactive workspace planning tool powered by ArcGIS Indoors Space Planner</p>' +
      '<div style="background:#1a2332;border:1px solid #2a3a4e;border-radius:8px;padding:20px;margin-bottom:16px">' +
      '<h4 style="margin-bottom:8px">Available Capacity Summary</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div><span style="color:#06d6a0;font-size:1.4rem;font-weight:700">42</span><br><span style="color:#8899aa;font-size:0.75rem">Empty Rack Positions</span></div>' +
      '<div><span style="color:#00b4d8;font-size:1.4rem;font-weight:700">1,680</span><br><span style="color:#8899aa;font-size:0.75rem">Sq Ft Available</span></div>' +
      '<div><span style="color:#ffd166;font-size:1.4rem;font-weight:700">280 kW</span><br><span style="color:#8899aa;font-size:0.75rem">Power Headroom</span></div>' +
      '<div><span style="color:#9b5de5;font-size:1.4rem;font-weight:700">15 tons</span><br><span style="color:#8899aa;font-size:0.75rem">Cooling Capacity</span></div>' +
      '</div></div>' +
      '<p style="color:#8899aa;font-size:0.82rem">With ArcGIS Indoors Space Planner, facility managers can drag-and-drop rack allocations, ' +
      'assign spaces to business units, plan expansions, and optimize layouts — all through an interactive map-based interface.</p>';
    modal.classList.remove("hidden");
  });

  document.getElementById("modal-close").addEventListener("click", function () {
    document.getElementById("feature-modal").classList.add("hidden");
  });

  document.getElementById("feature-modal").addEventListener("click", function (e) {
    if (e.target === this) this.classList.add("hidden");
  });

  // ============================================
  // Legend
  // ============================================
  function updateLegend(panel) {
    var content = document.getElementById("legend-content");
    var items = [];

    switch (panel) {
      case "overview":
      case "spaces":
        items = [
          { color: "#06d6a0", label: "Normal (<70%)" },
          { color: "#ffd166", label: "Elevated (70-85%)" },
          { color: "#ef476f", label: "High (>85%)" }
        ];
        break;
      case "routing":
        items = [
          { color: "#00b4d8", label: "Route Path" },
          { color: "#06d6a0", label: "Start Point" },
          { color: "#ef476f", label: "End Point" }
        ];
        break;
      case "assets":
        items = [
          { color: "#06d6a0", label: "Online" },
          { color: "#ffd166", label: "Warning" },
          { color: "#ef476f", label: "Critical" }
        ];
        break;
      case "safety":
        items = [
          { color: "#ef476f", label: "Evacuation" },
          { color: "#00b4d8", label: "Cameras" },
          { color: "#ffd166", label: "Fire Systems" },
          { color: "#06d6a0", label: "Access Points" }
        ];
        break;
      case "environment":
        items = [
          { color: "#00b4d8", label: "<22°C Cool" },
          { color: "#06d6a0", label: "22-25°C Normal" },
          { color: "#ffd166", label: "25-28°C Warm" },
          { color: "#ef476f", label: ">28°C Hot" }
        ];
        break;
    }

    content.innerHTML = items.map(function (item) {
      return '<div class="legend-item"><div class="legend-color" style="background:' + item.color + '"></div><span>' + item.label + '</span></div>';
    }).join("");
  }

  // ============================================
  // Simulate live data updates
  // ============================================
  setInterval(function () {
    // Subtly update a stat
    var pue = (1.25 + Math.random() * 0.08).toFixed(2);
    var pueEl = document.getElementById("stat-pue");
    if (pueEl) pueEl.textContent = pue;
  }, 5000);
});
