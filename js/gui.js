$(function() {

    var isHidden = true;

    function resizeGui() {
	$('#gui').css({
	    "height": $(window).height(),
	});
	
	$('#toggleDisplay').css({
	    "width": ($(window).width() * 0.005) + 'px' 
	});

	$('#content').css({
	    "width": ($(window).width() * 0.08) + 'px' 
	});
    }

    $(window).resize(function() {
	resizeGui();
    });

    $('#toggleDisplay').on('click', function() {
	if (isHidden) {
	    $('#content').css({
		"display": "block"
	    });
	} else {
	    $('#content').css({
		"display": "none"
	    });
	}

	isHidden = !isHidden;
    });

    resizeGui();
});
