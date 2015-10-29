/* global ol, Routing, MyStorage, $ */

const PHP_ROOT = 'http://localhost/geo/php/';

/**
 * Application Offline
 *
 * @class
 */
var AppOffline = function () {

    var that = this;

    //
    // Public Variables
    //

    /**
     *  Reference à l'objet map d'openlayer
     *  @type {ol.Map}
     */
    this.map = undefined;

    /**
     *  Reference à l'objet Gui
     *  @type {Gui}
     */
    this.gui = undefined;

    /**
     *  Objet contenant la liste des layers openlayers utilisé
     *  @type {Object.<string, ol.layer.Vector>}
     */
    this.layers = [];

    /**
     *  Array contenant la liste des styles généré par la methode initStyles
     *  @type {Object.<string, ol.style.Style>}
     */
    this.styles = [];

    /**
     *  Class contenant le graphe des routes et l'implémentation de dijkstra
     *  @ŧype {Routing}
     */
    this.routing = undefined;

    /**
     *  @type {Object.<string, Array.<ol.Features>>}
     */
    this.cache = [];

    /**
     *  @type {ol.ProjectionLike}
     */
    this.to3857 = {'dataProjection': 'EPSG:4326', 'featureProjection': 'EPSG:3857'},

    /**
     *  Reference vers la base de donnée local, permet d'enregistré les modifications en attendant
     *  de pouvoir les envoyer vers postgis
     *  @type {MyStorage}
     */
    this.storage = new MyStorage();

    /**
     *
     */
    this.selectedFeature = undefined;


    this.pointsClicked = [];
    
    //
    // Style
    //

    /**
     *  @type {string}
     *  @default
     */
    this.COLOR1 = '#E86FB0';

    /**
     *  @type {string}
     *  @default
     */
    this.COLOR2 = '#A8FFC7';

    /**
     *  @type {string}
     *  @default
     */
    this.COLOR3 = '#A8FFC7';

    /**
     *  @type {string}
     *  @default
     */
    this.GREY1 = '#CECECE';

    /**
     *  @type {string}
     *  @default
     */
    this.ROAD_FOOT = '#D19B9B';

    /**
     *  @type {string}
     *  @default
     */
    this.ROAD_CYCLE = '#93CF98';

    /**
     *  @type {string}
     *  @default
     */
    this.ROAD_BORDER = '#737373';

    /**
     *  @type {string}
     *  @default
     */
    this.ROAD_TRAM = '#FFFBBF';

    /**
     *  @type {string}
     *  @default
     */
    this.ROAD_PRIMARY = '#FAD9B6';
    
    /**
     * Fonction de gestion des styles pour les routes.
     */
    var styleFunctionRoads = function (feature) {

        var s = [];

        var primary = {'primary': 1, 'secondary': 1, 'primary_link': 1, 'secondary_link': 1, 'tertiary_link' : 1, 'trunk': 1, 'trunk_link': 1, 'tertiary': 1};

        var tertiary = {'service': 1};

        var tram = {'tram': 1};

        var foot = {'footway': 1, 'path': 1, 'steps': 1};

        var cycle = {'cycleway': 1};

        var highway = feature.get('highway');
        var railway = feature.get('railway');

        if (highway in foot) {

            s = s.concat(that.styles['road_footway']);

        } else if (highway in cycle) {

            s = s.concat(that.styles['road_cycleway']);

        } else if (railway in tram) {

            s = s.concat(that.styles['road_tram']);

        } else if (highway in primary) {

            s = s.concat(that.styles['road_primary']);

        } else if (highway in tertiary) {

            s = s.concat(that.styles['road_tertiary']);

        } else {
            
            s = s.concat(that.styles['road_normal']);
            
        }
        /*
          if (feature.get('oneway') == 'yes') {
          s = s.concat(that.styles['road_oneway']);
          }
        */
        return s;

    };
    
    /**
     * Fonction de gestion des styles pour les batiments.
     */
    var styleFunctionBuildings = function (feature) {

        var s = [];

        if (feature.get('wood') !== undefined || feature.get('landuse') == 'forest' || feature.get('natural') == 'wood' || feature.get('leisure') == 'park') {

            s = s.concat(that.styles['wood']);

        } else if (feature.get('landuse') == 'grass' || feature.get('leisure') == 'common') {

            s = s.concat(that.styles['grass']);
            
        } else if (feature.get('landuse') == 'basin') {

            s = s.concat(that.styles['water']);

        } else if (feature.get('building') !== undefined) {

            s = s.concat(that.styles['building']);

        } else if (feature.get('amenity') == 'parking') {

            s = s.concat(that.styles['parking']);
            
        }

        return s;

    };

    //
    // Map Def
    //

    this.map = new ol.Map({
        layers: [],
        target: 'map',
        view: new ol.View({
            center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
            zoom: 15,
            minZoom: 14,
            maxZoom: 19
        })
    });

    //
    // Sources & Layers
    //

    this.layers['roadVectors'] = {
        'layer': new ol.layer.Vector({
            title: 'Roads Vector Layer',
            source: new ol.source.Vector({
                url: 'ressources/lines.geojson',
                format: new ol.format.GeoJSON({'defaultDataProjection': 'EPSG:3785'})
            }),
            style: styleFunctionRoads
        }),
        'order': 10
    };

    this.layers['buildingsVectors'] = {
        'layer': new ol.layer.Vector({
            title: 'Building Vector Layer',
            source: new ol.source.Vector({
                url: 'ressources/polygons.geojson',
                format: new ol.format.GeoJSON({'defaultDataProjection': 'EPSG:3785'})
            }),
            style: styleFunctionBuildings
        }),
        'order': 9
    };
    
    // callback pour buildings.json
    var key1 = this.layers['buildingsVectors'].layer.getSource().on('change', function() {

        var source = that.layers['buildingsVectors'].layer.getSource();

        if (source.getState() == 'ready') {

            source.unByKey(key1);

            // met à jour la liste des batiments dans le menu
            that.gui.updateBuildingList(that.getBuildingList());

            // met à jour les features de la source si il y a des modifs en localStorage
            that.updateFeaturesFromStorage(source);
        }
    });

    // callback pour lines.json
    var key2 = this.layers['roadVectors'].layer.getSource().on('change', function() {

        var source = that.layers['roadVectors'].layer.getSource();

        if (source.getState() == 'ready') {

            source.unByKey(key2);

            // met à jour les features de la source si il y a des modifs en localStorage
            that.updateFeaturesFromStorage(source);

        }

    });

    this.initStyles();

    this.layers['nodes'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector([]),
            title: 'Nodes Layer',
            visible: false
        }),
        'order': 75
    };

    this.layers['nearest'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector([]),
            title: 'Nearest Layer',
            visible: true
        }),
        'order': 99
    };

    this.layers['route'] = {
        'layer': new ol.layer.Vector({
            source:  new ol.source.Vector([]),
            style: that.styles['nodeAndRouteSelected'],
            title: 'Route Layer'
        }),
        'order': 97
    };

    this.layers['hover'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector([]),
            style: that.styles['nodeSelected'],
            title: 'Hover Layer'
        }),
        'order': 100
    };

    this.layers['selected'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector([]),
            style: that.styles['nodeSelected'],
            title: 'Selected Layer'
        }),
        'order': 98
    };

    this.layers['streetNamesGS'] = {
        'layer': new ol.layer.Tile({
            source: new ol.source.OSM({
                url: 'ressources/tiles/streetNames-XYZ-format/{z}_{x}_{y}.png'
            }),
            visible: true,
            title: 'OSM Layer Names'
        }),
        'order': 20
    };

    this.layers['osm'] = {
        'layer': new ol.layer.Tile({
            source: new ol.source.MapQuest({layer: 'osm'}),
            visible: false
        }),
        'order': 2
    };
    
    this.addAllLayers();

    //
    // Routing
    //

    this.routing = new Routing(this);

    this.routing.init('ressources/routing.json').then(function() {

        // Met les noeuds du graphe de routing dans le layer 'nodes'
        that.displayPoints(that.layers['nodes'].layer.getSource(), that.routing.geomNodes);

    });

    //
    // Events
    //

    /**
     * Si il y a une erreur lors du chargement d'une des tiles (elle existe surement pas)
     */
    this.layers['streetNamesGS'].layer.getSource().on('tileloaderror', function(event) {

        var self = this;

        // Coordonnées de la tile en question
        var z = event.tile.getTileCoord()[0];
        var x = event.tile.getTileCoord()[1];
        var y = event.tile.getTileCoord()[2];

        // On dit à php d'aller telecharger cette tile
        $.get(PHP_ROOT + 'geoWebCache.php?z=' + z + '&x=' + x + '&y=' + y, function() {
            self.changed();
        });

    });
    
    /**
     *  Mise à jour de la map quand on press 'enter'.
     *  (c'est utile (pour le moment) pour voir si le 'tileloaderror' à bien fonctionné)
     */
    $(document).keypress(function(e) {
        if (e.which == 13) {

            var s1 = that.layers['streetNamesGS'].layer.getSource();

            that.map.updateSize();
            s1.changed();
            s1.setTileUrlFunction(s1.getTileUrlFunction());
            
        }
    });

    this.nodeSelected = [];

    /*
      Change la couleur des noeuds au passage de la souris
      &
      Affichage des infos sur les differents objets
    */
    this.map.on('pointermove', function(evt) {
        /*
        var t = true, nbFeatures = 0;

        var sourceHover = that.layers['hover'].layer.getSource();

        sourceHover.clear();

        that.gui.clearHoverBox();

        that.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
            
            nbFeatures += 1;

            that.gui.addToHoverBox(feature.getProperties(), layer.get('title')); 
            
            if (t && layer.get('title') == 'Nodes Layer') {

                t = false;

                sourceHover.addFeature(feature);

            }
            
        });

        if (nbFeatures > 0) {
            
            that.gui.setHoverBoxPosition(evt.pixel);

        }
        */
    });

    /*
      Click Droit
    */
    this.map.getViewport().addEventListener('contextmenu', function (e) {

        e.preventDefault();

       
    });
};

