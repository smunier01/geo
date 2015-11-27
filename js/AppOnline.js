/* global ol, $ */

/**
 * Application Online
 *
 * @class
 */
 var that;
 var AppOnline = function() {

    that = this;
    
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

    this.layers['closestService'] = {
        'layer': new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
                params: {
                    LAYERS: 'sf:closestService', 
                    //FORMAT: 'image/png'
                },
                serverType: 'geoserver',
                //visibility:false
            })
        }),
        'order': 10
    };


    this.layers['test'] = {
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
                  console.log(geojsonFormat.readFeatures(response));*/

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
        // console.log(results);

    });

    //console.log(buildings);

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
            v($.parseJSON(res));
        }
    });  
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
    /*
    console.log('actionHover');
    var viewResolution = (this.map.getView().getResolution());
    var url = this.layers['buildings'].layer.getSource().getGetFeatureInfoUrl( evt.coordinate, viewResolution, 'EPSG:3857',{
        'INFO_FORMAT': 'text/javascript'
    });

    //console.log(url);

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


    if (url) {
        $.ajax({
            jsonpCallback: 'getJson',
            url: url+"&format_options=callback:getJson",
            dataType: 'jsonp',
            success: function (data, status) {
                if(data.features.length > 0){
                    $.ajax({
                        url: 'php/manageServices.php',
                        type: 'GET',
                        data: {
                            action: 'getServiceFromOsmId',
                            osmId : data.features[0].properties.osm_id
                        },
                        success: function(res){
                            var services = '';
                            res = $.parseJSON(res);

                            for (var i = res.length - 1; i >= 0; i--) {
                                services += res[i].name;
                                if(i > 0)
                                    services += ", ";
                            };
                            data.features[0].properties.service = services;
                            feature = new ol.Feature({
                                geometry: new ol.geom.Polygon(data.features[0].geometry.coordinates),
                                name: data.features[0].properties.name,
                                properties: data.features[0].properties
                            });
                            callback([feature.getProperties()]); 
                        }
                    });
                }
                else{
                    callback(data.features);
                }
                
                  
            }
        });
    }

    // var feature = this.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {

    //     console.log("Feature : " + feature);

    // });


};

/**
 * Action appelé quand on recherche un batiment / route dans la barre de recherche
 */
 AppOnline.prototype.actionGoto = function(object) {
    console.log('actionGoto');
};

// function parseResponse(data){
//     console.log("parseResponse");
//     var features = data.features;
//     //for (var i = features.length - 1; i >= 0; i--) {
//         //console.log(features[i]);
//     //};
//     if(features.length > 0){
//         var $cardContainer = $('.cardContainer');
//         $cardContainer.find('#batName').text(features[0].properties.name!=null?features[0].properties.name:features[0].properties.service);
//         $cardContainer.find('#batService').text(features[0].properties.service);
//         var coordsBat = [];

//         var functionTmp = $.proxy(function(){
//             this.actionPath(coordsBat, true);
//         }, that);
//         coordsBat['coordinate'] = features[0].geometry.coordinates[0][0];
//         // $cardContainer.find('#batItineraire').click(functionTmp);
//         // if($('.cardContainer').hasClass('hidden')){
//         //     $('.cardContainer').transition('vertical flip');
//         // }
//     }

//     // else{
//     //     if(! $('.cardContainer').hasClass('hidden')){
//     //         $('.cardContainer').transition('vertical flip');
//     //     }
//     // }
// }

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
 *  Action appelé quand on click sur le bouton des services
 *
 *  Logiquement cela devrait rechercher le service le plus proche de la position courante
 */
 AppOnline.prototype.actionParking = function() {
    // var hazardWMSLayer = new OpenLayers.Layer.WMS(
    //     "Wenchuan Intensities (WMS)",
    //     "http://mysite.org/geoserver/wms",
    //     {
    //         layers: "wenchuanintensityquery2",
    //         transparent:true,
    //         viewparams:'minweight:5'
    //     },
    //     {
    //         opacity:0.5,
    //         singleTile:true
    //     }
    //     );
if(this.posActu){
    var coords = ol.proj.toLonLat(this.posActu);

    var viewparams = ['x:' + coords[0], 'y:' + coords[1], 'sname:parking'];

    var p = this.layers['closestService'].layer.getSource().getParams();
    p.viewparams = viewparams.join(';');
        //console.log(p.viewparams);
        this.layers['closestService'].layer.getSource().updateParams(p);
        

        // this.map.addLayer(closestParkingLayer);
    }
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

        //params.viewparams = viewparams.join(';');
        
        var p = this.layers['resultPgRouting'].layer.getSource().getParams();
        p.viewparams = viewparams.join(';');
        this.layers['resultPgRouting'].layer.getSource().updateParams(p);
    }
};

AppOnline.prototype.actionPathService = function(service) {
    var that = this;
    var callback = function(serviceListe){
        if ($.inArray(service, serviceListe) == -1) {
            return null;
        }
        
        //console.log(that);
        if(that.posActu){
            var coords = ol.proj.toLonLat(that.posActu);
            var viewparams = ['x:' + coords[0], 'y:' + coords[1], "sname:'" + service + "'"];
            // var p = that.layers['closestService'].layer.getSource().getParams();
            // var coords = [];

            // p.viewparams = viewparams.join(';');
            // that.layers['closestService'].layer.getSource().updateParams(p);
            // console.log(that.layers['closestService'].layer.getSource().getProperties());
            //that.actionPath()
            // this.map.addLayer(closestParkingLayer);

            $.ajax({
                url: 'http://' + that.GEO_HOST + '/geoserver/wfs/cite?service=wfs&request=GetFeature&typeNames=sf:closestService&outputFormat=text/javascript&viewparams=' + viewparams.join(';') + '&format_options=callback:getJson',
                dataType: 'jsonp',
                jsonpCallback: 'getJson',

                success: function(data, status){
                    that.layers['test'].layer.getSource().clear();
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Polygon(data.features[0].geometry.coordinates),
                        name: data.features[0].properties.name

                    });
                    that.layers['test'].layer.getSource().addFeature(feature);

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


