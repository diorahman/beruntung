var request = require ('request');
var cheerio = require ('cheerio');
var path = require ('path');
var async = require ('async');
var vercmp = require ('vercmp');
var _ = require ('lodash');
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
  
  var result = { arch: arch, updated : [], downgraded : [], added : [], removed : []};

  var a = current[arch];
  var b = previous[arch];
  var as = [];
  var bs = [];
  var dictA = {};
  var dictB = {};

  for (var i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    var carr = a[i].split(' ');
    var cver = carr.pop();
    var cname = carr.pop();

    if (cname){
      dictA[cname] = cver;
    }
  }  

  for (var j = 0; j < b.length; j++) {
    if (!b[j]) continue;
    var parr = b[j].split(' ');
    var pver = parr.pop();
    var pname = parr.pop();

    if (pname) {
      dictB[pname] = pver; 
    }
  }

  as = Object.keys (dictA);
  bs = Object.keys (dictB);

  var reversed = as.length < bs.length;
  var intersection = _.intersection(as, bs);

  var tmp = [as];
  tmp = tmp.concat(intersection);
  var ao = _.without.apply (this, tmp);

  tmp = [bs];
  tmp = tmp.concat(intersection);
  var bo = _.without.apply (this, tmp);

  for (var k in dictA) {
    if (dictB[k]) {
      var cmp = vercmp(dictA[k], dictB[k]);
      if (cmp > 0){
        console.log ("updated", k, dictB[k], dictA[k])
        result.updated.push({ name : k, from : dictB[k], to: dictA[k]});
      } else if (cmp < 0) {
        console.log ("downgraded", k, dictB[k], dictA[k])
        result.downgraded.push({ name : k, from : dictB[k], to: dictA[k]});
      }
    }
  }

  for (var l = 0; l < ao.length; l++) {
    console.log ("added", ao[l], dictA[ao[l]])
    result.added.push({ name : ao[l], from : dictA[ao[l]] });
  }

  for (l = 0; l < bo.length; l++) {
    console.log ("removed", bo[l], dictB[bo[l]])
    result.removed.push({ name : bo[l], from : dictB[bo[l]] });
  }

  return result;
}

function list (dirs, arch) {
  var file = [code, type, arch].join ('-');
  var urls = []

  dirs.forEach(function(dir){
    urls.push(path.join('/', dir, file + '.list'));
  });

  return urls;
}

module.exports = function(cb){

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

      var results = [];

      keys.forEach(function(key){
        results.push(compare(key, current, previous));
      });

      if (cb) {
        cb (null, results);  
      } else {
        console.log ("done");
      }
    });
  });
}