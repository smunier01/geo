/* global ol, $ */

/**
 * Application Online
 *
 * @class
 */
var that;
var AppOnline = function() {

    that = this;
    this.selectedBat = undefined;
    
    this.showError = function(msg){};
    /**
     * @type {string} 
     */
    this.GEO_HOST = 'localhost:8080';

    /**
     *  Reference à l'objet map d'openlayer
     *  @type {ol.Map}
     */
    this.map = undefined;
    this.posActu = undefined;

    /**
     *  Objet contenant la liste des layers openlayers utilisé
     *  @type {Object.<string, ol.layer.Vector>}
     */ 
    this.layers = [];
    this.styles=[];
    this.hasCenteredGps = false;

    /**
     *  Boolean indiquant si nous utilisons ou non la geolocalisation.
     *
     *  @type {boolean}
     */
    this.gpsmode = false;

    /*
     *  Position courante donnée par la geolocalisation
     *
     *  @type {Array.<number>}
     */
    this.currentPosition = undefined;

    /*
     *  Référence vers l'objet en charge de la geolocation.
     *  pour l'initialiser : gpswatch = navigator.geolocation.watchPosition(...);
     *  pour le desactiver : navigator.geolocation.clearWatch(gpswatch);
     *  @type {object}
     */
    this.gpswatch = undefined;

    this.GREY1 = '#CECECE';
    this.COLOR1 = '#E86FB0';


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

    this.layers['closestService'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector({
                style: that.styles['nodeSelected'],
            })
        }),
        'order': 11
    };

    this.layers['hover'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector([]),
            style: that.styles['nodeSelected'],
            title: 'Hover Layer'
        }),
        'order': 100
    };

    this.layers['currentPosition'] = {
        'layer': new ol.layer.Vector({
            source: new ol.source.Vector([]),
            style: that.styles['nodeSelected'],
            title: 'Current Position Layer'
        }),
        'order': 100
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
// AppOnline.prototype.getFeaturesFromClick = function(event) {

//     var viewResolution = (this.map.getView().getResolution());

//     var url = this.layers['buildings'].layer.getSource().getGetFeatureInfoUrl(
//         event.coordinate, viewResolution, 'EPSG:3857',

//         {'INFO_FORMAT': 'text/javascript'}

//     );
    
//     if (url) {

//         if (url) {
//             $.ajax({

//                 url: url,
//                 dataType: 'jsonp',
//                 //jsonpCallback: 'parseResponse'

//             }).then(function(response) {
//                 /*
//                   vectorSource.clear();
//                   vectorSource.addFeatures(geojsonFormat.readFeatures(response));
//                 */

//             });
//         }

//     }
// };

AppOnline.prototype.getBuildingList = function(callback) {
    var buildings = [{name: 'building1', osm_id: 1}];
    
    $.ajax({
        url: 'php/manageServices.php',
        type: 'GET',
        data: {action: 'getListBuildings'},
        //async: false
    }).done(function(res) {
        var results = $.parseJSON(res);
        buildings = results;
        callback(results);
    });

    
    //return buildings;
};

AppOnline.prototype.getServiceList = function(v) {
    $.ajax({
        url: 'php/manageServices.php',
        type: 'GET',
        data: {
            action: 'getListServices'
        },
        success: function(res){
            var parsedRes = $.parseJSON(res);
            var services = [];
            for (var i = 0; i < parsedRes.length; i++) {
                if(parsedRes[i].url == undefined || parsedRes[i].url == '' || parsedRes[i].url == "undefined"){
                    parsedRes[i].url = null;
                }
                services.push({
                    name: parsedRes[i].name,
                    url: parsedRes[i].url
                });
            };

            v(services);
        }
    });  
};


AppOnline.prototype.actionClearAll = function() {
    
};

/**
 * Action appelé quand on click sur la map pour selectionner un object
 *
 * Cela devrait renvoyer les propriétés d'un feature
 */

AppOnline.prototype.actionSelect = function(evt, callback) {

    var viewResolution = (this.map.getView().getResolution());
    var url = this.layers['buildings'].layer.getSource().getGetFeatureInfoUrl( evt.coordinate, viewResolution, 'EPSG:3857',{
        'INFO_FORMAT': 'text/javascript'
    });

    var that = this;
    if (url) {
        $.ajax({
            jsonpCallback: 'getJson',
            url: url+"&format_options=callback:getJson",
            dataType: 'jsonp',
            success: function (data, status) {
                if(data.features.length > 0){
                    var feature = data.features[0];

                    //that.selectedBat = feature;
                    that.getServiceFromOsmId(feature.properties.osm_id, function(services){
                        var s = '';
                        for (var i = services.length - 1; i >= 0; i--) {
                            s += services[i].name + "," + services[i].url;
                            if(i > 0)
                                s += ";";
                        };

                        feature.properties.services = s;
                        olFeature = new ol.Feature({
                            geometry: new ol.geom.Polygon(feature.geometry.coordinates),
                            name: feature.properties.name,
                        });

                        delete feature.properties['geometry'];
                        delete feature.properties['name'];
                        olFeature.setProperties(feature.properties);

                        that.selectedBat = olFeature;
                        that.addFeatureOnClosestService(that.selectedBat, true);

                        callback(olFeature.getProperties());
                    });
                }
                else{
                    that.selectedBat = undefined;
                    callback(false);
                }
            }
        });
    }
};

/**
 *   Récupere la liste des services associés à un batiment (osm_id) sous forme
 *   [{
 *       name: nomDuService
 *       url: urlDuService
 *   }, ...]
 */
AppOnline.prototype.getServiceFromOsmId = function (osmId, callback){
    $.ajax({
        url: 'php/manageServices.php',
        type: 'GET',
        data: {
            action: 'getServiceFromOsmId',
            osmId : osmId
        },
        success: function(res){
            res = $.parseJSON(res);
            var result = [];

            for (var i = 0; i < res.length; i++) {
                result.push({
                    name: res[i].name,
                    url: res[i].url
                });
            };

            if(callback != undefined && typeof(callback) == "function")
                callback(result); 
        }
    });
};

/*
*   Recupere un building sous forme de ol.Feature à partir d'un osm_id
*/
AppOnline.prototype.getBuildingFromOsmId = function(osmId, callback){
    $.ajax({
        url: 'http://' + that.GEO_HOST + '/geoserver/wfs/cite?service=wfs&request=GetFeature&typeNames=sf:getBuildingFromOsmId&outputFormat=text/javascript&viewparams=' + 'id:' + osmId + '&format_options=callback:getJson',
        dataType: 'jsonp',
        jsonpCallback: 'getJson',

        success: function(res){
            if(res.features.length > 0){
                res.features[0].properties.osm_id = res.features[0].id.split('.')[1];

                that.getServiceFromOsmId(res.features[0].properties.osm_id, function(services){
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Polygon(res.features[0].geometry.coordinates),
                        name: res.features[0].properties.name,
                    });

                    delete res.features[0].properties['geometry'];
                    delete res.features[0].properties['name'];
                    delete res.features[0].properties['service'];

                    var s = '';
                    for (var i = 0; i < services.length; i++) {
                        s += services[i].name + ',' + services[i].url;
                        if(i<services.length-1)
                            s += ';';
                    }
                    res.features[0].properties.services = s;
                    feature.setProperties(res.features[0].properties);

                    feature.getProperties().services = s;

                    callback(feature);
                });
            }

            else{
                that.showError("Aucun batiment ne correspond à la recherche");
            }
        }
    });
};

