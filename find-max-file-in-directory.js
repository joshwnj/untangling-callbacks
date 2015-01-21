var fs = require('fs');
var path = require('path');
var loadFiles = require('./lib/load-files');
var countNonEmptyLines = require('./lib/count-non-empty-lines');
var indexOfMax = require('./lib/index-of-max');

function findMaxFileInDirectory (dir, callback) {
  fs.readdir(dir, function (err, filenames) {
    if (err) { return callback(err); }

    // create a list of file paths
    var prependDir = function (filename) { return path.join(dir, filename); };
    findMaxFile(filenames.map(prependDir), callback);
  });
}

function findMaxFile (filenames, callback) {
  if (!filenames.length) { return callback(null, null); }

  // load all files
  loadFiles(filenames, function (err, results) {
    if (err) { return callback(err); }

    // count non-empty lines
    var lineCounts = results.map(countNonEmptyLines);
    var i = indexOfMax(lineCounts);

    // send back the result
    callback(null, filenames[i]);
  });
}

module.exports = findMaxFileInDirectory;
