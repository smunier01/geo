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

    $('#parking-button').click(function() {
        if (that.currentMode == that.modes.PATH) {
            that.app.actionParking();
        }
    });

    var div;
    
    for (var l in this.app.layers) {

        if ( this.app.layers[l].layer.getVisible() == true ) {

            div = $(
                '<div><label for="display"' + l + '>' + l + '</label><input type="checkbox" name="' + l + '" id="display' + l + '" checked/></div>'
            );

        } else {
            div = $(
                '<div><label for="display"' + l + '>' + l + '</label><input type="checkbox" name="' + l + '" id="display' + l + '"/></div>'
            );
        }
	
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
        
        for (var key in feature) {
            var div = $('<div class="ui labeled input fluid">' +
                        '<div class="ui label">' + key + '</div>' +
                        '<input type="text" name="' + key + '" value="' + feature[key] + '">' +
                        '</div>'
                       );
            modalContent.append(div);
        }

        $('#modal-edit').modal({

            onApprove : function() {

                var obj = {};
                
                modalContent.children().each(function() {

                    var input = $(this).find('input');

                    obj[input.attr('name')] = input.val();
                    
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

    this.app.map.on('pointermove', function(evt) {

        var objects = that.app.actionHover(evt);

        $('#hoverbox').empty();
        $('#hoverbox').hide();

        if (objects.length) {
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
};

GuiSemantic.prototype.updateBuildingList = function(buildings) {

    var $buildingList = $('#buildingList');
    var list = '<ul>';
    $.each(buildings, function(index, value){
        if(value.name != undefined){
            list += '<li>' + value.name + '</li>';  
        }
    });
    list += '</ul>';
    $buildingList.append(list);

};

GuiSemantic.prototype.setMode = function(m) {
    
    this.currentMode = m;

    $('#mode-switch-buttons button').each(function() {
        $(this).removeClass('primary');
    });

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