AppOffline.prototype.actionClearAll = function() {
    this.layers['nearest'].layer.getSource().clear();
    this.layers['selected'].layer.getSource().clear();
    this.layers['route'].layer.getSource().clear();
    this.nodeSelected = [];
    this.selectedFeature = undefined;
};


/**
 *  Quand la souris bouge sur la map
 */
AppOffline.prototype.actionHover = function(evt) {

    var that = this, t = true, nbFeatures = 0;

    var sourceHover = that.layers['hover'].layer.getSource();

    sourceHover.clear();

    var infos = [];
    
    that.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        
        nbFeatures += 1;

        infos.push({'layerName': layer.get('title'), 'properties': feature.getProperties()});
        
        if (t && layer.get('title') == 'Nodes Layer') {

            t = false;

            sourceHover.addFeature(feature);

        }
        
    });

    return infos;
};

/**
 *
 */
AppOffline.prototype.actionSelect = function(evt) {

    var that = this;
    
    return that.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        
        if (layer.get('title') == 'Building Vector Layer' || layer.get('title') == 'Roads Vector Layer') {

            that.selectedFeature = feature;

            that.layers['nearest'].layer.getSource().clear();
            that.layers['nearest'].layer.getSource().addFeature(feature);
            
            return feature.getProperties();

        }
        
    });
    /*
    var feature = this.layers['roadVectors'].layer.getSource().getClosestFeatureToCoordinate(evt.coordinate);

    
    this.selectedFeature = feature;

    this.nodeSelected = [];
    
    this.layers['nearest'].layer.getSource().clear();
    this.layers['nearest'].layer.getSource().addFeature(feature);

    return feature.getProperties();
    */
};

