var fs = require ('fs');
var vc = require ('vercmp');
var f1 = fs.readFileSync('./test/test1.list').toString().split('\n');
var f2 = fs.readFileSync('./test/test2.list').toString().split('\n');

function info(p){
  var arr = p.split(' ');
  return {
    name : arr[0],
    ver : arr[1]
  }
}

f1.forEach(function(p1){

  var obj1 = info (p1);

  for (var i = 0; i < f2.length; i++) {

    var obj2 = info (f2[i]);

    if (obj2.name == obj1.name) {
      var cmp = vc(obj1.ver, obj2.ver);
      if (cmp == 1){
        console.log (obj1, '<--', obj2);
      }
      break;
    }
  }
});

