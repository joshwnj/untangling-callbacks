var fs = require('fs');
var map = require('map-async');

function load (filename, cb) {
  fs.readFile(filename, 'utf8', cb);
}

module.exports = function loadFiles (filenames, callback) {
  map(filenames, load, callback);
};