/**
 *  Cherche le parking le plus proche du noeud actuelement selectionné ou de notre pos courante
 */
AppOffline.prototype.actionParking = function() {
    // if pos courante ??
    // ...

    var that = this;

    if (this.pointsClicked[0]) {


        var feature1 = that.getClosestParking(this.pointsClicked[0]);
        that.layers['nearest'].layer.getSource().addFeature(feature1);
        /*
        that.layers['nearest'].layer.getSource().clear();

        var feature1 = that.getClosestParking(that.map.getEventCoordinate(e));

        var feature2 = that.getClosestRoad(that.map.getEventCoordinate(e));

        var new_node = feature2.getGeometry().getClosestPoint(that.map.getEventCoordinate(e));

        that.layers['nearest'].layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(new_node)));

        var edge = that.routing.osmFeatureToEdge(feature2, new_node);


        that.storage.add('edit', {'osm_id' : feature2.getId(), 'highway': 'secondary'});

        that.updateFeaturesFromStorage(that.layers['roadVectors'].layer.getSource());


        var edges = that.routing.splitEdge(new_node, edge);

        var edge1 = (new ol.format.WKT()).readFeature(edges[0][2], that.to3857);
        var edge2 = (new ol.format.WKT()).readFeature(edges[1][2], that.to3857);

        that.layers['nearest'].layer.getSource().addFeature(edge1);
        that.layers['nearest'].layer.getSource().addFeature(edge2);
        */
    }
};

