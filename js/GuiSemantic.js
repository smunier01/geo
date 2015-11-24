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

    $('.ui.sidebar').sidebar('setting', 'transition', 'push');

    $('#sidebar-toggle').click(function(e){
        e.preventDefault();
        $('.ui.sidebar').sidebar('toggle');
    });

    $('#select-button').click(function() {
        that.setMode(that.modes.SELECT);
    });

    $('#path-button').click(function() {
        that.setMode(that.modes.PATH);
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

    // quand on click sur une des check box, on passe le layer correspondant en visible/non-visible
    $('#layersCheckboxes input').on('click', function() {
        that.app.setVisible($(this).attr('name'), $(this).prop('checked'));
    });

    $('#edit-button').click(function() {

        if (that.currentMode != that.modes.SELECT) {
            return false;
        }
        
        var result = that.app.actionEdit();
        var feature = result.object;
        var callback = result.callback;
        
        var modalContent = $('#modal-edit .content');

        modalContent.empty();

        var servicesDropdown;
        var servicesValue = [];
        
        for (var key in feature) {

            if (key == 'services') {

                var a = function(services) {

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
        
    });

    this.app.map.on('click', function(evt) {
        
        if (that.currentMode == that.modes.SELECT) {

            $('#selected-info').empty();
            var object = that.app.actionSelect(evt);

            if (object) {
                
                $('#selected-info').show();
                
                for (var o in object) {
                    $('#selected-info').append('<div>' + o + ':' + object[o] + '</div>');
                }

            } else {
                $('#selected-info').hide();
            }
            
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

GuiSemantic.prototype.updateServiceList = function(services) {
    var that = this;

    var selectService = $('#selectServices').find('select');
    
    for (var t of services) {
        selectService.append('<option value="'+t+'">'+t+'</option>'); 
    }
    
    selectService.dropdown();

    $('#selectServices').find('[type=submit]').on('click', function() {
        var val = selectService.val();
        that.app.actionPathService(val);
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
                that.app.actionGoto(result);
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
