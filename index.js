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

  var cur = current[arch].length >= previous[arch].length ? current[arch] : previous[arch];
  var prev = current[arch].length < previous[arch].length ? current[arch] : previous[arch];

  var reverse = current[arch].length < previous[arch].length;

  console.log ('comparing', arch, '...');
  console.log ('reverse mode')
  
  for (var i = 0; i < cur.length; i++) {

    var carr = cur[i].split(' ');
    var cver = carr.pop();
    var cname = carr.pop();
    var compared = false;
    var lastJ = 0;

    for (var j = lastJ; j < prev.length; j++) {

      var parr = prev[i].split(' ');
      var pver = parr.pop();
      var pname = parr.pop();

      if (cname == pname){

        if (cname && pname) {

          var cmp = vercmp(cver, pver);
          var msg;
          
          switch (cmp) {
            case 0 :  msg = 'no update'; break;
            case 1 : msg = 'has update'; break;
            case -1 : msg = 'reverted'; break;
            default : break;
          }

          if (cmp == 1){
            console.log (cname, msg);  
          }
        } 

        compared = true;
        lastJ = j;
        break;
      }
    }

    if (j == prev.length && !compared) {
      console.log (cname);
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