AppOffline.prototype.actionEdit = function() {

    var that = this;
    var properties = this.selectedFeature.getProperties();
    
    return {
        'object' : {
            'name' : properties['name'],
            'highway' : properties['highway'],
            'services' : properties['services'] || []
        },
        'callback': function(result) {
            result['osm_id'] = properties['osm_id'];
            that.storage.add('edit', result);
            that.updateFeaturesFromStorage(that.layers['roadVectors'].layer.getSource());
        }
    };
};


AppOffline.prototype.splitClosestRoad = function(coord) {

    // On récupére la route la plus proche des coordonnées.
    var road = this.getClosestRoad(coord);

    // On récupére le point de la route le plus proche de nos coords.
    var point = road.getGeometry().getClosestPoint(coord);

    // 'road' est une route OpenLayers/OSM. Dans le graphe de routage, les
    // routes sont séparé à chaque intersections, il faut donc trouver le segment
    // préci sur lequel notre point se trouve, pas seulement la route.
    // Une fois ce  segment trouvé, il faut le séparé en deux routes pour pouvoir
    // les ajouter au graphe.

    // edges contient deux sous-routes
    var edges = this.routing.splitEdge(road, point);
    
    return edges;
};

AppOffline.prototype.getServiceList = function() {
    return ['parking', 'service1', 'service2', 'service3'];
};

/**
 *
 */
AppOffline.prototype.actionPath = function(evt) {

    var sourceSelected = this.layers['selected'].layer.getSource();
    var sourceRoute = this.layers['route'].layer.getSource();

    // clear les données si on a déjà afficher un chemin
    if (this.pointsClicked.length >= 2) {
        this.pointsClicked = [];
        sourceSelected.clear();
        sourceRoute.clear();
    }

    this.pointsClicked.push(evt.coordinate);

    sourceSelected.addFeature((new ol.Feature(new ol.geom.Point(evt.coordinate))));
    
    // si on était à 1, on affiche le chemin
    if (this.pointsClicked.length >= 2) {

        // Sépare la route la plus proche en deux, pour pouvoir les utiliser dans le graphe.
        var e1 = this.splitClosestRoad(this.pointsClicked[0]);
        var e2 = this.splitClosestRoad(this.pointsClicked[1]);

        // On relie le points de depart et le point d'arrivé avec nos nouveaux points
        var e3 = this.routing.linkNodeToEdge(this.pointsClicked[0], e1[0]);
        var e4 = this.routing.linkNodeToEdge(this.pointsClicked[1], e2[0]);

        // On les ajoute dans le graphe (temporairement)
        this.routing.add([e3, e4, e1[0], e1[1], e2[0], e2[1]]);

        // Algorithme du plus court chemin 
        var route = this.routing.dijkstra(e3.source, e4.source);

        // Conversion de la route en type ol.Feature de OpenLayers.
        var routeFeatures = this.routing.getGeometryFromRoute(route);

        // Affichage
        sourceRoute.addFeatures(routeFeatures);

        // On retire nos routes temporaire du graphe.
        this.routing.remove(e1[0].source);
        this.routing.remove(e2[0].source);
        this.routing.remove(e3.source);
        this.routing.remove(e4.source);
    }
};