/**
 * Action appelé quand on recherche un batiment / route dans la barre de recherche
 */
AppOnline.prototype.actionGoto = function(object, callback) {
    this.getBuildingFromOsmId(object.id, function(feature){
        that.selectedBat = feature;
        that.addFeatureOnClosestService(that.selectedBat, true);
        
        
        that.zoomToCoords(that.selectedBat.getGeometry().getInteriorPoint().getCoordinates());
        callback(feature.getProperties());
    });
};

AppOnline.prototype.zoomToCoords = function(coords){
     var pan = ol.animation.pan({
        duration: 2000,
        source: this.map.getView().getCenter()
    });
    
    var zoom = ol.animation.zoom({
        resolution: this.map.getView().getResolution(),
        duration: 2000
    });
    
    this.map.beforeRender(pan, zoom);
    
    this.map.getView().setCenter(coords, 17);
    this.map.getView().setZoom(17);
}

/**
 *   Ajoute une feature sur la layer closestService
 *   clear la layer si clear = true
 */
AppOnline.prototype.addFeatureOnClosestService =  function(feature, clear){
    //Dans tous les cas, on ne veut pas qqch sur la layer routing 
    var p = this.layers['resultPgRouting'].layer.getSource().getParams();
    p.viewparams = [];
    this.layers['resultPgRouting'].layer.getSource().updateParams(p);
    //this.layers['vector2'].layer.getSource().clear();

    if(clear)
        this.layers['closestService'].layer.getSource().clear();
    if(feature != null && feature != undefined)
        this.layers['closestService'].layer.getSource().addFeature(feature);
}


