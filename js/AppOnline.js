/* global ol, $ */

/**
 * Application Online
 *
 * @class
 */
var AppOnline = function() {

    var that = this;
    
    /**
     * @type {string} 
     */
    this.GEO_HOST = 'localhost:8080';

    /**
     *  Reference à l'objet map d'openlayer
     *  @type {ol.Map}
     */
    this.map = undefined;

    /**
     *  Objet contenant la liste des layers openlayers utilisé
     *  @type {Object.<string, ol.layer.Vector>}
     */ 
    this.layers = [];


    // fond osm
    this.layers['osm'] = {
        'layer': new ol.layer.Tile({
            //source: new ol.source.MapQuest({layer: 'osm'})
            source: new ol.source.OSM({
                url: 'http://tile.openstreetmap.org/{z}/{x}/{y}.png'
            }),
            visible: false
        }),
        'order': 2
    };

    // batiments
    this.layers['buildings'] = {
        'layer': new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
                params: {
                    'LAYERS': 'planet_osm_polygon', 
                    'TILED': true
                    //cql_filter : "amenity like 'parking'"
                },

                serverType: 'geoserver'
            }),
            opacity: 0.6
        }),
        'order': 3
    };

    // routes
    this.layers['lines'] = {
        'layer': new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
                params: {
                    'LAYERS': 'planet_osm_line', 
                    'TILED': true
                },

                serverType: 'geoserver'
            })
        }),
        'order': 4
    };

    // chemin resultat dikjstra
    this.layers['vector2'] =  {
        'layer' : new ol.layer.Vector({
            source: new ol.source.Vector({
            })
        }),
        'order': 8
    };

    // 
    this.layers['resultPgRouting'] = {
        'layer' : new ol.layer.Image({
            source: new ol.source.ImageWMS({
                url: 'http://' + that.GEO_HOST + '/geoserver/cite/wms',
                params: {
                    LAYERS: 'cite:routing2',
                    FORMAT: 'image/png'
                }
            })
        }),
        'order': 9
    };


    //
    // Map
    //

    this.map = new ol.Map({
        layers: [],
        target: 'map',
        view: new ol.View({
            center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
            zoom: 15
        })
    });

    this.addAllLayers();

    //var result;
    this.click = 0;

};

/**
 * ??
 */
AppOnline.prototype.getFeaturesFromClick = function(event) {
    
    var viewResolution = (this.map.getView().getResolution());

    var url = this.layers['buildings'].layer.getSource().getGetFeatureInfoUrl(
        event.coordinate, viewResolution, 'EPSG:3857',

        {'INFO_FORMAT': 'text/javascript'}
    );
    
    if (url) {

        if (url) {
            $.ajax({

                url: url,
                dataType: 'jsonp',
                jsonpCallback: 'parseResponse'

            }).then(function(response) {
                /*
                  vectorSource.clear();
                  vectorSource.addFeatures(geojsonFormat.readFeatures(response));
                  console.log(geojsonFormat.readFeatures(response));
                */
            });
        }

    }
};

AppOnline.prototype.getBuildingList = function() {
    var buildings = [{name: 'building1', osm_id: 1}];
    
    console.log('getBuildingList');
    console.log(buildings);

    return buildings;
};

AppOnline.prototype.getServiceList = function() {
    var services = ['building'];

    console.log('getServiceList');
    console.log(services);

    return services;   
};


AppOnline.prototype.actionClearAll = function() {
    console.log('actionClearAll');
    /*
    this.layers['nearest'].layer.getSource().clear();
    this.layers['selected'].layer.getSource().clear();
    this.layers['route'].layer.getSource().clear();
    this.nodeSelected = [];
    this.selectedFeature = undefined;
    */
};


/**
 *  Quand la souris bouge sur la map, pas forcement utile
 */
AppOnline.prototype.actionHover = function(evt) {
    console.log('actionHover');
    //
    return [];
};

