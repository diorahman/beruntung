var request = require ('request');
var cheerio = require ('cheerio');
var path = require ('path');
var async = require ('async');
var vercmp = require ('vercmp');
var root = 'http://cdimage.blankonlinux.or.id/blankon/livedvd-harian';

var code = 'tambora';
var type = 'desktop';
var archs = ['i386', 'amd64'];

function getArch(url) {
  var file = url.split('/').pop();
  var arr = file.split('-');
  return arr[arr.length - 1].replace('.list', '');
}

function isCurrent (url) {
  var arr = url.split('/');
  return arr[arr.length - 2] == 'current';
}

function get (cb){
  var arr = [];
  request (root, function (err, res, body){
    var $ = cheerio.load (body);
    $('a').each(function (i, el){
      var href = $(this).attr('href');
      arr.push(href.substring(0, href.length - 1));
    });
    cb(err, arr);
  });  
}

function read (url, cb) {

  console.log ('reading', url, '...');

  request (root + url, function (err, res, body){
    cb (err, {current : isCurrent(res.req.path), arch : getArch (res.req.path), body : body})    
  });
}

function compare (arch, current, previous){

  console.log ('comparing', arch, '...');

  var currLen = current[arch].length;
  var prevLen = previous[arch].length;

  var a = currLen >= prevLen ? current[arch] : previous[arch];
  var b = currLen < prevLen ? current[arch] : previous[arch];
  var reverse = currLen < prevLen;

  for (var i = 0; i < a.length; i++) {

    var carr = a[i].split(' ');
    var cver = carr.pop();
    var cname = carr.pop();

    var compared = false;
    var lastJ = 0;

    for (var j = lastJ; j < b.length; j++) {
      var parr = b[j].split(' ');
      var pver = parr.pop();
      var pname = parr.pop(); 

      if (cname && pname){
        if (cname == pname){
          var cmp = vercmp(cver, pver);
          if (cmp != 0) {
            cmp = reverse ? cmp * -1 : cmp;

            var message = cmp > 0 ? "updated" : "donwgraded"
            
            if (reverse){
              console.log (message, pname, cver, pver);    
            } else {
              console.log (message, pname, pver, cver);  
            }
          }
        }
      }
    }
  }
}

function list (dirs, arch) {
  var file = [code, type, arch].join ('-');
  var urls = []

  dirs.forEach(function(dir){
    urls.push(path.join('/', dir, file + '.list'));
  });

  return urls;
}

module.exports = function(){

  console.log ('comparing ...');

  get (function(err, res){
  
    var cur = res.pop();
    var prev = res.pop();
    prev = res.pop();

    if (!prev) {
      console.log ("cannot find previous version");
      return;
    }

    var temp = [];
    var urls = [];
    var current = {};
    var previous = {};

    archs.forEach(function(a){
      temp.push(list ([cur, prev], a));
    });

    temp.forEach(function(arr){
      arr.forEach(function(a){
        urls.push(a);
      });
    });  

    async.map(urls, read, function(err, data){
      for (var i = 0; i < data.length; i++) {
        var d = data[i];
        if (d.current) {
          current[d.arch] = d.body.split('\n'); 
        } else {
          previous[d.arch] = d.body.split('\n');
        }
      }
      var keys = Object.keys(current);
      keys.forEach(function(key){
        compare(key, current, previous);
      });
      console.log ('done!');
    });
  });
}




