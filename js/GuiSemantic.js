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

    $('#geomode-button').click(function() {
        that.app.actionToggleGps();
        $('#geomode-button').toggleClass('primary');
    });

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

GuiSemantic.prototype.editBuilding = function(){
    var result = that.app.actionEdit();
        console.log(result);
        var feature = result.object;
        var callback = result.callback;
        
        var modalContent = $('#modal-edit .content');

        modalContent.empty();

        var servicesDropdown;
        var servicesValue = [];
        
        for (var key in feature) {

            
            
            if (key == 'services') {

                console.log(feature[key]);

                var a = function(services) {
                    console.log(services);

                    servicesDropdown = $('<select name="services" multiple="" class="ui fluid search dropdown"></select>');
                    var div = servicesDropdown;
                    servicesValue = feature[key];
                    
                    for (var s of services) {
                        div.append('<option value="' + s + '">' + s + '</option>');
                    }

                    modalContent.append(div);
                    
                };

                that.app.getServiceList(a);
                
            } else {

                var div = $('<div class="ui labeled input fluid">' +
                    '<div class="ui label">' + key + '</div>' +
                    '<input type="text" name="' + key + '" value="' + feature[key] + '">' +
                    '</div>'
                    );

                modalContent.append(div);

            }
        }

        if (typeof servicesDropdown != "undefined") {

            servicesDropdown.dropdown({
                allowAdditions: true
            });
            servicesDropdown.dropdown('set selected', servicesValue);

        }
        
        $('#modal-edit').modal({

            onApprove : function() {

                var obj = {};
                
                modalContent.children().each(function() {

                    var o = $(this).find('select').length ? $(this).find('select') : $(this).find('input');

                    obj[o.attr('name')] = o.val();
                    
                });

                callback(obj);
            }
            
        }).modal('show');
}

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

        // event quand on click sur "save". Envois les données à la bdd.
        $('#syncInfos').find('a').on('click', function() {
            that.storage.save();
        });
    }
};

GuiSemantic.prototype.updateCardInfos = function(data){

    console.log("updateCardInfos");
    console.log(data);
    
    var that = this;

    if (data){

        if (this.app instanceof AppOnline) {
            var g = data.geometry;
            data = data.properties;
            data.geometry = g;
        }
        
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
                descUrl += '<li><a href="' + servicesUrl[i] + '">Lien ver ' + servicesName[i] + '</a></li>';
        };
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
        selectService.append('<option value="'+t+'">'+t+'</option>'); 
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

    $('.ui.search')
    .search({
        source: content,
        onSelect: function(result, response) {
            that.app.actionGoto(result, function(object) {
                // ?
            });
        }
    })
    ;

    /*
    var $buildingList = $('#buildingList');
    var list = '<ul>';

    $.each(buildings, function(index, value){
        if(value.name != undefined){
            list += '<li>' + value.name + '</li>';  
        }
    });
    
    list += '</ul>';
    $buildingList.append(list);
    */
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
