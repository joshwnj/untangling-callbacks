module.exports = function indexOfMax (items) {
  var i = Math.max.apply(null, items);
  return items.indexOf(i);
};
