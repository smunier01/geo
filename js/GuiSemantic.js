/* global $ */

/**
 *  Test de l'interface avec semantic-ui  
 *
 *  @class
 */
var GuiSemantic = function(app) {

    this.app = app;

    this.modes = Object.freeze({

        SELECT : 0,

        PATH : 1
        
    });
    
    this.init();
    
    this.setMode(this.modes.SELECT);
    this.app.showError = this.showErrorMessage;
    
};

GuiSemantic.prototype.showErrorMessage = function(msg){
    $errorMsgContent = $('#errorContent');

    $errorMsgContent.text(msg);
    if($errorMsgContent.closest('.message').hasClass('hidden'))
        $errorMsgContent.closest('.message').transition('fade');
};

GuiSemantic.prototype.init = function() {

    var that = this;

    //$('.ui.dropdown').dropdown();
    
    $('.ui.accordion').accordion();

    $('#bottom-bar')
        .sidebar('setting', 'transition', 'push')
        .sidebar('setting', { dimPage: false });
    
    $('#left-sidebar').sidebar('setting', 'transition', 'push');

    $('#sidebar-toggle').click(function(e){
        e.preventDefault();
        $('#left-sidebar').sidebar('toggle');
    });

    $('#select-button').click(function() {
        that.setMode(that.modes.SELECT);
    });

    $('#path-button').click(function() {
        that.setMode(that.modes.PATH);
    });

    $('#saveLocal').on('click', function() {
        that.app.storage.save();
    });

    $('#geomode-button').click(function() {
        that.app.actionToggleGps();
        $('#geomode-button').toggleClass('primary');
    });

    $('#sync').on('click', function() {
        that.app.syncOnline();
    });
    
    that.updateServiceSidebar();

    var div;
    
    for (var l in this.app.layers) {

        var s = "";
        
        if ( this.app.layers[l].layer.getVisible() === true ) {
            s = "checked";
        }


        div = $(
            '<div class="item">'+
                '<div class="right floated content">'+
                '<div class="ui toggle checkbox">'+
                '<input type="checkbox" name="' + l + '" id="display' + l + '"'+s+'/>'+
                '<label></label>'+
                '</div>'+
                '</div>'+
                '<div class="content">'+
                '<label for="display"' + l + '>' + l + '</label>'+
                '</div>'+
                '</div>'
        );
        

        $('#layersCheckboxes').append(div);

    }

    $('#editInfos').click(function(){
        that.editBuilding();
    });

    // quand on click sur une des check box, on passe le layer correspondant en visible/non-visible
    $('#layersCheckboxes input').on('click', function() {
        that.app.setVisible($(this).attr('name'), $(this).prop('checked'));
    });

    $('#edit-button').click(function() {

        if (that.currentMode != that.modes.SELECT) {
            return false;
        }

        that.editBuilding();
        
        
    });

    GuiSemantic.prototype.editService = function(service, url) {
        var modalContent = $('#modal-edit .content');
        $('#modal-edit>.header').text('Edition de service');

        modalContent.empty();
        var oldNameService = service;

        modalContent.append('<div class="ui labeled input fluid">' +
                            '<div class="ui label">Nom</div>' +
                            '<input type="text" name="service" value="' + service + '">' +
                            '</div>');
        modalContent.append('<div class="ui labeled input fluid">' +
                            '<div class="ui label">Url</div>' +
                            '<input type="text" name="url" value="' + url + '">' +
                            '</div>');

        $('#modal-edit').modal({
            onApprove : function() {
                if($('#modal-edit input[name="service"]').val().length > 0){
                    var o = {
                        name: $('#modal-edit input[name="service"]').val(),
                        url: $('#modal-edit input[name="url"]').val().length>0?$('#modal-edit input[name="url"]').val():null,
                        oldName : oldNameService
                    };
                    that.app.editService(o, function(){
                        that.updateServiceSidebar();
                    });
                }
                else{
                    that.showErrorMessage("Merci d'entrer un nom de service");
                }
            }
        }).modal('show');

    };

    GuiSemantic.prototype.editBuilding = function() {
        
        var result = that.app.actionEdit();
        var feature = result.object;
        var callback = result.callback;

        var modalContent = $('#modal-edit .content');
        $('#modal-edit>.header').text('Edition de batiment');
        modalContent.empty();

        var servicesDropdown;
        var servicesValue = [];

        for (var key in feature) {

            if (key == 'services') {

                that.app.getServiceList(function(services) {

                    servicesDropdown = $('<select name="services" multiple="" class="ui fluid search dropdown"></select>');
                    var div = servicesDropdown;

                    for (var s of services) {
                        div.append('<option value="' + s.name + '">' + s.name + '</option>');
                    }

                    modalContent.append(div);

                    servicesDropdown.dropdown({
                        allowAdditions: true
                    });

                    if (feature[key]) {
                        for(var s of feature[key].split(';')){
                            servicesValue.push(s.split(',')[0]);
                        }
                    }

                    servicesDropdown.dropdown('set selected', servicesValue);

                });

            } else {
                var val = feature[key];
                if(val == null || val == undefined || val == "undefined")
                    val = "";
                var div = $('<div class="ui labeled input fluid">' +
                            '<div class="ui label">' + key + '</div>' +
                            '<input type="text" name="' + key + '" value="' + val + '">' +
                            '</div>'
                           );

                modalContent.append(div);

            }
        }
        /*
          if (typeof servicesDropdown != "undefined") {

          servicesDropdown.dropdown({
          allowAdditions: true
          });
          servicesDropdown.dropdown('set selected', servicesValue);

          }
        */
        $('#modal-edit').modal({

            onApprove : function() {

                var obj = {};

                (obj);
                
                modalContent.children().each(function() {

                    var o = $(this).find('select').length ? $(this).find('select') : $(this).find('input');

                    obj[o.attr('name')] = o.val();
                    
                });

                
                callback(obj, function(feature){
                    that.updateCardInfos(feature);
                    //that.app.getBuildingList(that.updateBuildingList);
                    that.updateServiceSidebar();
                });
            }
            
        }).modal('show');
    };

    this.app.map.on('click', function(evt) {

        if (that.currentMode == that.modes.SELECT) {

            var object = that.app.actionSelect(evt, function(features) {

                // if (features.length > 0) {
                //     var data = features[0];
                // }

                that.updateCardInfos(features);
            });

        } else if (that.currentMode == that.modes.PATH) {

            that.app.actionPath(evt);

        }

    });

    $('#map').mouseleave(function() {

        $('#hoverbox').empty();
        $('#hoverbox').hide();

    });

    this.app.map.on('pointermove', function(evt) {
        /*
        var objects = that.app.actionHover(evt);

        $('#hoverbox').empty();
        $('#hoverbox').hide();

        if (objects && objects.length) {

            for (var o of objects) {

                var div = $('<div><h3>' + o.layerName + '</h3></div>');

                for (var p in o.properties) {
                    div.append($('<div>' + p + ':' + o.properties[p] + '</div>'));
                }

                $('#hoverbox').append(div);
            }

            $('#hoverbox').show();

            $('#hoverbox').css({
                'top': evt.pixel[1] + 50,
                'left': evt.pixel[0]
            });
        }
        */
    });

    $('#buildingSearch').bind('keyup', function() {
        var inputTxt = $('#buildingSearch').val().toLowerCase();
        $('#buildingList li').each(function(index, element){
            if(inputTxt.length > 0){
                if($(element).html().toLowerCase().indexOf(inputTxt) < 0){
                    $(element).css({display: 'none'});
                }
                else{
                    $(element).css({display: 'list-item'});   
                }
            }
            else{
                $(element).css({display: 'list-item'});
            }

        });
    });
};

