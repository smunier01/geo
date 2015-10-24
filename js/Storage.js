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

};

/**
 *  Retire les objet inutiles du localStorage
 *  Un object est inutile si il a la même valeur que celui de la base de données
 *  (cela permet de vider localStorage si les fichiers .json de la map ont été mis-à-jours) 
 */
MyStorage.prototype.removeUseless = function() {

};
