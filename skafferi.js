var db = require('./db');
db.connect('localhost', 'skafferi', 'CHANGE_THIS_TO_YOUR_PASSWORD', 'skafferi');
var barcodes = require('./barcodes');
var dateformat = require('dateformat');

exports.getAvailablePlaces = function(callback){
	db.query("SELECT name, img FROM places", [], callback);
};

exports.getAvailableStashes = function(place, callback){
	db.query("SELECT S.name, S.img FROM stashes S LEFT JOIN places P ON P.name = ? WHERE P.id = S.place_id", [place], callback);
};

exports.getAvailableItems = function(place, stash, callback){
	db.query("SELECT I.product AS product, I.manufacturer AS manufacturer, I.unit AS unit, SUM(I.size*IF(E.action = 'add', E.amount, -E.amount)) AS amount FROM events E LEFT JOIN items I ON I.id = E.item_id LEFT JOIN places P ON P.name = ? LEFT JOIN stashes S ON S.name = ? AND S.place_id = P.id GROUP BY I.id", [place, stash], callback);
};

exports.addEventByBarcode = function(place, stash, action, barcode, amount, callback){
	barcodes.getDataFromBarcode(db, barcode, function(result){
		if(!result.error){
			addEvent(place, stash, action, result['item_id'], amount, function(queryresult){
				callback({error:false, product:result.product, size:result.size, unit:result.unit, amount:amount});
			});
		}else{
			callback(result);
		}
	});
};

exports.addEventByManual = function(place, stash, action, barcode, product, manufacturer, size, unit, amount, callback){
	barcodes.getDataFromBarcode(db, barcode, function(result){
		if(!result.error){
			callback({error:true, msg:"Barcode already exists in DB!"});
		}else{
			db.query("INSERT INTO items (id, barcode, product, manufacturer, size, unit) VALUES (NULL, ?, ?, ?, ?, ?)", [barcode, product, manufacturer, size, unit], function(results){
				addEvent(place, stash, action, results.insertId, amount, function(result){
					callback({error:false, product: product, size:size, unit:unit, amount:amount});
				});
			});
		}
	});
};

function addEvent(place, stash, action, item_id, amount, callback){
	var date = dateformat(new Date(), "YYYY-mm-dd HH:MM:ss");
	db.query("INSERT INTO events (id, action, item_id, stash_id, amount, created) VALUES (NULL, ?, ?, (SELECT S.id FROM stashes S LEFT JOIN places P ON P.name = ? WHERE S.name = ? AND S.place_id = P.id), ?, ?)", [action, item_id, place, stash, amount, date], callback);
}