const utils = require('./utils');
const svg_symbols = require('./svg_symbols');
const select_controls = require('./select_controls');

module.exports = () => {

    let LocationsHeader = utils._createElement({
        tag: 'div',
        style: {
            display: 'none'
        },
        appendTo: document.getElementById('Locations')
    })

    utils._createElement({
        tag: 'div',
        options: {
            textContent: 'Locations',
            className: 'title'
        },
        appendTo: LocationsHeader
    })

    utils._createElement({
        tag: 'div',
        options: {
            textContent: 'Clear all locations.',
            className: 'btn_text cursor'
        },
        appendTo: LocationsHeader,
        eventListener: {
            event: 'click',
            funct: e => {
                resetModule();
            }
        }
    })

    let locations = utils._createElement({
        tag: 'div',
        options: {
            className: 'content'
        },
        appendTo: document.getElementById('Locations')
    });

    // Create select pane. This pane has a shadow filter associated in the css.
    global._xyz.map.createPane('select_display');
    global._xyz.map.getPane('select_display').style.zIndex = 501;
    global._xyz.map.createPane('select');
    global._xyz.map.getPane('select').style.zIndex = 600;
    global._xyz.map.createPane('select_marker');
    global._xyz.map.getPane('select_marker').style.zIndex = 601;
    global._xyz.map.createPane('select_circle');
    global._xyz.map.getPane('select_circle').style.zIndex = 602;

    // Create recordset if it doesn't exist yet.
    if (!global._xyz.select) global._xyz.select = {};
    if (!global._xyz.select.records) global._xyz.select.records = [
        {
          "letter": "A",
          "color": "#9c27b0"
        },
        {
          "letter": "B",
          "color": "#2196f3"
        },
        {
          "letter": "C",
          "color": "#009688"
        },
        {
          "letter": "D",
          "color": "#cddc39"
        },
        {
          "letter": "E",
          "color": "#ff9800"
        },
        {
          "letter": "F",
          "color": "#673ab7"
        },
        {
          "letter": "G",
          "color": "#03a9f4"
        },
        {
          "letter": "H",
          "color": "#4caf50"
        },
        {
          "letter": "I",
          "color": "#ffeb3b"
        },
        {
          "letter": "J",
          "color": "#ff5722"
        },
        {
          "letter": "K",
          "color": "#0d47a1"
        },
        {
          "letter": "L",
          "color": "#00bcd4"
        },
        {
          "letter": "M",
          "color": "#8bc34a"
        },
        {
          "letter": "N",
          "color": "#ffc107"
        },
        {
          "letter": "O",
          "color": "#d32f2f"
        }];
    
    // Set the layer display from hooks if present; Overwrites the default setting.
    if (global._xyz.hooks.select) global._xyz.hooks.select.split(',').forEach(hook => {
        let params = hook.split('!');
        selectLayerFromEndpoint({
            layer: params[1],
            table: params[2],
            id: params[3],
            marker: [params[4].split(';')[0], params[4].split(';')[1]]
        });
    });
    global._xyz.removeHook('select');

    // Reset function for the module container.
    global._xyz.select.resetModule = resetModule;
    function resetModule() {
        LocationsHeader.style.display = 'none';
        locations.innerHTML = '';
        global._xyz.removeHook('select');
        global._xyz.select.records.map(function (record) {
            if (record.location && record.location.L) global._xyz.map.removeLayer(record.location.L);
            if (record.location && record.location.M) global._xyz.map.removeLayer(record.location.M);
            if (record.location && record.location.D) global._xyz.map.removeLayer(record.location.D);
            record.location = null;
        });
        
        // Make select tab active on mobile device.
        if (global._xyz.activateLayersTab) global._xyz.activateLayersTab();
    }

    // Get location from data source
    global._xyz.select.selectLayerFromEndpoint = selectLayerFromEndpoint;
    function selectLayerFromEndpoint(location) {
    
        let freeRecords = global._xyz.select.records.filter(record => !record.location);

        if (freeRecords.length === 0) return;

        // Make select tab active on mobile device.
        if (global._xyz.activateSelectTab) global._xyz.activateSelectTab();

        let layer = global._xyz.locales[global._xyz.locale].layers[location.layer];

        // Prevent crash for select from hook when layer is no accessible to user.
        if (!layer) return

        // infoj fields with a layer definition are queried from the reference layer.
        layer.infoj.forEach(entry => {

            // Create a layer reference for the layer defined in the infoj field.
            if (typeof entry.layer === 'string') {
                entry.layer = {
                    table: global._xyz.locales[global._xyz.locale].layers[entry.layer].table,
                    geom: global._xyz.locales[global._xyz.locale].layers[entry.layer].geom || 'geom',
                    filter: global._xyz.locales[global._xyz.locale].layers[entry.layer].filter || {}
                }
            }
        })
        
        // charts
        setChartData(layer, location);

        let xhr = new XMLHttpRequest();
        xhr.open('GET', global._xyz.host + '/api/location/select?' + utils.paramString({
            locale: _xyz.locale,
            layer: layer.layer,
            table: location.table,
            id: location.id,
            token: global._xyz.token
        }));

        //xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = e => {

            // remove wait cursor class if found
            let els = global._xyz.map.getContainer().querySelectorAll('.leaflet-interactive.wait-cursor-enabled');
            for (let el of els) {
                el.classList.remove("wait-cursor-enabled");
            }
            
            if (e.target.status === 200) {
                let json = JSON.parse(e.target.responseText);
                location.geometry = JSON.parse(json.geomj);
                location.infoj = json.infoj;
                location.editable = layer.editable;
                location.geomdisplay = layer.geomdisplay ? JSON.parse(json.geomdisplay) : null;
                location.dbs = layer.dbs;
                location.qID = layer.qID;
                location.geom = layer.geom;
                addLayerToRecord(location);
            }
        }

        xhr.send();

        // let body = {};
        // if (layer.sql_filter) body.sql_filter = layer.sql_filter;
        // xhr.send(JSON.stringify(body));
    }
    
    function setChartData(layer, location){
        layer.infoj.forEach(entry => {
            if(typeof(entry.chart) == 'string'){
                Object.keys(layer.charts).map(function(chart){
                    let _arr = [];
                    Object.keys(layer.charts[chart]).map(function(item){
                        _arr.push(layer.charts[chart][item].field);
                    });
                    let xhr = new XMLHttpRequest();
                    xhr.open('POST', global._xyz.host + '/api/location/chart?token=' + global._xyz.token);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.onload = function(){
                        if (this.status === 200){
                            
                            Object.keys(layer.charts[chart]).map(function(key){
                                let _field = layer.charts[chart][key].field,
                                    _val = JSON.parse(xhr.responseText)[_field];
                                
                                layer.charts[chart][key].y = _val; 
                            });
                        }
                    };
                    
                    if(_arr) xhr.send(JSON.stringify({
                        dbs: layer.dbs,
                        table: location.table,
                        qID: layer.qID || 'id',
                        id: location.id,
                        series: _arr.join(",")
                    }));
                });
            }
        });
    }

    function addLayerToRecord(location) {

        let freeRecords = global._xyz.select.records.filter(function (record) {
            if (!record.location) return record
        });

        // Set marker coordinates from point geometry.
        if (location.geometry.type === 'Point') location.marker = location.geometry.coordinates;

        LocationsHeader.style.display = 'block';

        if (freeRecords.length > 0) {
            freeRecords[0].location = location;
            if (location.layer) {
                global._xyz.pushHook('select',
                    freeRecords[0].letter + '!' +
                    freeRecords[0].location.layer + '!' +
                    freeRecords[0].location.table + '!' +
                    freeRecords[0].location.id + '!' +
                    freeRecords[0].location.marker[0] + ';' +
                    freeRecords[0].location.marker[1]);
            }

            addRecordToMap(freeRecords[0])
        }
    }
    global._xyz.select.addLayerToRecord = addLayerToRecord;

    function addRecordToMap(record) {
        if (record.location.geomdisplay) {
            record.location.D = L.geoJson(
                {
                    type: 'Feature',
                    geometry: record.location.geomdisplay
                }, {
                    interactive: false,
                    pane: 'select_display',
                    style: {
                        stroke: false,
                        color: record.color,
                        weight: 2,
                        fill: true,
                        fillOpacity: 0.3
                    }
                }).addTo(global._xyz.map);
        }

        if (record.location.marker) {
            record.location.M = L.geoJson(
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: record.location.marker
                    }
                }, {
                    pointToLayer: function (feature, latlng) {
                        return new L.Marker(latlng, {
                            icon: L.icon({
                                iconUrl: svg_symbols.create({
                                    type: "markerLetter",
                                    style: {
                                        color: record.color,
                                        letter: record.letter
                                    }
                                }),
                                iconSize: [40, 40],
                                iconAnchor: [20, 40]
                            }),
                            interactive: false,
                            pane: 'select_marker'
                        });
                    }
                }).addTo(global._xyz.map);
        }

        record.location.L = L.geoJson(
            {
                type: 'Feature',
                geometry: record.location.geometry
            }, {
                interactive: false,
                pane: 'select',
                style: {
                    stroke: true,
                    color: record.color,
                    fill: true,
                    fillOpacity: 0
                },
                pointToLayer: function (feature, latlng) {
                    return L.marker(
                        latlng,
                        {
                            icon: L.icon({
                                iconSize: 35,
                                iconUrl: svg_symbols.create({
                                    type: "circle",
                                    style: {
                                        color: record.color
                                    }
                                })
                            }),
                            pane: 'select_circle',
                            interactive: global._xyz.select ? true : false,
                            draggable: record.location.editable
                        });
                }
            }).addTo(global._xyz.map);
       
        record.location.L.getLayers()[0].on('dragend', function (e) {
            record.upload.style.display = 'block';
        });

        addRecordToList(record);
    }

    function addRecordToList(record) {

        Object.values(locations.children).forEach(loc => utils.removeClass(loc, 'expanded'));

        // Create drawer element to contain the header with controls and the infoj table with inputs.
        record.drawer = utils.createElement('div', {
            className: 'drawer expandable expanded'
        });

        // Create the header element to contain the control elements
        record.header = utils._createElement({
            tag: 'div',
            options: {
                textContent: record.letter,
                className: 'header pane_shadow'
            },
            style: {
                borderBottom: '2px solid ' + record.color
            },
            appendTo: record.drawer,
            eventListener: {
                event: 'click',
                funct: () => {
                    utils.toggleExpanderParent({
                        expandable: record.drawer,
                        accordeon: true,
                        scrolly: document.querySelector('.mod_container > .scrolly')
                    });
                }
            }
        });

        // Create the clear control element to control the removal of a feature from the select.layers.
        select_controls.clear(record);
        
        // Create copy to clipboard element
        select_controls.clipboard(record);

        // Create the zoom control element which zoom the map to the bounds of the feature.
        select_controls.zoom(record);

        // Create control to toggle marker.
        select_controls.marker(record);
        
        // Create the expand control element which controls whether the data table is displayed for the feature.
        select_controls.expander(record);

        // Create control to update editable items.
        if (record.location.editable) select_controls.update(record);

        // Create control to trash editable items.
        if (record.location.editable) select_controls.trash(record);

        // Add header element to the drawer.
        record.drawer.appendChild(record.header);

        // Add create and append infoj table to drawer.
        record.drawer.appendChild(require('./select_table').addInfojToList(record));

        // Find free space and insert record.
        let freeRecords = global._xyz.select.records.filter(function (record) {
            if (!record.location) return record
        });
        let idx = global._xyz.select.records.indexOf(record);
        locations.insertBefore(record.drawer, locations.children[idx]);

        if (global._xyz.view_mode === 'desktop') setTimeout(() => {
            let el = document.querySelector('.mod_container > .scrolly');
            el.scrollTop = el.clientHeight;
        }, 500);

        // Make select tab active on mobile device.
        if (global._xyz.activateLocationsTab) global._xyz.activateLocationsTab();
    }
}