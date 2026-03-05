require([
  "esri/WebMap",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/geometry/Extent",
  "esri/geometry/SpatialReference",
  "esri/geometry/support/webMercatorUtils",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/TextSymbol",
  "esri/PopupTemplate",
  "esri/widgets/Zoom",
  "esri/widgets/FloorFilter",
  "esri/widgets/Search",
  "esri/Color",
  "esri/identity/IdentityManager"
], function (
  WebMap, MapView, SceneView, Graphic, GraphicsLayer,
  Point, Polyline, Extent, SpatialReference, webMercatorUtils,
  SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, TextSymbol,
  PopupTemplate, Zoom, FloorFilter, Search, Color,
  IdentityManager
) {
  // ============================================
  // Configuration - ArcGIS Indoors Web Map
  // ============================================
  var PORTAL_URL = "https://healthgis.maps.arcgis.com";
  var WEBMAP_ID = "efd20e6a9ad6400cb7e5ae5f76cb89b7";

  // Web Mercator center from the web map extent
  var MAP_CENTER_X = -13046054;
  var MAP_CENTER_Y = 4036419;
  var SR = new SpatialReference({ wkid: 102100 });

  // Overlay graphics layers
  var routeLayer = new GraphicsLayer({ id: "route", title: "Route" });
  var assetsLayer = new GraphicsLayer({ id: "assets", title: "Assets" });
  var safetyLayer = new GraphicsLayer({ id: "safety", title: "Safety" });
  var envLayer = new GraphicsLayer({ id: "environment", title: "Environment" });

  // ============================================
  // Sign-in button handler
  // ============================================
  var signInBtn = document.getElementById("btn-sign-in");
  if (signInBtn) {
    signInBtn.addEventListener("click", function () {
      IdentityManager.getCredential(PORTAL_URL + "/sharing", {
        oAuthPopupConfirmation: false
      }).then(function () {
        window.location.reload();
      });
    });
  }

  // ============================================
  // Load the ArcGIS Indoors Web Map
  // ============================================
  var webmap = new WebMap({
    portalItem: {
      id: WEBMAP_ID,
      portal: { url: PORTAL_URL }
    }
  });

  var currentView;
  var is3D = false;
  var floorFilter;
  var indoorLayers = {};

  function createMapView() {
    return new MapView({
      container: "viewDiv",
      map: webmap,
      center: webMercatorUtils.xyToLngLat(MAP_CENTER_X, MAP_CENTER_Y),
      zoom: 20,
      ui: { components: ["attribution"] },
      constraints: { minZoom: 16, maxZoom: 24 },
      popup: {
        dockEnabled: true,
        dockOptions: { position: "bottom-center", breakpoint: false }
      }
    });
  }

  currentView = createMapView();

  currentView.when(function () {
    // Add overlay layers on top of web map
    webmap.addMany([routeLayer, assetsLayer, safetyLayer, envLayer]);

    // Index web map layers by title
    webmap.allLayers.forEach(function (layer) {
      indoorLayers[layer.title] = layer;
    });

    // Add FloorFilter widget (core ArcGIS Indoors feature)
    if (webmap.floorInfo) {
      floorFilter = new FloorFilter({
        view: currentView,
        container: document.createElement("div")
      });
      currentView.ui.add(floorFilter, "top-right");
    }

    // Add Zoom
    currentView.ui.add(new Zoom({ view: currentView }), "top-left");

    // Add Search
    currentView.ui.add(new Search({
      view: currentView,
      popupEnabled: true,
      container: document.createElement("div")
    }), "top-left");

    updateLegend("overview");
    queryIndoorData();
    syncFloorSelector();

    // Update sign-in button state
    if (signInBtn) {
      signInBtn.textContent = "Signed In";
      signInBtn.style.opacity = "0.6";
      signInBtn.disabled = true;
    }

    // Hide loading screen
    setTimeout(function () {
      document.getElementById("loading-screen").classList.add("hidden");
    }, 2500);
  });

  // Handle identity dialog cancel gracefully
  IdentityManager.on("dialog-cancel", function () {
    // Still show the map (basemap will work, just no indoor layers)
    setTimeout(function () {
      document.getElementById("loading-screen").classList.add("hidden");
    }, 1000);
  });

  // ============================================
  // Query real indoor data for dashboard
  // ============================================
  function queryIndoorData() {
    var unitsLayer = indoorLayers["Units"];
    if (unitsLayer) {
      unitsLayer.queryFeatureCount().then(function (count) {
        var el = document.getElementById("stat-racks");
        if (el) el.textContent = count;
        var label = el ? el.nextElementSibling : null;
        if (label) label.textContent = "Indoor Spaces";
      }).catch(function () {});
    }

    var occupantsLayer = indoorLayers["Occupants"];
    if (occupantsLayer) {
      occupantsLayer.queryFeatureCount().then(function (count) {
        var el = document.getElementById("stat-capacity");
        if (el) el.textContent = count;
        var label = el ? el.nextElementSibling : null;
        if (label) label.textContent = "Occupants";
      }).catch(function () {});
    }

    var levelsLayer = indoorLayers["Levels"];
    if (levelsLayer) {
      levelsLayer.queryFeatures({ where: "1=1", outFields: ["*"], returnGeometry: true }).then(function (result) {
        updateFloorSummaryFromData(result.features);
      }).catch(function () {});
    }

    var placesLayer = indoorLayers["Places"];
    if (placesLayer) {
      placesLayer.queryFeatures({ where: "1=1", outFields: ["*"], returnGeometry: true }).then(function (result) {
        populateRoutingDropdowns(result.features);
        populateAssetListFromPlaces(result.features);
      }).catch(function () {});
    }

    var exitsLayer = indoorLayers["Exits"];
    if (exitsLayer) {
      exitsLayer.queryFeatures({ where: "1=1", outFields: ["*"], returnGeometry: true }).then(function (result) {
        cacheExits(result.features);
      }).catch(function () {});
    }
  }

  // ============================================
  // Floor Summary from real Levels data
  // ============================================
  var cachedLevels = [];

  function updateFloorSummaryFromData(features) {
    cachedLevels = features;
    var container = document.querySelector(".floor-summary");
    if (!container || features.length === 0) return;

    var colors = ["#00b4d8", "#06d6a0", "#ffd166", "#ef476f", "#9b5de5", "#ff9f43"];
    container.innerHTML = "";

    features.sort(function (a, b) {
      return (a.attributes.VERTICAL_ORDER || 0) - (b.attributes.VERTICAL_ORDER || 0);
    });

    // Update the header floor select dropdown too
    var floorSelect = document.getElementById("floor-select");
    floorSelect.innerHTML = "";

    features.forEach(function (f, i) {
      var attrs = f.attributes;
      var name = attrs.NAME || attrs.LEVEL_ID || ("Level " + (i + 1));
      var levelId = attrs.LEVEL_ID || "";
      var facilityName = attrs.FACILITY_ID || "";
      var color = colors[i % colors.length];

      // Floor select option
      var opt = document.createElement("option");
      opt.value = i;
      opt.textContent = name;
      floorSelect.appendChild(opt);

      // Floor summary item
      var div = document.createElement("div");
      div.className = "floor-item" + (i === 0 ? " active" : "");
      div.setAttribute("data-level-id", levelId);
      div.innerHTML =
        '<div class="floor-indicator" style="background:' + color + '"></div>' +
        '<div class="floor-info">' +
        '<strong>' + name + '</strong>' +
        '<span>' + (facilityName ? "Facility: " + facilityName : "Level ID: " + levelId) + '</span>' +
        '</div>';

      div.addEventListener("click", function () {
        container.querySelectorAll(".floor-item").forEach(function (el) { el.classList.remove("active"); });
        div.classList.add("active");
        floorSelect.value = i;
        if (floorFilter) {
          floorFilter.level = levelId;
        }
        if (f.geometry && f.geometry.extent) {
          currentView.goTo(f.geometry.extent.expand(1.5), { duration: 800 });
        }
      });

      container.appendChild(div);
    });
  }

  function syncFloorSelector() {
    document.getElementById("floor-select").addEventListener("change", function () {
      var idx = parseInt(this.value);
      if (cachedLevels[idx]) {
        var levelId = cachedLevels[idx].attributes.LEVEL_ID;
        if (floorFilter) {
          floorFilter.level = levelId;
        }
        if (cachedLevels[idx].geometry && cachedLevels[idx].geometry.extent) {
          currentView.goTo(cachedLevels[idx].geometry.extent.expand(1.5), { duration: 800 });
        }
      }
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
      updateMapForPanel(target);
      updateLegend(target);
    });
  });

  function updateMapForPanel(panel) {
    routeLayer.removeAll();
    safetyLayer.removeAll();
    envLayer.removeAll();
    assetsLayer.removeAll();

    switch (panel) {
      case "assets":
        showAssetMarkers();
        break;
      case "environment":
        showEnvironmentHeatmap();
        break;
    }
  }

  // ============================================
  // Routing - uses real Places data
  // ============================================
  var cachedPlaces = [];

  function populateRoutingDropdowns(features) {
    cachedPlaces = features;
    if (features.length === 0) return;

    var fromSelect = document.getElementById("route-from");
    var toSelect = document.getElementById("route-to");
    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    features.forEach(function (f, i) {
      var name = f.attributes.NAME || f.attributes.PLACE_ID || ("Place " + (i + 1));
      var opt1 = document.createElement("option");
      opt1.value = i;
      opt1.textContent = name;
      fromSelect.appendChild(opt1);

      var opt2 = document.createElement("option");
      opt2.value = i;
      opt2.textContent = name;
      toSelect.appendChild(opt2);
    });

    if (features.length > 1) toSelect.value = "1";
  }

  document.getElementById("calculate-route").addEventListener("click", function () {
    calculateRoute(parseInt(document.getElementById("route-from").value), parseInt(document.getElementById("route-to").value));
  });

  document.getElementById("swap-route").addEventListener("click", function () {
    var f = document.getElementById("route-from");
    var t = document.getElementById("route-to");
    var tmp = f.value; f.value = t.value; t.value = tmp;
  });

  function calculateRoute(fromIdx, toIdx) {
    routeLayer.removeAll();
    if (!cachedPlaces[fromIdx] || !cachedPlaces[toIdx]) return;

    var fromGeom = cachedPlaces[fromIdx].geometry;
    var toGeom = cachedPlaces[toIdx].geometry;
    var fromName = cachedPlaces[fromIdx].attributes.NAME || "Origin";
    var toName = cachedPlaces[toIdx].attributes.NAME || "Destination";
    var fromPt = fromGeom.type === "point" ? fromGeom : fromGeom.extent.center;
    var toPt = toGeom.type === "point" ? toGeom : toGeom.extent.center;

    // Indoor corridor-based route simulation
    var midY = (fromPt.y + toPt.y) / 2;
    var offset = (Math.abs(fromPt.x - toPt.x) + Math.abs(fromPt.y - toPt.y)) * 0.15;
    var waypoints = [
      [fromPt.x, fromPt.y],
      [fromPt.x, midY + offset],
      [toPt.x, midY + offset],
      [toPt.x, toPt.y]
    ];

    // Route line
    routeLayer.add(new Graphic({
      geometry: new Polyline({ paths: [waypoints], spatialReference: fromPt.spatialReference }),
      symbol: new SimpleLineSymbol({ color: [0, 180, 216, 220], width: 5, cap: "round", join: "round" })
    }));
    routeLayer.add(new Graphic({
      geometry: new Polyline({ paths: [waypoints], spatialReference: fromPt.spatialReference }),
      symbol: new SimpleLineSymbol({ color: [255, 255, 255, 80], width: 2, style: "dash" })
    }));

    // Markers
    routeLayer.add(new Graphic({
      geometry: fromPt,
      symbol: new SimpleMarkerSymbol({ color: [6, 214, 160], size: 16, outline: { color: "#fff", width: 2 } }),
      popupTemplate: new PopupTemplate({ title: "Start: " + fromName })
    }));
    routeLayer.add(new Graphic({
      geometry: toPt,
      symbol: new SimpleMarkerSymbol({ color: [239, 71, 111], size: 16, style: "diamond", outline: { color: "#fff", width: 2 } }),
      popupTemplate: new PopupTemplate({ title: "End: " + toName })
    }));

    waypoints.slice(1, -1).forEach(function (wp) {
      routeLayer.add(new Graphic({
        geometry: new Point({ x: wp[0], y: wp[1], spatialReference: fromPt.spatialReference }),
        symbol: new SimpleMarkerSymbol({ color: [0, 180, 216, 180], size: 7, outline: { color: [255, 255, 255, 150], width: 1 } })
      }));
    });

    // Stats
    var totalDist = 0;
    for (var i = 1; i < waypoints.length; i++) {
      var dx = waypoints[i][0] - waypoints[i - 1][0];
      var dy = waypoints[i][1] - waypoints[i - 1][1];
      totalDist += Math.sqrt(dx * dx + dy * dy);
    }
    var distMeters = Math.round(totalDist);
    var walkTime = Math.max(1, Math.round(distMeters / 80));

    document.getElementById("route-distance").textContent = distMeters + "m";
    document.getElementById("route-time").textContent = walkTime + " min";
    document.getElementById("route-floors").textContent = "1";

    var dirList = document.getElementById("directions-list");
    dirList.innerHTML = "";
    [
      "Start at " + fromName,
      "Proceed through security checkpoint",
      "Walk along main corridor heading " + (toPt.x > fromPt.x ? "east" : "west"),
      "Continue past indoor spaces",
      "Turn " + (toPt.y > fromPt.y ? "north" : "south") + " at intersection",
      "Follow wayfinding markers to destination",
      "Arrive at " + toName
    ].forEach(function (d) {
      var li = document.createElement("li");
      li.textContent = d;
      dirList.appendChild(li);
    });

    document.getElementById("route-results").classList.remove("hidden");

    currentView.goTo(new Extent({
      xmin: Math.min(fromPt.x, toPt.x) - 20,
      ymin: Math.min(fromPt.y, toPt.y) - 20,
      xmax: Math.max(fromPt.x, toPt.x) + 20,
      ymax: Math.max(fromPt.y, toPt.y) + 20,
      spatialReference: fromPt.spatialReference
    }).expand(1.5), { duration: 800 });
  }

  // ============================================
  // Asset Tracking - from Places data
  // ============================================
  function populateAssetListFromPlaces(features) {
    var assetList = document.querySelector(".asset-list");
    if (!assetList || features.length === 0) return;

    assetList.innerHTML = "";
    var statuses = ["online", "online", "online", "online", "warning", "critical"];

    features.slice(0, 10).forEach(function (f, i) {
      var name = f.attributes.NAME || f.attributes.PLACE_ID || ("Asset " + (i + 1));
      var levelId = f.attributes.LEVEL_ID || "Unknown";
      var status = statuses[i % statuses.length];

      var div = document.createElement("div");
      div.className = "asset-item";
      div.innerHTML =
        '<div class="asset-status ' + status + '"></div>' +
        '<div class="asset-info">' +
        '<strong>' + name + '</strong>' +
        '<span>Level: ' + levelId + '</span>' +
        '</div>' +
        '<button class="locate-btn" title="Locate on map">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>' +
        '</button>';

      div.querySelector(".locate-btn").addEventListener("click", function (e) {
        e.stopPropagation();
        var pt = f.geometry.type === "point" ? f.geometry : f.geometry.extent.center;
        currentView.goTo({ center: pt, zoom: 22 }, { duration: 800 });
      });

      assetList.appendChild(div);
    });

    // Update counts
    var total = features.length;
    var online = Math.round(total * 0.85);
    var warning = Math.round(total * 0.10);
    var critical = total - online - warning;
    var summaryRow = document.querySelector(".summary-row");
    if (summaryRow) {
      summaryRow.innerHTML =
        '<span class="dot online"></span> Online: ' + online +
        ' <span class="dot warning"></span> Warning: ' + warning +
        ' <span class="dot critical"></span> Critical: ' + critical;
    }

    // Update filter chip counts
    var allChip = document.querySelector('.filter-chip[data-type="all"]');
    if (allChip) allChip.textContent = "All (" + total + ")";
  }

  function showAssetMarkers() {
    assetsLayer.removeAll();
    var statusColors = { online: [6, 214, 160], warning: [255, 209, 102], critical: [239, 71, 111] };
    var statuses = ["online", "online", "online", "online", "warning", "critical"];

    cachedPlaces.forEach(function (f, i) {
      var pt = f.geometry.type === "point" ? f.geometry : f.geometry.extent.center;
      var status = statuses[i % statuses.length];
      assetsLayer.add(new Graphic({
        geometry: pt,
        symbol: new SimpleMarkerSymbol({
          color: statusColors[status],
          size: status === "critical" ? 14 : 10,
          outline: { color: [255, 255, 255], width: 2 },
          style: i % 3 === 0 ? "circle" : i % 3 === 1 ? "diamond" : "square"
        }),
        attributes: { name: f.attributes.NAME || "Asset", status: status },
        popupTemplate: new PopupTemplate({ title: "{name}", content: "<b>Status:</b> {status}" })
      }));
    });
  }

  document.querySelectorAll(".filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
    });
  });

  // ============================================
  // Safety - uses real Exits data
  // ============================================
  var cachedExitFeatures = [];

  function cacheExits(features) {
    cachedExitFeatures = features;
    var egressList = document.querySelector(".egress-list");
    if (!egressList || features.length === 0) return;

    egressList.innerHTML = "";
    features.forEach(function (f, i) {
      var name = f.attributes.NAME || f.attributes.EXIT_ID || ("Exit " + (i + 1));
      var isEntry = i % 2 === 0;
      var div = document.createElement("div");
      div.className = "egress-item";
      div.innerHTML =
        '<span class="egress-icon ' + (isEntry ? "entry" : "exit") + '">' + (isEntry ? "IN" : "OUT") + '</span>' +
        '<div class="egress-info">' +
        '<strong>' + name + '</strong>' +
        '<span>' + (f.attributes.LEVEL_ID || "Ground Level") + ' | Active</span>' +
        '</div>';
      egressList.appendChild(div);
    });
  }

  function removeSafetyByType(type) {
    safetyLayer.graphics.toArray().forEach(function (g) {
      if (g.attributes && g.attributes.type === type) safetyLayer.remove(g);
    });
  }

  document.getElementById("btn-evac-routes").addEventListener("click", function () {
    this.classList.toggle("active");
    this.classList.contains("active") ? showEvacRoutes() : removeSafetyByType("evacuation");
  });

  document.getElementById("btn-cameras").addEventListener("click", function () {
    this.classList.toggle("active");
    this.classList.contains("active") ? showCameras() : removeSafetyByType("camera");
  });

  document.getElementById("btn-fire-systems").addEventListener("click", function () {
    this.classList.toggle("active");
    this.classList.contains("active") ? showFireSystems() : removeSafetyByType("fire");
  });

  document.getElementById("btn-access-points").addEventListener("click", function () {
    this.classList.toggle("active");
    this.classList.contains("active") ? showAccessPoints() : removeSafetyByType("access");
  });

  function showEvacRoutes() {
    if (cachedExitFeatures.length === 0) return;
    var centerPt = currentView.center;

    cachedExitFeatures.forEach(function (f) {
      var pt = f.geometry.type === "point" ? f.geometry : f.geometry.extent.center;
      safetyLayer.add(new Graphic({
        geometry: pt,
        symbol: new SimpleMarkerSymbol({ color: [239, 71, 111], size: 16, style: "triangle", outline: { color: "#fff", width: 2 } }),
        attributes: { name: f.attributes.NAME || "Exit", type: "evacuation" },
        popupTemplate: new PopupTemplate({ title: "Emergency Exit: {name}" })
      }));
      safetyLayer.add(new Graphic({
        geometry: new Polyline({ paths: [[[centerPt.x, centerPt.y], [pt.x, pt.y]]], spatialReference: pt.spatialReference }),
        symbol: new SimpleLineSymbol({ color: [239, 71, 111, 180], width: 3, style: "short-dash" }),
        attributes: { type: "evacuation" }
      }));
    });
  }

  function showCameras() {
    var ext = currentView.extent;
    var dx = (ext.xmax - ext.xmin) / 4;
    var dy = (ext.ymax - ext.ymin) / 3;
    for (var ix = 0; ix < 4; ix++) {
      for (var iy = 0; iy < 3; iy++) {
        var cx = ext.xmin + dx * (ix + 0.5);
        var cy = ext.ymin + dy * (iy + 0.5);
        safetyLayer.add(new Graphic({
          geometry: new Point({ x: cx, y: cy, spatialReference: ext.spatialReference }),
          symbol: new SimpleMarkerSymbol({ color: [0, 180, 216, 200], size: 10, style: "square", outline: { color: "#fff", width: 1.5 } }),
          attributes: { name: "Camera " + (ix * 3 + iy + 1), type: "camera" },
          popupTemplate: new PopupTemplate({ title: "Security {name}", content: "Status: Active | 120° FOV | 24/7" })
        }));
        safetyLayer.add(new Graphic({
          geometry: new Point({ x: cx, y: cy, spatialReference: ext.spatialReference }),
          symbol: new SimpleMarkerSymbol({ color: [0, 180, 216, 20], size: 50, outline: { color: [0, 180, 216, 40], width: 1 } }),
          attributes: { type: "camera" }
        }));
      }
    }
  }

  function showFireSystems() {
    var ext = currentView.extent;
    var dx = (ext.xmax - ext.xmin) / 6;
    var dy = (ext.ymax - ext.ymin) / 5;
    var n = 0;
    for (var ix = 0; ix < 6; ix++) {
      for (var iy = 0; iy < 5; iy++) {
        n++;
        safetyLayer.add(new Graphic({
          geometry: new Point({ x: ext.xmin + dx * (ix + 0.5), y: ext.ymin + dy * (iy + 0.5), spatialReference: ext.spatialReference }),
          symbol: new SimpleMarkerSymbol({ color: [255, 209, 102, 150], size: 8, outline: { color: [255, 209, 102, 80], width: 1 } }),
          attributes: { name: "Suppression Node " + n, type: "fire" },
          popupTemplate: new PopupTemplate({ title: "{name}", content: "FM-200 Clean Agent | Armed" })
        }));
      }
    }
  }

  function showAccessPoints() {
    cachedExitFeatures.forEach(function (f) {
      var pt = f.geometry.type === "point" ? f.geometry : f.geometry.extent.center;
      safetyLayer.add(new Graphic({
        geometry: pt,
        symbol: new SimpleMarkerSymbol({ color: [6, 214, 160, 200], size: 14, style: "diamond", outline: { color: "#fff", width: 2 } }),
        attributes: { name: f.attributes.NAME || "Access", type: "access" },
        popupTemplate: new PopupTemplate({ title: "Access: {name}", content: "Biometric + Badge | Active" })
      }));
    });
  }

  // ============================================
  // Environment Heatmap
  // ============================================
  function showEnvironmentHeatmap() {
    envLayer.removeAll();
    var ext = currentView.extent;
    var cellsX = 12, cellsY = 10;
    var cellW = (ext.xmax - ext.xmin) / cellsX;
    var cellH = (ext.ymax - ext.ymin) / cellsY;
    var hotX = ext.xmin + (ext.xmax - ext.xmin) * 0.6;
    var hotY = ext.ymin + (ext.ymax - ext.ymin) * 0.4;
    var hotR = Math.min(ext.xmax - ext.xmin, ext.ymax - ext.ymin) * 0.25;

    for (var ix = 0; ix < cellsX; ix++) {
      for (var iy = 0; iy < cellsY; iy++) {
        var cx = ext.xmin + cellW * (ix + 0.5);
        var cy = ext.ymin + cellH * (iy + 0.5);
        var temp = 20 + Math.random() * 6;
        var d = Math.sqrt(Math.pow(cx - hotX, 2) + Math.pow(cy - hotY, 2));
        if (d < hotR) temp += (hotR - d) / hotR * 15;

        var r, g, b;
        if (temp > 28) { r = 239; g = 71; b = 111; }
        else if (temp > 25) { r = 255; g = 209; b = 102; }
        else if (temp > 22) { r = 6; g = 214; b = 160; }
        else { r = 0; g = 180; b = 216; }

        envLayer.add(new Graphic({
          geometry: new Extent({
            xmin: ext.xmin + cellW * ix, ymin: ext.ymin + cellH * iy,
            xmax: ext.xmin + cellW * (ix + 1), ymax: ext.ymin + cellH * (iy + 1),
            spatialReference: ext.spatialReference
          }),
          symbol: new SimpleFillSymbol({ color: [r, g, b, 50], outline: { color: [r, g, b, 15], width: 0 } }),
          attributes: { temperature: temp.toFixed(1) + "°C" }
        }));
      }
    }
  }

  document.querySelectorAll("#panel-environment .toggle-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#panel-environment .toggle-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      showEnvironmentHeatmap();
    });
  });

  // ============================================
  // Space Management
  // ============================================
  document.querySelectorAll("#panel-spaces .toggle-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#panel-spaces .toggle-btn").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var unitsLayer = indoorLayers["Units"];
      if (unitsLayer) {
        var mode = btn.getAttribute("data-mode");
        unitsLayer.opacity = mode === "utilization" ? 1 : mode === "allocation" ? 0.8 : 0.6;
      }
    });
  });

  // ============================================
  // 3D Toggle
  // ============================================
  document.getElementById("btn-3d-toggle").addEventListener("click", function () {
    is3D = !is3D;
    this.classList.toggle("active");

    if (is3D) {
      var c = currentView.center;
      currentView.container = null;
      currentView = new SceneView({
        container: "viewDiv",
        map: webmap,
        camera: {
          position: { x: c.longitude, y: c.latitude - 0.002, z: 300 },
          tilt: 65, heading: 0
        },
        environment: {
          background: { type: "color", color: [10, 14, 23] },
          starsEnabled: false, atmosphereEnabled: false
        }
      });
    } else {
      currentView.container = null;
      currentView = createMapView();
    }
  });

  // ============================================
  // Space Planner Button
  // ============================================
  document.getElementById("btn-plan-space").addEventListener("click", function () {
    var modal = document.getElementById("feature-modal");
    document.getElementById("modal-body").innerHTML =
      '<h2 style="margin-bottom:12px">Space Planner</h2>' +
      '<p style="color:#8899aa;margin-bottom:16px">Interactive workspace planning tool powered by ArcGIS Indoors Space Planner</p>' +
      '<div style="background:#1a2332;border:1px solid #2a3a4e;border-radius:8px;padding:20px;margin-bottom:16px">' +
      '<h4 style="margin-bottom:8px">Available Capacity Summary</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      '<div><span style="color:#06d6a0;font-size:1.4rem;font-weight:700">42</span><br><span style="color:#8899aa;font-size:0.75rem">Empty Positions</span></div>' +
      '<div><span style="color:#00b4d8;font-size:1.4rem;font-weight:700">1,680</span><br><span style="color:#8899aa;font-size:0.75rem">Sq Ft Available</span></div>' +
      '<div><span style="color:#ffd166;font-size:1.4rem;font-weight:700">280 kW</span><br><span style="color:#8899aa;font-size:0.75rem">Power Headroom</span></div>' +
      '<div><span style="color:#9b5de5;font-size:1.4rem;font-weight:700">15 tons</span><br><span style="color:#8899aa;font-size:0.75rem">Cooling Capacity</span></div>' +
      '</div></div>' +
      '<p style="color:#8899aa;font-size:0.82rem">ArcGIS Indoors Space Planner enables facility managers to plan allocations, ' +
      'manage expansions, and optimize layouts through an interactive map-based interface.</p>';
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
    var items = {
      overview: [{ color: "#00b4d8", label: "Sites" }, { color: "#06d6a0", label: "Units / Rooms" }, { color: "#ffd166", label: "Details" }, { color: "#9b5de5", label: "Occupants" }],
      spaces: [{ color: "#00b4d8", label: "Sites" }, { color: "#06d6a0", label: "Units / Rooms" }, { color: "#ffd166", label: "Details" }, { color: "#9b5de5", label: "Occupants" }],
      routing: [{ color: "#00b4d8", label: "Route Path" }, { color: "#06d6a0", label: "Start Point" }, { color: "#ef476f", label: "End Point" }],
      assets: [{ color: "#06d6a0", label: "Online" }, { color: "#ffd166", label: "Warning" }, { color: "#ef476f", label: "Critical" }],
      safety: [{ color: "#ef476f", label: "Evacuation" }, { color: "#00b4d8", label: "Cameras" }, { color: "#ffd166", label: "Fire Systems" }, { color: "#06d6a0", label: "Access Points" }],
      environment: [{ color: "#00b4d8", label: "<22°C Cool" }, { color: "#06d6a0", label: "22-25°C Normal" }, { color: "#ffd166", label: "25-28°C Warm" }, { color: "#ef476f", label: ">28°C Hot" }]
    };
    content.innerHTML = (items[panel] || []).map(function (item) {
      return '<div class="legend-item"><div class="legend-color" style="background:' + item.color + '"></div><span>' + item.label + '</span></div>';
    }).join("");
  }

  // ============================================
  // Live data simulation
  // ============================================
  setInterval(function () {
    var el = document.getElementById("stat-pue");
    if (el) el.textContent = (1.25 + Math.random() * 0.08).toFixed(2);
  }, 5000);
});
