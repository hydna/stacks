(function (exports) {

  var INACTIVITY_TIMEOUT  = 30 * 1000; // 30 sec
  var DESTROY_TIMEOUT  = 60 * 1000; // 60 sec
  var REF_TIMEOUT = 20 * 1000; // 20 sec

  var maxWidth = 0;
  var maxHeight = 0;
  var button;
  var hydnaurl;

  if (typeof HYDNA_URL == "undefined") {
    hydnaurl = "stacks.hydna.net/9999"
  } else {
    hydnaurl = HYDNA_URL
  }

  exports.start = start;

  // Emulate requestAnimationFrame
  // Thanks http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  var requestAnimationFrame = window.requestAnimationFrame ||
    (function(){
       return  window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame    ||
               window.oRequestAnimationFrame      ||
               window.msRequestAnimationFrame     ||
               function(/* function */ callback, /* DOMElement */ element){
                 window.setTimeout(callback, 1000 / 60);
               };
     })();



  function Container (id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.height = 0;
    this.barAreaHeight = 0;
    this.usedSlots = 0;
    this.slots = [];
    this.timeout = null;
  }


  Container.all = [];


  Container.create = function (id) {
    var container = new Container(id);
    this.all.push(container);
    this._recalcPositions();
    container.x = (maxWidth / 2);
    return container;
  };


  Container.byRef = function (ref) {
    var all = this.all;
    for (var i = 0, l = all.length; i < l; i++) {
      if (all[i].id == ref) return all[i];
    }
    return null;
  };


  Container._recalcPositions = function () {
    var all = this.all;
    var container;
    var containerw;
    var areaw;
    var startx;

    all = this.all.sort(function (a, b) {
      if (a.usedSlots == b.usedSlots) return 0;
      return a.usedSlots > b.usedSlots ? 1 : -1;
    });

    containerw = Bar.WIDTH + 1;
    areaw = containerw * all.length;

    startx = (maxWidth / 2) - (areaw / 2);

    for (var i = 0, l = all.length; i < l; i++) {
      container = all[i];
      container.setPos(startx);
      container.setHeight(maxHeight);
      startx += Bar.WIDTH + 1;
    }
  };


  Container.prototype.setPos = function (x) {
    this.targetX = x;
  };


  Container.prototype.setHeight = function (height) {
    var totalSlots;
    var slots;

    this.height = height;
    this.barAreaHeight = height / 2;

    totalSlots = parseInt(this.barAreaHeight / Bar.HEIGHT);
    slots = new Array(totalSlots);

    for (var i = 0, l = slots.length; i < l; i++) {
      slots[i] = this.slots[i];
    }

    this.slots = slots;
  };


  Container.prototype.update = function (delta, time) {
    var slots = this.slots;
    var mr = 5;
    var bar;

    for (var i = 0, l = slots.length; i < l; i++) {
      if ((bar = slots[i])) {
        bar.update(delta, time);
      }
    }

    if (this.x < this.targetX) {
      this.x = this.x + mr > this.targetX ? this.targetX : this.x + mr;
    } else if (this.x > this.targetX) {
      this.x = this.x - mr < this.targetX ? this.targetX : this.x - mr;
    }

  };


  Container.prototype.render = function (ctx) {
    var slots = this.slots;
    var bar;

    ctx.save();
    ctx.translate(this.x, this.y);

    for (var i = 0, l = slots.length; i < l; i++) {
      if ((bar = slots[i])) {
        bar.render(ctx);
      }
    }

    ctx.fillStyle = "#666";
    ctx.fillRect(0, this.barAreaHeight, Bar.WIDTH, 1);

    ctx.fillStyle = "white";
    ctx.translate(5, this.barAreaHeight + 20);
    ctx.rotate(90 * Math.PI / 270);
    ctx.font = "12px Helvetica"
    ctx.fillText(this.id, 0, 0);
    ctx.restore();
  };


  Container.prototype.createBar = function (id) {
    var bar = new Bar(id, this.id);
    this._addBar(bar);
    return bar;
  };


  Container.prototype.moveBar = function (bar, target) {
    var self = this;
    var oldremove = bar.onremove;

    bar.onremove = function () {
      oldremove && oldremove.apply(bar);
      bar.heartbeat(self.id);
      self._addBar(bar);
    };

    bar.remove();
  };


  Container.prototype._addBar = function (bar) {
    var self = this;
    var slots = this.slots;
    var index = slots.length;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    while (index--) {
      if (slots[index] == void(0)) {
        self.slots[index] = bar;
        bar.setIndex(index);
        bar.onremove = function () {
          self._removeBar(this);
          this.onremove = null;
        };
        self.usedSlots++;
        return bar;
      }
    }
  };


  Container.prototype._removeBar = function (bar) {
    var self = this;
    this.slots[bar.index] = void(0);
    this.resortSlotsFrom(bar.index);
    this.usedSlots--;
    if (!this.usedSlots) {
      this.timeout = setTimeout(function () {
        self.destroy();
      }, REF_TIMEOUT);
    }
  };


  Container.prototype.resortSlotsFrom = function (index) {
    var slots = this.slots;
    var bar;

    while ((bar = slots[--index])) {
      slots[index] = void(0);
      slots[index + 1] = bar;
      bar.setIndex(index + 1);
    }
  };


  Container.prototype.destroy = function () {
    var index = Container.all.indexOf(this);
    Container.all.splice(index, 1);
    Container._recalcPositions();
  };


  function Bar (id, ref) {
    this.id = id;
    this.ref = ref;
    this.index = -1;
    this.y = 0;
    this.targetY = 0;
    this.o = 0;
    this.targetO = 1;
    this.time = (new Date()).getTime();
    this.destroying = false;
    this.removing = false;
    this.color = Bar.COLOR_NEWVISITOR;

    Bar.all[id] = this;
  }


  Bar.all = {};


  Bar.WIDTH = 20;
  Bar.HEIGHT = 4;

  Bar.COLOR_NEWVISITOR = "207,70,71";
  Bar.COLOR_PAGEVIEW = "235,123,89";
  Bar.COLOR_INACTIVE = "82,70,86";


  Bar.prototype.onremove = function () {};


  Bar.prototype.setIndex = function (index) {
    this.index = index;
    this.targetY = index * Bar.HEIGHT;
  };


  Bar.prototype.heartbeat = function (ref) {

    this.time = (new Date()).getTime();
    this.color = Bar.COLOR_PAGEVIEW;

    if (typeof ref == "string") {
      this.y = 0;
      this.ref = ref;
      this.targetO = 1;
    } else {
      this.o = 0.3;
    }
  };


  Bar.prototype.update = function (delta, time) {

    if (this.o < this.targetO) {
      this.o = this.o + 0.05 > this.targetO ? this.targetO : this.o + 0.05;
    } else if (this.o > this.targetO) {
      this.o = this.o - 0.05 < this.targetO ? this.targetO : this.o - 0.05;
    }

    if (this.removing && this.o == 0) {
      this.removing = false;
      this.onremove && this.onremove();
      return;
    }

    if (this.y < this.targetY) {
      this.y = this.y + 10 > this.targetY ? this.targetY : this.y + 10;
    }

    if (time > this.time + INACTIVITY_TIMEOUT) {
      this.color = Bar.COLOR_INACTIVE;
    }

    if (time > this.time + DESTROY_TIMEOUT) {
      this.destroy();
    }

  };


  Bar.prototype.render = function (ctx) {
    ctx.fillStyle = "rgba(" + this.color + "," + this.o + ")";
    ctx.fillRect(0, this.y, Bar.WIDTH, Bar.HEIGHT);
  };


  Bar.prototype.remove = function () {
    if (this.removing) {
      return;
    }
    this.targetO = 0;
    this.removing = true;
  };


  Bar.prototype.destroy = function () {
    if (this.destroying) {
      return;
    }
    this.destroying = true;
    this.remove();
    delete Bar.all[this.id];
  };


  function start () {
    var canvas = document.getElementsByTagName("canvas")[0];
    var body = document.getElementsByTagName("body")[0];
    var context = canvas.getContext("2d");
    var time = (new Date()).getTime();
    var running = false;
    var chan;

    body.className = "";
    onresize();

    chan = new HydnaChannel(hydnaurl, 'r');

    chan.onopen = function(e) {
      running = true;
      renderloop();
    };

    chan.onmessage = function (e) {
      var container;
      var oldcontainer;
      var uuid;
      var ref;
      var bar;
      var m;

      if (!(m = /([a-z0-9\-]+)\s(.+)/.exec(e.data))) {
        // Ignore messages that is not of valid format
        return;
      }

      uuid = m[1];
      ref = m[2];

      if (!(bar = Bar.all[uuid])) {

        if (!(container = Container.byRef(ref))) {
          container = Container.create(ref);
        }

        bar = container.createBar(uuid);
      } else {

        if ((bar.ref !== ref) && (oldcontainer = Container.byRef(bar.ref))) {

          if (!(container = Container.byRef(ref))) {
            container = Container.create(ref);
          }

          container.moveBar(bar, oldcontainer);

        } else {
          bar.heartbeat();
        }
      }

    };

    chan.onerror = function(e) {
      alert(e.message);
    };


    function renderloop () {
      var oldtime = time;
      var delta;

      time = (new Date()).getTime();

      delta = time - oldtime;

      context.clearRect(0, 0, maxWidth, maxHeight);

      for (var i = 0, l = Container.all.length; i < l; i++) {
        Container.all[i].update(delta, time);
        Container.all[i].render(context);
      }

      running && requestAnimationFrame(renderloop);
    }

  }


  function onresize () {
    var canvas = document.getElementsByTagName("canvas")[0];

    canvas.width = maxWidth = window.innerWidth;
    canvas.height = maxHeight = window.innerHeight;

    Container._recalcPositions();
  }



  window.attachEvent ? window.attachEvent("resize", onresize)
                     : window.addEventListener("resize", onresize, false);

})(window.stacks = {});