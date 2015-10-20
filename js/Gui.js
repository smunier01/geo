/**
 * @class
 */
var Gui = function(app) {

    this.app = app;

    this.isHidden = true;

    this.width = 0.08;

    this.init();
};

Gui.prototype.init = function() {

    var that = this;

    $(window).resize(function() {
	that.refreshSize();
    });

    // cache ou affiche le menu de gauche
    $('#toggleDisplay').on('click', function() {
	that.isHidden = !that.isHidden;
	that.refreshSize();
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
	
	$("#layersCheckboxes").append(div);
	
    }
    // quand on click sur une des check box, on passe le layer correspondant en visible/non-visible
    $("#layersCheckboxes input").on("click", function() {
	   that.app.setVisible($(this).attr('name'), $(this).prop("checked"));
    });

    // var buildings = this.app.getBuildingList()
    // $('#buildingList');
 
    $("#buildingSearch").bind("keyup", function() {
        var inputTxt = $("#buildingSearch").val().toLowerCase();
        $("#buildingList li").each(function(index, element){
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

    this.refreshSize();
};

Gui.prototype.updateBuildingList = function(buildings) {

    var $buildingList = $("#buildingList");
    var list = "<ul> ";
    $.each(buildings, function(index, value){
        if(value.name != undefined){
            list += "<li>" + value.name + "</li>";    
        }
    });
    list += "</ul>";
    $buildingList.append(list);

}

Gui.prototype.clearHoverBox = function() {
    $("#hoverbox").empty();
    $("#hoverbox").hide();
}

Gui.prototype.addToHoverBox = function(object, title) {

    var div = $('<div><h3>' + title + '</h3></div>');

    for (var p in object) {
	div.append($('<div>' + p + ':' + object[p] + '</div>'));
    }
    
    $("#hoverbox").append(div);
}

Gui.prototype.setHoverBoxPosition = function(pos) {

    $('#hoverbox').show();
    
    $("#hoverbox").css({
	"top": pos[1] + 50,
	"left": pos[0]
    });
}

Gui.prototype.refreshSize = function() {

    $('#gui').css({
	"height": $(window).height(),
    });
    
    $('#toggleDisplay').css({
	"width": ($(window).width() * 0.005) + 'px' 
    });

    $('#content').css({
	"width": ($(window).width() * this.width) + 'px' 
    });

    if (this.isHidden) {
	$('#gui').css({
	    "right": -1.0 * ($(window).width() * this.width) + 'px'
	});
    } else {
	$('#gui').css({
	    "right": '0px'
	});
    }
};


