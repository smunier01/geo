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

     this.gpsmode = false;

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

    //  this.layers['closestParking'] = {
    //     'layer': new ol.layer.Tile({
    //         source: new ol.source.TileWMS({
    //             url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
    //             params: {
    //                  LAYERS: 'sf:closestParking', 
    //                  FORMAT: 'image/png'
    //             },
    //             serverType: 'geoserver'
    //         })
    //     }),
    //     'order': 10
    // };

    // this.layers['closestService'] = {
    //     'layer': new ol.layer.Tile({
    //         source: new ol.source.TileWMS({
    //             url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
    //             params: {
    //                 LAYERS: 'sf:closestService', 
    //                 //FORMAT: 'image/png'
    //             },
    //             serverType: 'geoserver',
    //             //visibility:false
    //         })
    //     }),
    //     'order': 10
    // };


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
                //jsonpCallback: 'parseResponse'

            }).then(function(response) {
                /*
                  vectorSource.clear();
                  vectorSource.addFeatures(geojsonFormat.readFeatures(response));
                  */

              });
        }

    }
};

AppOnline.prototype.getBuildingList = function() {
    var buildings = [{name: 'building1', osm_id: 1}];
    
    $.ajax({
        url: 'php/manageServices.php',
        type: 'GET',
        data: {action: 'getListBuildings'},
        async: false
    }).done(function(res) {
        var results = $.parseJSON(res);
        buildings = results;

    });

    
    return buildings;
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
            console.log("getServiceList");
            var services = [];
            //console.log(parsedRes);
            for (var i = 0; i < parsedRes.length; i++) {
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
    /*
      var viewResolution = (this.map.getView().getResolution());
      var url = this.layers['buildings'].layer.getSource().getGetFeatureInfoUrl( evt.coordinate, viewResolution, 'EPSG:3857',{
      'INFO_FORMAT': 'text/javascript'
      });


      if(url){
      $.ajax({
      url: url+"&format_options=callback:showFeaturesHoverBuildings",
      dataType: 'jsonp'

      });
}*/
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
                    console.log(feature);
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
}

/**
 * Action appelé quand on recherche un batiment / route dans la barre de recherche
 */
 AppOnline.prototype.actionGoto = function(object, callback) {
    $.ajax({
        url: 'http://' + that.GEO_HOST + '/geoserver/wfs/cite?service=wfs&request=GetFeature&typeNames=sf:getBuildingFromOsmId&outputFormat=text/javascript&viewparams=' + 'id:' + object.id + '&format_options=callback:getJson',
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
                    };
                    res.features[0].properties.services = s;
                    feature.setProperties(res.features[0].properties);

                    feature.getProperties().services = s;
                    that.selectedBat = feature;
                    that.addFeatureOnClosestService(that.selectedBat, true);

                    callback(feature.getProperties());
                });
}
}
});
};

/**
*   Ajoute une feature sur la layer closestService
*   clear la layer si clear = true
*/
AppOnline.prototype. addFeatureOnClosestService =  function(feature, clear){
    //Dans tous les cas, on ne veut pas qqch sur la layer routing 
    var p = this.layers['resultPgRouting'].layer.getSource().getParams();
    p.viewparams = [];
    this.layers['resultPgRouting'].layer.getSource().updateParams(p);
    this.layers['vector2'].layer.getSource().clear();

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

            //sourceHover.addFeature(new ol.Feature(features[i]));
        }
    }
    return ['e'];
    // return infos;
}


/**
 *  Quand on click sur le bouton "edit".
 *  
 *  
 */
 AppOnline.prototype.actionEdit = function() {
    console.log("selectedBat : ");
    console.log(this.selectedBat.getProperties());

    if(this.selectedBat != undefined){
        console.log('actionEdit');
        var resp = [];
        resp['object'] = {
            name : this.selectedBat.getProperties().name,
            osm_id : this.selectedBat.getProperties().osm_id,
            services : this.selectedBat.getProperties().service
        }  
        resp['callback'] = function(result){
            $.ajax({
                url: 'php/manageServices.php',
                type: 'GET',
                data: {
                    action: 'updateBatimentInfos',
                    infos: JSON.stringify(result)
                },
            });            
        };

        console.log(resp);
        return resp;  
    }
};

AppOnline.prototype.actionToggleGps = function() {
    var that = this;
    this.gpsmode = !this.gpsmode;

    if (this.gpsmode) {

        var showPosition = function(position) {

            var sourceCurrent = that.layers['currentPosition'].layer.getSource();
            
            console.log("Latitude: " + position.coords.latitude + 
                "Longitude: " + position.coords.longitude);

            that.map.getView().setCenter(ol.proj.transform([position.coords.longitude, position.coords.latitude], 'EPSG:4326', 'EPSG:3857'));
            
            sourceCurrent.clear();
            sourceCurrent.addFeature((new ol.Feature(new ol.geom.Point(ol.proj.transform([position.coords.longitude, position.coords.latitude], 'EPSG:4326', 'EPSG:3857')))));
        };

        var failed = function(pram) {
            console.log("error gps");
        };

        this.gpslocation = navigator.geolocation.watchPosition(showPosition, failed, {enableHighAccuracy:true, maximumAge:30000, timeout:27000});

    }
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



    if (this.click == 0 || (this.click == 2 && !redirect)) {
        //Efface le routing au cas où qqch est deja affiché
        var p = this.layers['resultPgRouting'].layer.getSource().getParams();
        p.viewparams = [];
        this.layers['resultPgRouting'].layer.getSource().updateParams(p);

        this.click = 1;
        this.posActu = evt.coordinate;

        pointsSrc.clear();
        this.layers['closestService'].layer.getSource().clear();

        pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(evt.coordinate)));

    } else {
        if(redirect){
            pointsSrc.clear();
            pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(this.posActu)));
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
};


/**
*   
*
*
*/
AppOnline.prototype.actionPathService = function(service, callbackFinal) {
    var that = this;
    console.log("actionPathService");
    var callback = function(serviceListe){

        if(that.posActu){
            var coords = ol.proj.toLonLat(that.posActu);
            console.log(service);
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
                    });

                    delete res.features[0].properties['geometry'];
                    delete res.features[0].properties['name'];
                    delete res.features[0].properties['service'];

                    feature.setProperties(res.features[0].properties);

                    var osmId = data.features[0].id.split('.');
                    osmId = osmId[osmId.length-1];

                    that.getServiceFromOsmId(osmId, function(res){
                        var services = '';
                        //res = $.parseJSON(res);

                        for (var i = res.length - 1; i >= 0; i--) {
                            services += res[i].name + "," + res[i].url;
                            if(i > 0)
                                services += ";";
                        };
                        feature.getProperties().services = services;
                        console.log(feature);
                        //that.layers['closestService'].layer.getSource().addFeature(feature);

                        that.addFeatureOnClosestService(feature, true);
                        if(that.posActu){
                            var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');
                            var pointsSrc = that.layers['vector2'].layer.getSource();

                            pointsSrc.clear();
                            pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(that.posActu)));


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
    this.gui.updateBuildingList(this.getBuildingList());

    // met à jour la liste des services (pour le dropdown en bas à gauche)
    this.getServiceList(function(services) {
        this.gui.updateServiceList(services);
    });
    
};


