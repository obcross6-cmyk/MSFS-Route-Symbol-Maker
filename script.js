// 1. INITIALIZE THE MAP
// Centered over the US by default, zoom level 5
const map = L.map('map').setView([39.8283, -98.5795], 5); 

// Use a dark map theme suitable for aviation
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// 2. IMAGE OVERLAY & RESIZING LOGIC
let imageOverlay = null;
let topLeftMarker = null;
let bottomRightMarker = null;
let uploadedImageUrl = null;

// Listen for a file upload
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Read the file and convert it to a URL the map can display
    const reader = new FileReader();
    reader.onload = function(event) {
        uploadedImageUrl = event.target.result;
        placeImageOnMap();
    };
    reader.readAsDataURL(file);
});

function placeImageOnMap() {
    // Clean up old image if one exists
    if (imageOverlay) map.removeLayer(imageOverlay);
    if (topLeftMarker) map.removeLayer(topLeftMarker);
    if (bottomRightMarker) map.removeLayer(bottomRightMarker);

    const center = map.getCenter();
    
    // Set initial bounds (size) for the uploaded image based on map center
    const bounds = [
        [center.lat + 2, center.lng - 3], // Top Left Corner
        [center.lat - 2, center.lng + 3]  // Bottom Right Corner
    ];

    // Add image to map (slightly transparent so you can see map beneath)
    imageOverlay = L.imageOverlay(uploadedImageUrl, bounds, { opacity: 0.5 }).addTo(map);

    // Create draggable markers to resize the image
    topLeftMarker = L.marker(bounds[0], { draggable: true, title: 'Drag to resize' }).addTo(map);
    bottomRightMarker = L.marker(bounds[1], { draggable: true, title: 'Drag to resize' }).addTo(map);

    // Update image size whenever a marker is dragged
    function updateImageBounds() {
        const newBounds = L.latLngBounds(topLeftMarker.getLatLng(), bottomRightMarker.getLatLng());
        imageOverlay.setBounds(newBounds);
    }

    topLeftMarker.on('drag', updateImageBounds);
    bottomRightMarker.on('drag', updateImageBounds);
}


// 3. ROUTE DRAWING LOGIC
let routePoints = [];
const routePolyline = L.polyline([], { color: '#00ff00', weight: 3 }).addTo(map);
const routeMarkers = L.layerGroup().addTo(map);

// Listen for clicks on the map to draw waypoints
map.on('click', function(e) {
    const latlng = e.latlng;
    
    // Add point to our list and draw the line
    routePoints.push(latlng);
    routePolyline.addLatLng(latlng);

    // Place a small dot on the map where clicked
    L.circleMarker(latlng, {
        radius: 4,
        color: '#fff',
        fillColor: '#00ff00',
        fillOpacity: 1
    }).addTo(routeMarkers);

    // Generate the SimBrief coordinates
    updateSimBriefOutput();
});


// 4. SIMBRIEF FORMATTING LOGIC
// Converts standard Lat/Lon (e.g. 51.5, -0.16) into SimBrief format (e.g. 5130N00010W)
function toSimBriefCoord(lat, lng) {
    function formatDegree(deg, isLat) {
        const letter = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
        const absolute = Math.abs(deg);
        const degrees = Math.floor(absolute);
        const minutes = Math.floor((absolute - degrees) * 60);

        // Latitude uses 2 digits for degrees, Longitude uses 3 digits
        const padDeg = isLat ? String(degrees).padStart(2, '0') : String(degrees).padStart(3, '0');
        const padMin = String(minutes).padStart(2, '0');
        
        return padDeg + padMin + letter;
    }
    return formatDegree(lat, true) + formatDegree(lng, false);
}

function updateSimBriefOutput() {
    // Loop through all clicked points, format them, and join them with spaces
    const outputString = routePoints.map(pt => toSimBriefCoord(pt.lat, pt.lng)).join(' ');
    document.getElementById('output').value = outputString;
}


// 5. BUTTON CONTROLS
document.getElementById('clearRoute').addEventListener('click', () => {
    routePoints = [];
    routePolyline.setLatLngs([]);
    routeMarkers.clearLayers();
    document.getElementById('output').value = '';
});

document.getElementById('clearImage').addEventListener('click', () => {
    if (imageOverlay) map.removeLayer(imageOverlay);
    if (topLeftMarker) map.removeLayer(topLeftMarker);
    if (bottomRightMarker) map.removeLayer(bottomRightMarker);
    document.getElementById('imageUpload').value = '';
});

document.getElementById('copyBtn').addEventListener('click', () => {
    const copyText = document.getElementById('output');
    if (copyText.value === '') return;
    
    copyText.select();
    document.execCommand('copy');
    
    // Brief visual feedback on the button
    const btn = document.getElementById('copyBtn');
    btn.innerText = 'Copied!';
    btn.style.backgroundColor = '#00ff00';
    setTimeout(() => {
        btn.innerText = 'Copy to Clipboard';
        btn.style.backgroundColor = '#4da6ff';
    }, 2000);
});
