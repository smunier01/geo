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

    // quand on click sur une des check box, on passe le layer correspondant en visible/non-visible
    $("#layersCheckboxes input").on("click", function() {
	that.app.setVisible($(this).attr('name'), $(this).prop("checked"));
    });
    
    this.refreshSize();
};

Gui.prototype.refreshSize = function() {

    console.log(this.isHidden);
    
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