/**
 *   Pas utilisé pour le moment
 */
function showFeaturesHoverBuildings(data){

    var nbFeatures = 0;

    var sourceHover = that.layers['hover'].layer.getSource();

    sourceHover.clear();

    var infos = [];
    if(data.features != undefined){
        var features = data.features;
        for (var i = features.length - 1; i >= 0; i--) {
            infos.push({
                'layerName': 'buildings',
                'properties': features[i].properties
            });

        }
    }
    return ['e'];
}

AppOnline.prototype.actionHover = function(){

};

/**
 *  Quand on click sur le bouton "edit".
 *  
 *  
 */
AppOnline.prototype.actionEdit = function() {
    
    if(this.selectedBat != undefined){
        var resp = [];
        resp['object'] = {
            name : this.selectedBat.getProperties().name,
            osm_id : this.selectedBat.getProperties().osm_id,
            services : this.selectedBat.getProperties().services
        }  
        
        resp['callback'] = function(result, callback){
            if(result.services){
                result.services = result.services.join(';')
            }
            $.ajax({
                url: 'php/manageServices.php',
                type: 'GET',
                data: {
                    action: 'updateBatimentInfos',
                    infos: JSON.stringify(result)
                },
                success: function(){
                    that.getBuildingFromOsmId(that.selectedBat.getProperties().osm_id, function(feature){
                        that.selectedBat = feature;
                        callback(that.selectedBat.getProperties());
                    });
                    
                }
            });            
        };

        return resp;  
    }
    else{
        this.showError("Aucun batiment selectionné");
    }
};

/**
 *  Active ou desactive le mode gps.
 */
AppOnline.prototype.actionToggleGps = function() {
    var that = this;

    this.gpsmode = !this.gpsmode;

    if (this.gpsmode) {
        this.addFeatureOnClosestService(null, true);
        var sourceCurrent = that.layers['currentPosition'].layer.getSource();
        var view = that.map.getView();

        this.gpswatch = navigator.geolocation.watchPosition(
            function(position) {
                that.currentPosition = ol.proj.transform([position.coords.longitude, position.coords.latitude], 'EPSG:4326', 'EPSG:3857');

                if(!that.hasCenteredGps){
                    view.setCenter(that.currentPosition);
                    that.hasCenteredGps = true;
                }

                sourceCurrent.clear();
                sourceCurrent.addFeature(new ol.Feature(new ol.geom.Point(that.currentPosition)));
            },
            function(error) {
                that.showError("Erreur de GPS");
            },
            {
                enableHighAccuracy:true, maximumAge:0, timeout:5000
            }
        );

    } else {
        navigator.geolocation.clearWatch(this.gpswatch);
        that.currentPosition = undefined;
        that.layers['currentPosition'].layer.getSource().clear();
        this.addFeatureOnClosestService(null, true);
        this.hasCenteredGps = false;
    }
};

AppOnline.prototype.editService = function(services, callback){
    var that = this;
    $.ajax({
        url: 'php/manageServices.php',
        type: 'GET',
        data: {
            action: 'updateServiceInfos',
            serviceInfos: JSON.stringify(services)
        },
        success: function(res){
            res = $.parseJSON(res);
            if(res.status == 'failure'){
                that.showError(res.message);
            }
            callback();
        }
    });
    
};

/**
 *  Quand on click sur la map dans mode "chemin"
 *
 *  Enregistre le premier click et utilise pgRouting pour afficher le plus court chemin
 *  entre les deux points.
 */