/**
 *
 *
 */
AppOffline.prototype.actionPathService = function(service) {

    if ($.inArray(service, this.getServiceList()) == -1) {
        return null;
    }

    if (service == 'parking') {

        return this.actionParking();

    } else {

        // @todo

    }
};

/**
 *  @param {ol.coordinate} coord
 *  @returns {Object} route le plus proche de coord
 */
AppOffline.prototype.getClosestRoad = function(coord) {

    var min = Infinity;
    var minR = undefined;

    for (var p of this.getRoadList()) {

        var v = p.getGeometry().getClosestPoint(coord);

        var dist = (new ol.geom.LineString([v, coord])).getLength();

        if (dist <= min && this.routing.isRouting[p.get('osm_id')] === true) {
            min = dist;
            minR = p;
        }
    }
    
    return minR;
    
};

/**
 *  @param {ol.coordinate} coord
 *  @returns {Object} parking le plus proche de coord
 */
AppOffline.prototype.getClosestParking = function(coord) {

    var min = Infinity;
    var minP = undefined;

    for (var p of this.getParkingList()) {

        var v = p.getGeometry().getClosestPoint(coord);

        var dist = (new ol.geom.LineString([v, coord])).getLength();

        if (dist <= min) {
            min = dist;
            minP = p;
        }
    }
    
    return minP;
};

/**
 *  @returns {Array.<ol.Feature>} liste des routes
 */
AppOffline.prototype.getRoadList = function() {

    var roads = [];

    var that = this;

    if (this.cache['roads'] === undefined) {

        this.cache['roads'] = [];

        var source = this.layers['roadVectors'].layer.getSource();

        source.forEachFeature(function(f) {

            if (f.getGeometry().getType() == 'LineString') {

                that.cache['roads'].push(f);

            }
        });

    }
    
    roads = this.cache['roads'];

    return roads;
    
};

/**
 *  @returns {Array.<ol.Feature>} liste des parkings
 */
AppOffline.prototype.getParkingList = function() {

    var parkings = [];

    var that = this;

    var source = this.layers['buildingsVectors'].layer.getSource();
    
    if (this.cache['parkings'] === undefined) {

        this.cache['parkings'] = [];

        source.forEachFeature(function(f) {

            if (f.get('amenity') == 'parking') {

                that.cache['parkings'].push(f);

            }
        });

    }
    
    parkings = this.cache['parkings'];

    return parkings;    
};

/**
 *  Ajoute à la map le contenu de this.layers en respectant l'ordre défini par la propriété 'order'
 *
 *  @todo: refaire cette fonction, elle est moche, mais je savais pas cmt faire mieux :(
 */
AppOffline.prototype.addAllLayers = function() {

    this.map.getLayers().clear();

    var tmp = [];

    for (var key in this.layers) {

        if (this.layers.hasOwnProperty(key)) {
            var l = this.layers[key];

            tmp.push(l);
        }

    }

    sortByKey(tmp, 'order');

    for (var i of tmp) {
        this.map.addLayer(i.layer);
    }
};


/**
 *  Change la visibilitéé d'un layer
 *
 *  @param {string} name clé du layer défini au moment de ça définition
 *  @param {boolean} value visible ou non
 */
AppOffline.prototype.setVisible = function(name, value) {
    this.layers[name].layer.setVisible(value);
};

/**
 *  Vide la source et y ajoute la série de points contenu dans data
 *
 *  @param {ol.source.Vector} source source où afficher les points
 *  @param {Array.<Array.<Number>>} data array contenant la liste des points
 */
AppOffline.prototype.displayPoints = function(source, data) {

    source.clear();

    for (var f in data) {

        source.addFeature(new ol.Feature({
            'geometry': new ol.geom.Point(
                ol.proj.transform([data[f][0], data[f][1]], 'EPSG:4326', 'EPSG:3857')),
            'id': parseInt(f)
        }));
    }
};

/**
 *  Retourne la liste des batiments
 *  @returns {Array.<Object>} liste des batiments
 */
