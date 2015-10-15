$(function() {

    var isHidden = true;

    var leftWidth = 0.005;
    var rightWidth = 0.08;

    function resizeGui() {
	$('#gui').css({
	    "height": $(window).height(),
	});
	
	$('#toggleDisplay').css({
	    "width": ($(window).width() * leftWidth) + 'px' 
	});

	$('#content').css({
	    "width": ($(window).width() * rightWidth) + 'px' 
	});

	if (isHidden) {
	    $('#gui').css({
		"right": -1.0 * ($(window).width() * rightWidth) + 'px'
	    });
	} else {
	    $('#gui').css({
		"right": '0px'
	    });
	}
    }

    $(window).resize(function() {
	resizeGui();
    });

    $('#toggleDisplay').on('click', function() {
	isHidden = !isHidden;
	resizeGui();
    });

    resizeGui();
});