AppOnline.prototype.actionPath = function(evt, redirect) {

    var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');
    var pointsSrc = this.layers['vector2'].layer.getSource();
    redirect==undefined?false:redirect;



    if (((this.click == 0 && !redirect) || (this.click == 2 && !redirect)) && !that.currentPosition) {
        //Efface le routing au cas où qqch est deja affiché
        var p = this.layers['resultPgRouting'].layer.getSource().getParams();
        p.viewparams = [];
        this.layers['resultPgRouting'].layer.getSource().updateParams(p);

        this.click = 1;
        this.posActu = evt.coordinate;

        pointsSrc.clear();
        this.layers['closestService'].layer.getSource().clear();

        pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(evt.coordinate)));

    } else if(this.currentPosition || this.posActu) {
        if(redirect){
            pointsSrc.clear();
            if(!that.currentPosition)
                pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(this.posActu)));
        }
        if(that.currentPosition){
            pointsSrc.clear();
            pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(this.currentPosition)));
        }

        this.click = 2;
        
        pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(evt.coordinate)));

        var startCoord = transform(pointsSrc.getFeatures()[0].getGeometry().getCoordinates());
        var destCoord = transform(pointsSrc.getFeatures()[1].getGeometry().getCoordinates());

        var viewparams = [
            'x1:' + startCoord[0], 'y1:' + startCoord[1],
            'x2:' + destCoord[0], 'y2:' + destCoord[1]
        ];
        
        var p = this.layers['resultPgRouting'].layer.getSource().getParams();
        p.viewparams = viewparams.join(';');
        this.layers['resultPgRouting'].layer.getSource().updateParams(p);
    }
    else{
        this.showError("Veuillez selectionner un point de départ ( via chemin ), ou activer le gps");
    }
};


/**
 *   
 *
 *
 */
AppOnline.prototype.actionPathService = function(service, callbackFinal) {
    var that = this;
    var callback = function(serviceListe){

        if(that.posActu || that.currentPosition){
            var coords = that.currentPosition?ol.proj.toLonLat(that.currentPosition):ol.proj.toLonLat(that.posActu);
            var viewparams = ['x:' + coords[0], 'y:' + coords[1], "sname:'" + service + "'"];

            $.ajax({
                url: 'http://' + that.GEO_HOST + '/geoserver/wfs/cite?service=wfs&request=GetFeature&typeNames=sf:closestService&outputFormat=text/javascript&viewparams=' + viewparams.join(';') + '&format_options=callback:getJson',
                dataType: 'jsonp',
                jsonpCallback: 'getJson',

                success: function(data, status){
                    //that.layers['closestService'].layer.getSource().clear();

                    var feature = new ol.Feature({
                        geometry: new ol.geom.Polygon(data.features[0].geometry.coordinates),
                        name: data.features[0].properties.name, 
                        services : ''
                    });

                    delete data.features[0].properties['geometry'];
                    delete data.features[0].properties['name'];
                    delete data.features[0].properties['service'];

                    feature.setProperties(data.features[0].properties);

                    var osmId = data.features[0].id.split('.');
                    osmId = osmId[osmId.length-1];

                    that.getServiceFromOsmId(osmId, function(res){
                        var services = '';

                        for (var i = res.length - 1; i >= 0; i--) {
                            services += res[i].name + "," + res[i].url;
                            if(i > 0)
                                services += ";";
                        };
                        feature.getProperties().services = services;
                        
                        that.addFeatureOnClosestService(feature, true);
                        if(that.posActu || that.currentPosition){
                            var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');
                            var pointsSrc = that.layers['vector2'].layer.getSource();

                            pointsSrc.clear();
                            pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(that.currentPosition?that.currentPosition:that.posActu)));


                            that.click = 2;

                            pointsSrc.addFeature(new ol.Feature(feature.getGeometry().getInteriorPoint()));

                            var startCoord = transform(pointsSrc.getFeatures()[0].getGeometry().getCoordinates());
                            var destCoord = transform(pointsSrc.getFeatures()[1].getGeometry().getCoordinates());

                            var viewparams = [
                                'x1:' + startCoord[0], 'y1:' + startCoord[1],
                                'x2:' + destCoord[0], 'y2:' + destCoord[1]
                            ];

                            var p = that.layers['resultPgRouting'].layer.getSource().getParams();
                            p.viewparams = viewparams.join(';');
                            that.layers['resultPgRouting'].layer.getSource().updateParams(p);
                        }
                        callbackFinal(feature.getProperties());
                    });
                }
            });
        }
        else{
            that.showError("Veuillez selectionner un point de départ ( via chemin ), ou activer le gps");
        }
    };

    this.getServiceList(callback);

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
    //this.gui.updateBuildingList(this.getBuildingList());
    this.getBuildingList(function(buildings){
        this.gui.updateBuildingList(buildings);
    });

    // met à jour la liste des services (pour le dropdown en bas à gauche)
    this.getServiceList(function(services) {
        this.gui.updateServiceList(services);
    });
    
};


