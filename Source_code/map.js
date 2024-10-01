//Elements that make up the popup.

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');


//Create an overlay to anchor the popup to the map.

const overlay = new ol.Overlay({
    element: container,
    autoPan: {
        animation: {
            duration: 250,
        },
    },
});

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

// Define your GeoServer WMS URL and layer name
const wmsUrl = 'http://localhost:8080/geoserver/NASCENT/wms';
const airports = 'NASCENT:indian_airports';
const ports = 'NASCENT:indian_ports';
const boundary = 'NASCENT:india_state_boundary'


// Create a map
const map = new ol.Map({
    overlays: [overlay],
    target: 'map',
    view: new ol.View({
        center: [80.15612801422381, 22.834013206372617], // Set to your desired coordinates
        projection: 'EPSG:4326',
        zoom: 5.4 // Adjust zoom level
    })
});

// Base layer
var OSMbaseLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
});

var NElayer = new ol.layer.Tile({
    source: new ol.source.TileWMS({
        url: 'http://localhost:8080/geoserver/NASCENT/wms',
        params: {
            'LAYERS': 'NASCENT:natural_earth',
            'FORMAT': 'image/png'
        }
    })
});

const googleLayer = new ol.layer.Tile({
    visible: false,
    name: 'google',
    source: new ol.source.XYZ({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',


    })
});

var stateBoundary = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: wmsUrl + '?service=WFS&version=1.0.0&request=GetFeature&typeName=' + boundary + '&outputFormat=application/json',
        format: new ol.format.GeoJSON()
    }),
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 0, 0)' // transparent fill
        }),
        stroke: new ol.style.Stroke({
            color: 'black', // black boundary
            width: 2
        })
    }),
    visible: false
});

var airportLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: wmsUrl + '?service=WFS&version=1.0.0&request=GetFeature&typeName=' + airports + '&outputFormat=application/json',
        format: new ol.format.GeoJSON()
    }),
    style: new ol.style.Style({
        image: new ol.style.Icon({
            src: './icon.png', // Path to your custom PNG file
            scale: 0.1 // Adjust scale as needed
        })
    }),
    visible: false
});

var riverLayersource = new ol.source.TileWMS({
    url: "http://localhost:8080/geoserver/NASCENT/wms/",
    params: {
        LAYERS: 'NASCENT:indian_rivers',
        TILED: true
    }

});

var riverLayer = new ol.layer.Tile({
    source: riverLayersource,
    visible: false
});

var portsLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
        url: wmsUrl + '?service=WFS&version=1.0.0&request=GetFeature&typeName=' + ports + '&outputFormat=application/json',
        format: new ol.format.GeoJSON()
    }),
    style: new ol.style.Style({
        image: new ol.style.Icon({
            src: './port.png', // Path to your custom PNG file
            scale: 0.06 // Adjust scale as needed
        })
    }),
    visible: false
});

map.addLayer(googleLayer);
map.addLayer(NElayer);
map.addLayer(OSMbaseLayer);
map.addLayer(airportLayer);
map.addLayer(portsLayer);
map.addLayer(riverLayer);
map.addLayer(stateBoundary);

// Event listener for radio buttons of Basemap
const basemap_radios = document.querySelectorAll('.radio-item input[type="radio"]');
basemap_radios.forEach((radio) => {
    radio.addEventListener('change', function () {
        const layerName = radio.value;
        // Hide all layers initially
        OSMbaseLayer.setVisible(false);
        NElayer.setVisible(false);
        googleLayer.setVisible(false);

        switch (layerName) {
            case 'Google':
                googleLayer.setVisible(true);
                break;
            case 'osm':
                // Assuming you have an osmLayer variable
                OSMbaseLayer.setVisible(true);
                break;
            case 'Natural_earth':
                // Assuming you have a naturalEarthLayer variable
                NElayer.setVisible(true);
                break;
        }
    });
});

// Set the OSM radio button as default
const osmRadio = document.querySelector('.radio-item input[value="osm"]');
osmRadio.checked = true; 
// Make OSM layer visible by default
OSMbaseLayer.setVisible(true);

