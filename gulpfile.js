/**
 * Numenta.org gulpfile.js build tooling
 */


// externals

var checkpages =  require('check-pages');
var gulp =        require('gulp');
var gwebserver =  require('gulp-webserver');
var package =     require('./package.json');
var sitemap =     require('gulp-sitemap');
var spawn =       require('child_process').spawn;
var tap =         require('gulp-tap');

// internals

var host = process.env.TEST_HOST || 'http://localhost';
var port = process.env.TEST_PORT || 8008;
var path = process.env.TEST_PATH || '';

var WebServer = null; // TODO: not global


// Individual Tasks

/**
 * Gulp task to check web page links
 */
gulp.task('checkpages', function (callback) {
  var urls, options, done, stream;

  urls = [
    '/',
    '/blog/',
    '/bug-report.html',
    '/code.html',
    '/committers/',
    '/contributors/',
    '/docs/',
    '/events/',
    '/faq.html',
    '/licenses/',
    '/licenses/cl/',
    '/lists/',
    '/media/',
    '/news/',
    '/search.html',
    '/styleguide/'
  ].map(function(url) {
    return host + ':' + port + path + url;
  });

  options = {
    pageUrls:         urls,
    checkLinks:       true,
    onlySameDomain:   true,
    queryHashes:      true,
    noRedirects:      true,
    noLocalLinks:     false, // true for prod ?
    noEmptyFragments: true,
    linksToIgnore:    [],
    checkXhtml:       false,
    checkCaching:     true,
    checkCompression: false, // true for prod ?
    maxResponseTime:  200,
    userAgent:        'custom-user-agent/1.2.3',
    summary:          true
  };

  done = function (error) {
    WebServer.emit('kill');
    callback(error);
  };

  stream = checkpages(console, options, done);

  return stream;
});

/**
 * Gulp task to run mocha-casperjs web test suite
 */
gulp.task('mocha-casperjs', function (callback) {
  var stream = spawn('mocha-casperjs');
  console.log('Mocha-Casper: started. Output will follow soon...');

  stream.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  stream.on('close', function (code) {
    var success = code === 0; // Will be 1 in the event of failure

    WebServer.emit('kill');

    if(! success) {
      // fail
      callback(new Error('Mocha-Casper: failed!'));
      return;
    }

    // success
    console.log('Mocha-Casper: success!');
    callback();
  });

  return stream;
});

/**
 * Gulp task to serve site from the _site/ build dir
 */
gulp.task('serve', function () {
  var stream = gulp.src('_site/').pipe(gwebserver({ port: port }));
  WebServer = stream;
  return stream;
});

/**
 * Gulp task to generate sitemap.xml
 */
gulp.task('sitemap', function () {
  var stream = gulp.
    src([
      '**/*.html',
      '!{_data,_includes,_layouts,_sass,_site,assets,images,javascripts,lib,node_modules,resources,stats,styleguide/_config,stylesheets,test,tools}/**',
      '**/_posts/*.md',
      ''
    ]).
    pipe(tap(function (file) {
      if (file.path.match(/.*\/_posts\/.*\.md$/)) {
        file.path = file.path.replace(/_posts\/(\d{4})-(\d{2})-(\d{2})-/, "$1\/$2\/$3\/");
        file.path = file.path.replace(/\.md$/, '.html');
        return file;
      }
    })).
    pipe(sitemap({ siteUrl: package.homepage })).
    pipe(gulp.dest('./'));

  return stream;
});


// Task Compositions

gulp.task('default', [], function () {});

gulp.task('linkcheck', [ 'serve', 'checkpages' ]);

gulp.task('webtest', [ 'serve', 'mocha-casperjs' ]);
