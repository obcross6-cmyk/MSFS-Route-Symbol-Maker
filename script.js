console.log("DEBUG: script.js has successfully loaded.");

// 1. INITIALIZE THE MAP
console.log("DEBUG: Attempting to initialize Leaflet map...");
const map = L.map('map').setView([39.8283, -98.5795], 5); 

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Force Leaflet to recalculate its size (fixes grey screen bugs)
setTimeout(() => {
    map.invalidateSize();
    console.log("DEBUG: Map size recalculated.");
}, 500);

console.log("DEBUG: Map initialization complete.");

// 2. IMAGE OVERLAY & RESIZING LOGIC
let imageOverlay = null;
let topLeftMarker = null;
let bottomRightMarker = null;
let uploadedImageUrl = null;

const imageUploadInput = document.getElementById('imageUpload');
if(imageUploadInput) {
    imageUploadInput.addEventListener('change', function(e) {
        console.log("DEBUG: Image file selected.");
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImageUrl = event.target.result;
            console.log("DEBUG: Image loaded into memory, placing on map...");
            placeImageOnMap();
        };
        reader.readAsDataURL(file);
    });
} else {
    console.error("ERROR: Could not find imageUpload element in HTML.");
}

function placeImageOnMap() {
    if (imageOverlay) map.removeLayer(imageOverlay);
    if (topLeftMarker) map.removeLayer(topLeftMarker);
    if (bottomRightMarker) map.removeLayer(bottomRightMarker);

    const center = map.getCenter();
    const bounds = [
        [center.lat + 2, center.lng - 3],
        [center.lat - 2, center.lng + 3]
    ];

    imageOverlay = L.imageOverlay(uploadedImageUrl, bounds, { opacity: 0.5 }).addTo(map);

    topLeftMarker = L.marker(bounds[0], { draggable: true, title: 'Drag to resize' }).addTo(map);
    bottomRightMarker = L.marker(bounds[1], { draggable: true, title: 'Drag to resize' }).addTo(map);

    function updateImageBounds() {
        const newBounds = L.latLngBounds(topLeftMarker.getLatLng(), bottomRightMarker.getLatLng());
        imageOverlay.setBounds(newBounds);
        console.log("DEBUG: Image resized.");
    }

    topLeftMarker.on('drag', updateImageBounds);
    bottomRightMarker.on('drag', updateImageBounds);
}

// 3. ROUTE DRAWING LOGIC
let routePoints = [];
const routePolyline = L.polyline([], { color: '#00ff00', weight: 3 }).addTo(map);
const routeMarkers = L.layerGroup().addTo(map);

map.on('click', function(e) {
    const latlng = e.latlng;
    console.log("DEBUG: Map clicked at", latlng.lat, latlng.lng);
    
    routePoints.push(latlng);
    routePolyline.addLatLng(latlng);

    L.circleMarker(latlng, { radius: 4, color: '#fff', fillColor: '#00ff00', fillOpacity: 1 }).addTo(routeMarkers);
    updateSimBriefOutput();
});

// 4. SIMBRIEF FORMATTING LOGIC
function toSimBriefCoord(lat, lng) {
    function formatDegree(deg, isLat) {
        const letter = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
        const absolute = Math.abs(deg);
        const degrees = Math.floor(absolute);
        const minutes = Math.floor((absolute - degrees) * 60);

        const padDeg = isLat ? String(degrees).padStart(2, '0') : String(degrees).padStart(3, '0');
        const padMin = String(minutes).padStart(2, '0');
        
        return padDeg + padMin + letter;
    }
    return formatDegree(lat, true) + formatDegree(lng, false);
}

function updateSimBriefOutput() {
    const outputString = routePoints.map(pt => toSimBriefCoord(pt.lat, pt.lng)).join(' ');
    document.getElementById('output').value = outputString;
}

// 5. BUTTON CONTROLS
document.getElementById('clearRoute').addEventListener('click', () => {
    console.log("DEBUG: Route cleared.");
    routePoints = [];
    routePolyline.setLatLngs([]);
    routeMarkers.clearLayers();
    document.getElementById('output').value = '';
});

document.getElementById('clearImage').addEventListener('click', () => {
    console.log("DEBUG: Image cleared.");
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
    console.log("DEBUG: Coordinates copied to clipboard.");
    
    const btn = document.getElementById('copyBtn');
    btn.innerText = 'Copied!';
    btn.style.backgroundColor = '#00ff00';
    setTimeout(() => {
        btn.innerText = 'Copy to Clipboard';
        btn.style.backgroundColor = '#4da6ff';
    }, 2000);
});