// Event listener for checkboxes of Data layer
const checkboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', function () {
        const layerName = checkbox.value;
        switch (layerName) {
            case 'NASCENT:india_state_boundary':
                stateBoundary.setVisible(checkbox.checked);
                break;
            case 'NASCENT:indian_airports':
                airportLayer.setVisible(checkbox.checked);
                break;
            case 'NASCENT:indian_rivers':
                riverLayer.setVisible(checkbox.checked);
                break;
            case 'NASCENT:indian_ports':
                portsLayer.setVisible(checkbox.checked);
                break;
        }
    });
});

// Data Popup
map.on('click', function (evt) {
    let featureFound = false;
    let featureName = '';
    let featureType = '';
    let featureProperties = '';

    map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        // Determine the type of feature based on the layer
        if (layer === airportLayer) {
            featureType = 'Airports';
            featureProperties = feature.getProperties(); // Get all properties
        } else if (layer === portsLayer) {
            featureType = 'Ports';
            featureProperties = feature.getProperties(); // Get all properties
        } else if (layer === stateBoundary) {
            featureType = 'State Boundary';
            featureProperties = feature.getProperties(); // Get all properties
        }

        // If a feature is found, update the popup content and position
        if (featureType) {
            let propertiesHtml = '';
            for (let prop in featureProperties) {
                propertiesHtml += `<b>${prop}:</b> ${featureProperties[prop]}<br>`;
            }
            content.innerHTML = `<b>${featureType} Properties:</b><br>${propertiesHtml}`;
            // Instead of setting the position directly, use offset to keep it at the click location
            overlay.setPosition(evt.coordinate); 
            featureFound = true;
        }
    });

    //If no feature is found, attempt to retrieve feature information from the WMS source
    if (!featureFound) {
        var wmsSource = riverLayer.getSource();
        var url = wmsSource.getFeatureInfoUrl(
            evt.coordinate,
            map.getView().getResolution(),
            'EPSG:3857',
            { 'INFO_FORMAT': 'application/json' }
        );
        // console.log(url);
        if (url) {
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    var featureProperties = data.features[0].properties;
                    let propertiesHtml = '';
                    for (let prop in featureProperties) {
                        propertiesHtml += `<b>${prop}:</b> ${featureProperties[prop]}<br>`;
                    }
                    content.innerHTML = propertiesHtml;
                    overlay.setPosition(evt.coordinate);
                })
                .catch(err => console.error(err));
        } else {
            console.error('Failed to retrieve feature information URL');
        }
    }
});

map.on('singleclick', function (evt) {
    var wmsSource = riverLayer.getSource();
    var url = wmsSource.getFeatureInfoUrl(
        evt.coordinate,
        map.getView().getResolution(),
        'EPSG:4326',
        { 'INFO_FORMAT': 'application/json' }
    );
    if (url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                var featureProperties = data.features[0].properties;
                var contentHtml = '';
                for (var prop in featureProperties) {
                    contentHtml += `<b>${prop} : </b>${featureProperties[prop]}<br>`;
                }
                content.innerHTML = contentHtml;
                overlay.setPosition(evt.coordinate);
                flag_point_found = true
            })
            .catch(err => console.log(err));
    }
});

// document.addEventListener('DOMContentLoaded', function() {
//     // Select the legend div and the toggle button
//     const legendDiv = document.querySelector('.legend');
//     const toggleButton = document.getElementById('toggleLegendButton');

//     // Function to toggle the visibility of the legend
//     function toggleLegendVisibility() {
//         // Check if the legend is currently visible
//         const isVisible = legendDiv.style.display !== 'none';

//         // Toggle the display style of the legend
//         legendDiv.style.display = isVisible ? 'none' : '';

//         // Update the button text to reflect the new state
//         toggleButton.textContent = isVisible ? 'Show Legend' : 'Hide Legend';
//     }

//     // Add click event listener to the toggle button
//     toggleButton.addEventListener('click', toggleLegendVisibility);

// });

document.addEventListener('DOMContentLoaded', function() {
    // Select the legend div and the toggle button
    const legendDiv = document.querySelector('.legend');
    const toggleButton = document.getElementById('toggleLegendButton');

    // Function to toggle the visibility of the legend
    function toggleLegendVisibility() {
        // Toggle the display style of the legend between 'none' and ''
        legendDiv.style.display = legendDiv.style.display === 'none' ? '' : 'none';

        // Update the button text to reflect the new state
        toggleButton.textContent = legendDiv.style.display === 'none' ? 'Show Legend' : 'Hide Legend';
    }

    // Add click event listener to the toggle button
    toggleButton.addEventListener('click', toggleLegendVisibility);
});
