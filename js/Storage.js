/**
 *  Utilisation de localStorage pour préserver les modifications dans le mode offline
 *
 *  Exemple d'utilisation :
 *
 *    > add('edit', {'osm_id' : 1, 'highway': 'secondary'});
 *    > add('edit', {'osm_id' : 2, 'highway': 'primary'});
 *  
 *  Indiquera que l'attribut 'highway' des objet 1 & 2 doivent être respectivement modifier en
 *  'secondary' & 'primary'
 *
 *    > get('edit');
 * 
 *  returns : [{'osm_id' : 1, 'highway': 'secondary'}, {'osm_id' : 2, 'highway': 'primary'}];
 *
 *  A chaque lancement de l'application, ces modif seront appliqué aux objects OpenLayers.
 *  
 *  On peux ensuite enregistrer ces modification dans la base de données postgis
 * 
 *    > save();
 *  
 *  @class
 */
var MyStorage = function() {
    // localStorage.removeItem('edit');
};

/**
 *  Ajoute un object
 *  @param {String} key clé pouvant être 'edit', 'add' ou 'delete'.
 *  Pour le moment seulement 'edit' à été implémenté
 *  @param {Object} data valeur
 */
MyStorage.prototype.add = function(key, data) {

    var dataJSON, olddata, newdata;
    
    if (localStorage.getItem(key)) {

        olddata = JSON.parse(localStorage.getItem(key));
        newdata = null;

        if (olddata instanceof Array){
            olddata.push(data);
            newdata = olddata;
        } else {
            newdata = [olddata, data];
        }
        dataJSON = JSON.stringify(newdata);
        localStorage.setItem(key, dataJSON);
    }
    else {
        dataJSON = JSON.stringify(data);
        localStorage.setItem(key, dataJSON);
    }   
};

/**
 *  @returns {Array.<Object>} valeur 
 */
MyStorage.prototype.get = function(key) {
    return JSON.parse(localStorage.getItem(key));
};

/**
 * Enregistre les modif dans la base de données
 */
MyStorage.prototype.save = function() {

    
    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
        console.log(cordova.file);
    }

    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;


    function errorHandler(e) {
        var msg = '';

        switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
        }

        console.log('Error: ' + msg);
    }

    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
	console.log("got main dir", dir);
	dir.getFile("log.txt", {create:true}, function(file) {
	    console.log("got the file", file);
	    logOb = file;
            
            logOb.createWriter(function(fileWriter) {

                fileWriter.onwriteend = function(e) {
                    console.log('Write completed.');
                };

                fileWriter.onerror = function(e) {
                    console.log('Write failed: ' + e.toString());
                };

                // Create a new Blob and write it to log.txt.
                var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

                fileWriter.write(blob);

                console.log("ok, in theory i worked");

            }, errorHandler);
            
	});
    });
    
};

/**
 *  Retire les objet inutiles du localStorage
 *  Un object est inutile si il a la même valeur que celui de la base de données
 *  (cela permet de vider localStorage si les fichiers .json de la map ont été mis-à-jours) 
 */
MyStorage.prototype.removeUseless = function() {

};
