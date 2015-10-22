var MyStorage = function() {
    //localStorage.removeItem('edit');
};

MyStorage.prototype.addToStorage = function(key, data) {
    
    if (localStorage.getItem(key)) {

	var olddata = JSON.parse(localStorage.getItem(key));
	var newdata = null;
	
	if (olddata instanceof Array){
            olddata.push(data);
            newdata = olddata;
	} else {
            newdata = [olddata, data];
	}
	var dataJSON = JSON.stringify(newdata);
	localStorage.setItem(key, dataJSON);
    }
    else {
	var dataJSON = JSON.stringify(data);
	localStorage.setItem(key, dataJSON);
    }   
};

MyStorage.prototype.get = function(key) {
    return JSON.parse(localStorage.getItem(key));
};
