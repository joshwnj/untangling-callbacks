module.exports = function countNonEmptyLines (content) {
  return content
    .split('\n')
    .filter(Boolean)
    .length;
};
