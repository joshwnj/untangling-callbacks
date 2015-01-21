Untangling Callbacks
====

Promises, generators, fibres... Extremely clever people have gone to great lengths to avoid using callbacks in javascript. Writing callback-heavy javascript can be very challenging and once you've gone beyond 5 or so levels of callback-nesting it's reasonable to start asking whether there might be a better way.

But consider that callbacks aren't a "language feature" of javascript. Callbacks are just functions. Often when we find the natural way to express our intent as functions, the rest easily falls into place. So whatever feelings you may have on the subject of callbacks there is much to be gained by learning how to get the most out of functions.


The obvious solution
----

Say we want to write the following program: `Given a directory, find the file containing the most non-empty lines.`

Even with something as simple as this, if we charge ahead without much thought we may soon find ourselves in a mess. Let's make a mess now and see what we can learn from it.

So first we'll create our function, `findMaxFile`. According to the requirements, we're going to need to find files in a directory. Easy:

```js
fs.readdir(directory, function (err, filenames) { ...
```

Now that we've got the list of filenames from the directory we need to load all of those files:

```js
  filenames.forEach(function (filename) {
    var pathToFile = path.join(directory, filename);
    fs.readFile(pathToFile, 'utf8', function (err, contents) {
      ...
```

Then we simply count the number of non-empty lines in each file, record the maximum, and send back the corresponding filename. Seems pretty straightforward.

However when we put down the hammer and step back to admire our handiwork, this is what we're looking at:

```js
var fs = require('fs');
var path = require('path');

function findMaxFileInDirectory (directory, callback) {
  // find all files in the directory
  fs.readdir(directory, function (err, filenames) {
    if (err) { return callback(err); }

    // keep track of the maximum as we go
    var maxLines = 0;
    var maxFilename = null;

    // keep track of how many files we have left to process
    var remaining = filenames.length;

    filenames.forEach(function (filename) {
      // prepend the directory to get the full file path
      filename = path.join(dir, filename);

      // load the file
      fs.readFile(filename, 'utf8', function (err, res) {
        if (err) { return callback(err); }

        var lines = res.split('\n');
        var count = 0;
        for (var i = 0; i < lines.length; i += 1) {
          // only count the non-empty lines
          if (lines[i].length > 0) { count += 1; }
        }

        // have we got a new maximum?
        if (count > maxLines) {
          maxFilename = filename;
          maxLines = count;
        }

        // when all files have been checked, send back the result
        remaining -= 1;
        if (remaining === 0) { callback(null, maxFilename); }
      });
    });
  })
}
```

From innocent beginnings we've ended up with a big chunk of code. As soon as our product gets a few "real-life business requirements" (eg. _"On Tuesdays find the file with the second-highest number of lines"_) we'll start to see the cracks. We'll be stuck with code that is hard to read, hard to test, and brittle to change. Unless we do something about it.

At this point there are plenty of steps we could take to massage out some of the knots.  [callbackhell.com](http://callbackhell.com) is full of excellent advice that you should read if you haven't already.  However, massaging alone won't address the underlying issues. We need to rethink.


Starting again
----

The way we translate our requirements into functions can have a huge impact on the end result. There are a few techniques we'll look at in this example:

 1. Use abstractions to simplify the problem
 2. Transform data in steps to avoid conditional branching
 3. Restrict knowledge of the outside world

Let's start again and see how applying those techniques changes things.

### 1. Use abstractions to simplify the problem

Before we start refactoring code it can be helpful to take a fresh look at the requirements, and see whether we can do any simplification there. To recap, our requirements are: `Given a directory, find the file...` For our purposes we could say that a directory is just a list of files, right? We could reframe the problem as `Given a list of files, find the one with the most non-empty lines.` So we can simplify by splitting the work into 2 separate functions:

```js
function findMaxFileInDirectory (directory, callback) {
  // get a list of filenames
  // ...

  findMaxFile(filenames, callback);
}

function findMaxFile (filenames, callback) {
  // find the file containing the most non-empty lines
  // ...
}
```

This might seem moot, but consider that in our main function we've gone from dealing with _"directories and files"_ to just _"files"_. We have one less thing to consider, and the code will be cleaner as a result.

We can make a similar simplification when we look at the second half of the requirements: `find the file containing the most non-empty lines.` When you think about it we're not really concerned with counting lines in a file - we're counting lines of a string! Strings are much simpler to work with, and we can easily factor out that logic without any reference to loading files:

```js
function countNonEmptyLines (string) { ...
```

### 2. Transform data in steps to avoid conditional branching

Let's continue looking at the `countNonEmptyLines` function. In our original example we had:

```js
var lines = res.split('\n');
var count = 0;
for (var i = 0; i < lines.length; i += 1) {
  // only count the non-empty lines
  if (lines[i].length > 0) { count += 1; }
}
```

This does the job, and it looks simple and familiar. But loops (eg. `for`) and conditions (eg. `if`) can quickly become very complex. Every time you see an `if` you must consider each possible outcome and trace the steps. Throw in a `break` or `continue` as well, and you'll need to account for that. And each logic branch compounds upon the complexity of the past.

There is a better way we can achieve the same goal, by transforming the data in steps rather than piece-by-piece. If we want to count non-empty lines we could use something like this:

```js
function countNonEmptyLines (content) {
  return content
    .split('\n')
    .filter(Boolean)
    .length;
}
```

There is less mental overhead here because at each step we can picture clearly how the data has been transformed:

- We start with a string: `content`
- Then we `split('\n')` to transform that into an array of strings
- Then we `filter(Boolean)` to remove any empty strings from that array
- And finally we use `.length` to tell us how many lines remain.

We can apply the same technique when we process files. In the original example we were loading one file at a time, each time counting the lines and then recording that number if a new maximum was found:

```js
filenames.forEach(function (filename) {
  fs.readFile(filename, function (err, contents) {
    var count = countNonEmptyLines(contents);
    if (count > maxLines) {
      maxFilename = filename;
      maxLines = count;
    }
  });
})
```

It's a familiar pattern, but we can simplify things by first loading all files, then counting lines of all files, and finally locating the maximum:

```js
// load all files
loadFiles(filenames, function (err, results) {
  // get an array of line-counts
  var lineCounts = results.map(countNonEmptyLines);

  // get the index of the highest number
  var i = indexOfMax(lineCounts);

  // now we know which file has the most non-empty lines
  var maxFile = filenames[i];

  ...
```

This also improves our ability to write tests since each step is a function that can be tested independently of the others.

### 3. Restrict knowledge of the outside world

A common feature of the first two techniques is that they help us write functions that have little or no knowledge of the context they are being used in. `findMaxFiles` doesn't know (or care) if the files came from a directory listing or somewhere else. `countNonEmptyLines` doesn't need to know that the string came from a file. `indexOfMax` only deals in arrays of numbers.

When a function becomes tangled with its context you have to think much harder about how to use it correctly. The less outside-knowledge a function has, the more confidently you can use it.


Putting it together
----

Finally let's take the functions we've written and see if we can stick them together to solve the problem (You can see the complete code in <https://github.com/joshwnj/untangling-callbacks>):

```js
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
```

In just a few lines of the `findMaxFile` function we can see that we're loading files, counting the lines and sending back the maximum.  We can see the original requirements shining through - they are no longer tangled up in the implementation. When we find the right way to frame our code as independent composeable functions we also often discover that plain old callbacks are not so bad after all. Callbacks are just functions, so if we can untangle the functions, callbacks are a natural fit.

There is much more that could be learned on this topic than will ever fit in my brain. If you've found some useful techniques, or have tried applying these ones, please share!