/**
 * Action appelé quand on click sur la map pour selectionner un object
 *
 * Cela devrait renvoyer les propriétés d'un feature
 */
AppOnline.prototype.actionSelect = function(evt) {
    console.log('actionSelect');
};

/**
 * Action appelé quand on recherche un batiment / route dans la barre de recherche
 */
AppOnline.prototype.actionGoto = function(object) {
    console.log('actionGoto');
};

/**
 *  Action appelé quand on click sur le bouton des services
 *
 *  Logiquement cela devrait rechercher le service le plus proche de la position courante
 */
AppOnline.prototype.actionPathService = function() {
    console.log('actionPathService');
};

/**
 *  Quand on click sur le bouton "edit".
 *  
 *  
 */
AppOnline.prototype.actionEdit = function() {
    console.log('actionEdit');
    // version mode offline pour exemple d'utilisation

    /*
    var that = this;
    var properties = this.selectedObject.getProperties();
    
    return {
        'object' : {
            'name' : properties['name'],
            'services' : properties['services'] || '',
            'highway' : properties['highway']
        },
        'callback': function(result) {
            result['osm_id'] = properties['osm_id'];
            that.storage.add('edit', result);
            that.updateFeaturesFromStorage(that.layers['roadVectors'].layer.getSource());
        }
    };
    */
};

/**
 *  Quand on click sur la map dans mode "chemin"
 *
 *  Enregistre le premier click et utilise pgRouting pour afficher le plus court chemin
 *  entre les deux points.
 */
AppOnline.prototype.actionPath = function(evt) {

    var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');

    var pointsSrc = this.layers['vector2'].layer.getSource();

    if (this.click == 0 || this.click == 2) {

        this.click = 1;

        pointsSrc.clear();

        //this.layers['resultPgRouting'].layer.getSource().clear();
        //this.map.removeLayer(result);

        pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(evt.coordinate)));

    } else {
        
        this.click = 2;
        
        pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(evt.coordinate)));

        var startCoord = transform(pointsSrc.getFeatures()[0].getGeometry().getCoordinates());
        var destCoord = transform(pointsSrc.getFeatures()[1].getGeometry().getCoordinates());

        var viewparams = [
            'x1:' + startCoord[0], 'y1:' + startCoord[1],
            'x2:' + destCoord[0], 'y2:' + destCoord[1]
        ];

        //params.viewparams = viewparams.join(';');
        
        var p = this.layers['resultPgRouting'].layer.getSource().getParams();
        p.viewparams = viewparams.join(';');
        this.layers['resultPgRouting'].layer.getSource().updateParams(p);
        
    }
};

/**
 *  Ajoute à la map le contenu de this.layers en respectant l'ordre défini par la propriété 'order'
 *  @todo: refaire cette fonction, elle est moche, mais je savais pas cmt faire mieux :(
 */
AppOnline.prototype.addAllLayers = function() {

    this.map.getLayers().clear();

    var tmp = [];

    for (var key in this.layers) {

        if (this.layers.hasOwnProperty(key)) {
            var l = this.layers[key];

            tmp.push(l);
        }

    }

    sortByKey(tmp, 'order');

    for (var ff of tmp) {
        this.map.addLayer(ff.layer);
    }
};

/**
 *  Change la visibilitéé d'un layer
 *  @param {string} name clé du layer défini au moment de ça définition
 *  @param {boolean} value visible ou non
 */
AppOnline.prototype.setVisible = function(name, value) {
    this.layers[name].layer.setVisible(value);
};


function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

/**
 *  @param {Gui}
 */
AppOnline.prototype.setGui = function(gui) {
    this.gui = gui;

    // met à jour la liste des batiments pour le search input
    this.gui.updateBuildingList(this.getBuildingList());

    // met à jour la liste des services (pour le dropdown en bas à gauche)
    this.gui.updateServiceList(this.getServiceList());
    
};