GuiSemantic.prototype.updateSyncInfos = function(localChanges) {

    
    var that = this;
    
    if (this.app instanceof AppOffline) {

        // le nombre de changes actuallement en local storage
        $('#syncInfos').find('.detail').html(localChanges.length);

    }
};

GuiSemantic.prototype.updateCardInfos = function(data){

    
    var that = this;

    if (data){

        //if (this.app instanceof AppOnline) {
        //    var g = data.geometry;
        //    data = data.properties;
        //    data.geometry = g;
        //}
        
        var coordsBat = [];
        
        coordsBat['coordinate'] = data.geometry.getInteriorPoint().getCoordinates();
        var cardContainer = $('.cardContainer');

        
        var servicesAndUrl = data.services.split(';');

        var servicesUrl = [];
        var servicesName = [];

        for (var i = servicesAndUrl.length - 1; i >= 0; i--) {
            var tmp = servicesAndUrl[i].split(",");
            servicesName.push(tmp[0]);
            servicesUrl.push(tmp[1]==="null"?null:tmp[1]);
        }

        cardContainer.find('#batName').text(data.name != null ? data.name : "Sans nom");
        cardContainer.find('#batService').text(servicesName.join(','));
        var descUrl = '';
        for (var i = 0; i < servicesUrl.length; i++) {
            if(servicesUrl[i] != null)
                descUrl += '<li><a href="' + servicesUrl[i] + '">Lien vers ' + servicesName[i] + '</a></li>';
        }
        if(descUrl !== '')
            cardContainer.find('.batDesc').html('<ul>' + descUrl + '</ul>');
        else{
            cardContainer.find('.batDesc').html('Aucune information disponible');
        }

        cardContainer.find('#batItineraire').click(function() {
            that.app.actionPath(coordsBat, true);
        });

        if ($('.cardContainer').hasClass('hidden')){
            $('.cardContainer').transition('vertical flip');
        }
    }

    else{
        if(! $('.cardContainer').hasClass('hidden')){
            $('.cardContainer').transition('vertical flip');
        }
    }
};