AppOffline.prototype.getBuildingList = function() {

    var buildings = [];

    var source = this.layers['buildingsVectors'].layer.getSource();
    
    source.forEachFeature(function(f) {

        if (f.get('building') != undefined) {
            buildings.push(f.getProperties());
        }

    });

    return buildings;
    
};

/**
 *  Met à jour la liste des features en fonction de ce qu'il y a en local storage
 * 
 *  @param {ol.source.Vector} source source to update
 *  @returns {Number} nombre de features mis à jour
 */
AppOffline.prototype.updateFeaturesFromStorage = function(source) {
    
    var featuresToEdit = this.storage.get('edit');

    if (!featuresToEdit) {
        return 0;
    }
    
    if (!(featuresToEdit instanceof Array)) {
        featuresToEdit = [featuresToEdit];
    }

    for (var f of featuresToEdit) {

        var feature = source.getFeatureById(f['osm_id']);

        if (feature) {
            for (var property in f) {
                feature.set(property, f[property]);
            }
        }
    }
};

/**
 *
 */
AppOffline.prototype.initStyles = function() {

    var that = this;

    this.styles['building'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'white'
        }),
        stroke: new ol.style.Stroke({
            color: that.COLOR1,
            width: 1
        }),
        opacity: 0.8
    });

    this.styles['parking'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: that.GREY1
        }),
        stroke: new ol.style.Stroke({
            color: that.COLOR2,
            width: 1
        }),
        opacity: 0.8
    });

    this.styles['grass'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: '#CCF5BF'
        }),
        zIndex: -10
    });

    this.styles['wood'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: '#A1D490'
        }),
        zIndex: -9
    });

    this.styles['water'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: '#BFE7F5'
        })
    });

    this.styles['road_footway'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: that.ROAD_FOOT,
            width: 1,
            lineDash: [4, 4]
        })
    });

    this.styles['road_primary'] = [
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: that.ROAD_BORDER,
                width: 5
            }),
            zIndex: 9
        }),
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: that.ROAD_PRIMARY,
                width: 4
            }),
            zIndex: 10
        })
    ];

    this.styles['road_tertiary'] =[
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: that.ROAD_BORDER,
                width: 3
            }),
            zIndex: 9
        }),
        new ol.style.Style({
            
            stroke: new ol.style.Stroke({
                color: 'white',
                width: 2
            }),
            zIndex: 10
        })
    ];


    this.styles['road_cycleway'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: that.ROAD_CYCLE,
            width: 2,
            lineDash: [4, 4]
        })
    });

    this.styles['road_oneway'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'red',
            width: 1
        }),
        zIndex: 15
    });

    this.styles['road_normal'] = [

        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: that.ROAD_BORDER,
                width: 5
            }),
            zIndex: 9
        }),
        new ol.style.Style({
            
            stroke: new ol.style.Stroke({
                color: 'white',
                width: 4
            }),
            zIndex: 10
        })
    ];

    this.styles['road_tram'] = [
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: that.ROAD_BORDER,
                width: 5
            }),
            zIndex: 19
        }),
        new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: that.ROAD_TRAM,
                width: 4
            }),
            zIndex: 20
        })
    ];
    

    this.styles['hidden'] = new ol.style.Style({
        display: 'none'
    });

    this.styles['nodeSelected'] = new ol.style.Style({
        image: new ol.style.Circle({
            fill: new ol.style.Fill({
                color: that.GREY1
            }),
            stroke: new ol.style.Stroke({
                color: that.COLOR1,
                width: 2
            }),
            radius: 5
        })
    });

    this.styles['nodeAndRouteSelected'] = new ol.style.Style({
        image: new ol.style.Circle({
            fill: new ol.style.Fill({
                color: that.GREY1
            }),
            stroke: new ol.style.Stroke({
                color: that.COLOR1,
                width: 2
            }),
            radius: 5
        }),
        stroke: new ol.style.Stroke({
            color: that.COLOR1,
            width: 4
        })
    });

};

/**
 *  @param {Gui}
 */
AppOffline.prototype.setGui = function(gui) {
    this.gui = gui;
};

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}