GuiSemantic.prototype.updateServiceList = function(services) {
    var that = this;

    var selectService = $('#selectServices').find('select');
    
    for (var t of services) {
        selectService.append('<option value="'+t.name+'">'+t.name+'</option>'); 
    }
    
    selectService.dropdown();

    $('#selectServices').find('[type=submit]').on('click', function() {
        var val = selectService.val();
        that.app.actionPathService(val, that.updateCardInfos);
    });
};

GuiSemantic.prototype.updateBuildingList = function(buildings) {

    var content = [];
    var that = this;
    
    $.each(buildings, function(index, value){
        if(value.name !== undefined){
            content.push({title: value.name, id: value.osm_id});
        }
    });

    $('.ui.search').search('destroy')
        .search({
            source: content,
            onSelect: function(result, response) {
                that.app.actionGoto(result, function(featureProperties) {
                    that.updateCardInfos(featureProperties);
                });
            }
        });
};


GuiSemantic.prototype.updateServiceSidebar = function(){
    var that = this;
    this.app.getServiceList(function(services){
        var serviceList = '<ul class="ui inverted relaxed divided list">';
        
        for (var i = 0; i < services.length; i++) {
            serviceList += '<li class="item">' + 
                '<div class="header">' + 
                '<a class="editService">' + 
                '<i class="icon edit"/>' + 
                '</a>' + 
                '<a class="showBatimentService">' + 
                services[i].name + 
                '</a>' + 
                '</div>' + 
                '<div class="serviceUrlContainer">';
            if(services[i].url != null){
                serviceList += '<a href="' + services[i].url + '" class="serviceUrl">' + 
                    'lien vers ' + services[i].name + 
                    '</a>';
            }
            serviceList += '</div>' +'</li>';
        }
        serviceList += "</ul>";

        $('#servicesList').html(serviceList);

        $('#servicesList .editService').click(function(){
            var container = $(this).closest('.item');
            var url = $('.serviceUrl', container).attr('href');
            if(url == "undefined" || url==undefined || url==null)
                url = '';
            that.editService($('.showBatimentService', container).text(), url);
        });

    });
};

GuiSemantic.prototype.setMode = function(m) {

    this.currentMode = m;

    this.clearAll();

    switch(this.currentMode) {
    case this.modes.PATH:
        $('#path-button').addClass('primary');
        $('#select-mode-buttons').hide();
        $('#path-mode-buttons').show();
        break;
        
    case this.modes.SELECT:
        $('#select-button').addClass('primary');
        $('#path-mode-buttons').hide();
        $('#select-mode-buttons').show();
        break;
        
    default:
        $('#path-mode-buttons').hide();
        $('#select-mode-buttons').hide();
    }

};

GuiSemantic.prototype.clearAll = function() {

    $('#mode-switch-buttons button').each(function() {
        $(this).removeClass('primary');
    });

    $('#selected-info').empty();
    
    $('#hoverbox').empty();
    $('#hoverbox').hide();
    
    this.app.actionClearAll();
};

GuiSemantic.prototype.showDownloadModal = function() {
    $('#download-modal').modal('show');
};

GuiSemantic.prototype.setProgressDownloadModal = function(progress, bar) {
    var progressBar = $('#download-modal-progress-' + bar);

    progressBar.progress({value:progress, total:100});
};

GuiSemantic.prototype.hideDownloadModal = function() {
    $('#download-modal').modal('hide');
};
