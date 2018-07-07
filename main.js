var currentScroll = 0;

function getElementWidth(element) {
  return d3.select(element).node().getBoundingClientRect().width;
}

$(document).ready(function () {
  var CTRL_PRESSED = false;

  //if ctrl pressed
  $('body').on('keydown', function (event) {
    if (event.ctrlKey)
      CTRL_PRESSED = true;
  }).on('keyup', function (event) {
    CTRL_PRESSED = false;
  });

  var dayWidth = $('#mainView').width();
  $('.week-day').width(dayWidth);

  $('body').height($('.week-day-list').width() + 'px');
  
  
  const ONE_HOUR_WIDTH = getElementWidth('.overflow-layout') / 7 / 24;
  
  //draw lines
  var day = $('.week-day');
  var pos = 0;
  for (let i = 1; i <= 24; i++) {
    if ((i - 1) % 3) {
      day.append(`<div class="hours" style="left:${pos}px;"></div>`);
    }
    else {
      if (i == 24)
        day.append(`<div class="hours" style="left:${pos}px; height:100px"></div>`);
      else
        day.append(`<div class="hours" style="left:${pos}px; height:100px"><div class="zahle" >${i - 1}</div></div>`);
    }
    pos = ONE_HOUR_WIDTH * i - 2;
  }

  //scroll
  $(window).scroll(function () {
    $('.wrapper').scrollLeft(this.window.scrollY);
  });
  
  //round for exactly side of grid
  function alignWidthToHour(value) {
    return Math.round(value / ONE_HOUR_WIDTH) * ONE_HOUR_WIDTH;
  }

  var timeSelectors = [];

  //remove me please
  function removeTimeSelector() {
    if (CTRL_PRESSED) {
      this.parentNode.removeChild(this);
      var index = timeSelectors.findIndex((x) => x.target == this);
      timeSelectors.splice(index, 1);
    }
  }
  
  //neighbour from left side
  function getLeftNeighbour(who, hours) {
    var minDist = Number.MAX_VALUE;
    var minNeigbour = undefined;
    hours = hours || who.getFromHours();

    for (const timeSelector of timeSelectors) {
      var distance = hours - timeSelector.getToHours();
      if (distance >= 0 && distance <= minDist && who != timeSelector) {
        minDist = distance;
        minNeigbour = timeSelector;
      }
    }

    return minNeigbour;
  }

  //neighbour from right side
  function getRightNeighbour(who, hours) {
    var minDist = Number.MAX_VALUE;
    var minNeigbour = undefined;
    hours = hours || who.getToHours();

    for (const timeSelector of timeSelectors) {
      var distance = timeSelector.getFromHours() - hours;
      if (distance >= 0 && distance <= minDist && who != timeSelector) {
        minDist = distance;
        minNeigbour = timeSelector;
      }
    }

    return minNeigbour;
  }

  //auto scroll when bar is draging
  function scrollWeekDaysIfNeeded() {
    var wrapper = document.querySelector('.wrapper');
    var wrapperMouse = d3.mouse(wrapper);
    if (wrapperMouse[0] < 0) {
      var beforeScroll = $(wrapper).scrollLeft();
      $(wrapper).scrollLeft(beforeScroll + wrapperMouse[0]);
    }
  }
  
  //click and drag
  function dragTimeSelector(timeSelector, parent, element) {
    var dragStartPos;
    var delta = 0;
    var leftNeighbour;
    var rightNeighbour;

    var dragTarget = d3.drag().on('start', () => {
      delta = 0;
      dragStartPos = d3.mouse(parent);
      leftNeighbour = getLeftNeighbour(timeSelector);
      rightNeighbour = getRightNeighbour(timeSelector);

      d3.select(timeSelector.target).selectAll('.drag-bar').classed('drag', true);
    }).on('drag', () => {
      var pos = d3.mouse(parent);

      var newDelta = pos[0] - dragStartPos[0];

      var newRight = alignWidthToHour(timeSelector.right - newDelta);
      var newLeft = alignWidthToHour(timeSelector.left + newDelta);

      if (newLeft < 0 || newRight < 0) {
        return;
      }

      var newRightHour = Math.round((newLeft + timeSelector.getTargetWidth()) / ONE_HOUR_WIDTH);
      var newLeftHour = Math.round(newLeft / ONE_HOUR_WIDTH);

      if (leftNeighbour && leftNeighbour.getToHours() > newLeftHour) {
        return;
      }

      if (rightNeighbour && newRightHour > rightNeighbour.getFromHours()) {
        return;
      }

      delta = newDelta;

      d3.select(element).style('left', newLeft + 'px');
      d3.select(element).style('right', newRight + 'px');
    }).on('end', () => {
      timeSelector.right = alignWidthToHour(timeSelector.right - delta);
      timeSelector.left = alignWidthToHour(timeSelector.left + delta);

      d3.select(element).style('left', timeSelector.left + 'px');
      d3.select(element).style('right', timeSelector.right + 'px');

      d3.select(timeSelector.target).selectAll('.drag-bar').classed('drag', false);
    });

    d3.select(element).call(dragTarget);
  }
  
  //drag left bar
  function dragLeftSide(timeSelector, parent, element) {
    var leftNeighbour;

    var dragLeftSide = d3.drag()
      .on('start', () => {
        leftNeighbour = getLeftNeighbour(timeSelector);
        d3.select(timeSelector.target).selectAll('.drag-bar').classed('drag', true);
      })
      .on('drag', () => {
        var pos = d3.mouse(parent);

        if (pos[0] <= 0) {
          pos[0] = 0;
        } else if (pos[0] >= getElementWidth(parent) - timeSelector.right - TimeSelector.MIN_CONTAINER_WIDTH) {
          pos[0] = getElementWidth(parent) - timeSelector.right - TimeSelector.MIN_CONTAINER_WIDTH;
        }

        var newHours = Math.round(pos[0] / ONE_HOUR_WIDTH)

        if (leftNeighbour && newHours < leftNeighbour.getToHours()) {
          return;
        }

        timeSelector.left = alignWidthToHour(pos[0]);

        scrollWeekDaysIfNeeded();

        d3.select(element).style('left', timeSelector.left + 'px');
        translateInfoIfNeeded(timeSelector);
      })
      .on('end', () => {
        d3.select(timeSelector.target).selectAll('.drag-bar').classed('drag', false);
      });

    d3.select(element).select('.drag-bar.left').call(dragLeftSide);
  }
  
  //drag right bar
  function dragRightSide(timeSelector, parent, element) {
    var elementSelect = d3.select(element);
    var rightNeighbour;

    var dragRightSide = d3.drag()
      .on('start', () => {
        rightNeighbour = getRightNeighbour(timeSelector);
        d3.select(timeSelector.target).selectAll('.drag-bar').classed('drag', true);
      })
      .on('drag', () => {
        var pos = d3.mouse(parent);

        if (pos[0] >= getElementWidth(parent)) {
          pos[0] = getElementWidth(parent);
        } else if (pos[0] <= timeSelector.left + ONE_HOUR_WIDTH) {
          pos[0] = timeSelector.left + ONE_HOUR_WIDTH;
        }

        var newHours = Math.round(pos[0] / ONE_HOUR_WIDTH)

        if (rightNeighbour && newHours > rightNeighbour.getFromHours()) {
          return;
        }

        var newRight = alignWidthToHour(getElementWidth(parent) - pos[0]);
        timeSelector.right = alignWidthToHour(newRight);

        elementSelect.style('right', timeSelector.right + 'px');
        translateInfoIfNeeded(timeSelector);
      })
      .on('end', () => {
        d3.select(timeSelector.target).selectAll('.drag-bar').classed('drag', false);
      });

    elementSelect.select('.drag-bar.right').call(dragRightSide);
  }

  
  //add new time selector
  d3.select('.overflow-layout').on('dblclick', function (e) {
    var thisWidth = getElementWidth(this);
    var pos = d3.mouse(this);

    var left = alignWidthToHour(pos[0]);
    var right = alignWidthToHour(thisWidth - pos[0] - ONE_HOUR_WIDTH * 2);

    var leftHours = Math.round(left / ONE_HOUR_WIDTH);
    var rightNeighbour = getRightNeighbour(undefined, leftHours);


    if (rightNeighbour && rightNeighbour.getFromHours() == leftHours) {
      left -= ONE_HOUR_WIDTH;
      leftHours -= 1;
    }

    if (rightNeighbour && rightNeighbour.getFromHours() < leftHours + 2) {
      right = thisWidth - rightNeighbour.left;
    }


    var ts = new TimeSelector(this, left, right);
    dragTimeSelector(ts, this, ts.target);
    dragLeftSide(ts, this, ts.target);
    dragRightSide(ts, this, ts.target);
    timeSelectors.push(ts);
    translateInfoIfNeeded(ts);
  });

  class TimeSelector {
    static get MIN_CONTAINER_WIDTH() { return ONE_HOUR_WIDTH; };

    constructor(parent, left, right) {
      this._parent = parent;
      this._parentSelect = d3.select(parent);

      this.initTarget(left, right);

      this.left = left;
      this.right = right;
    }

    get left() { return this._left; }
    set left(value) { this._left = value; this.updateData(); }

    get right() { return this._right; }
    set right(value) { this._right = value; this.updateData(); }

    updateData() {
      this.leftChange();
      this.rightChange();
      this.durationChange();
      this.updateDashes();
    }

    getFromHours() {
      return Math.round(this.left / ONE_HOUR_WIDTH);
    }

    getToHours() {
      return Math.round((this.left + this.getTargetWidth()) / ONE_HOUR_WIDTH);
    }

    leftChange() {
      var timeFrom = this.getFromHours();

      if (timeFrom > 23) {
        timeFrom = timeFrom - Math.floor(timeFrom / 24) * 24;
      }

      d3.select(this.target).select('.time-from').text(timeFrom + ':00');
    }

    rightChange() {
      var timeFrom = this.getToHours();

      if (timeFrom > 23) {
        timeFrom = timeFrom - Math.floor(timeFrom / 24) * 24;
      }

      d3.select(this.target).select('.time-to').text(timeFrom + ':00');
    }

    durationChange() {
      var delta = Math.round(this.getTargetWidth() / ONE_HOUR_WIDTH);
      d3.select(this.target).select('.time-duration').text(delta + 'h');
    }

    get target() { return this._target; }

    initTarget(left, right) {
      this._target = this._parent.appendChild(this.template());
      this._targetSelect = d3.select(this._target)
        .on('dblclick', function () {
          d3.event.stopPropagation();
        })
        .on('click', removeTimeSelector);

      this.left = left;
      this.right = right;

      // fix right and left side;
      this._targetSelect.style('right', right + 'px');
      this._targetSelect.style('left', left + 'px');
    }

    initSidesDrag() {
      var dragRightSide = d3.drag().on('drag', () => {
        var pos = d3.mouse(this._parent);

        if (pos[0] >= this.getParentWidth()) {
          pos[0] = this.getParentWidth();
        } else if (pos[0] <= this.left + 10) {
          pos[0] = this.left + 10;
        }

        var newRight = this.getParentWidth() - pos[0];
        this.right = newRight;

        this._targetSelect.style('right', newRight + 'px');
      });

      this._targetSelect.select('.drag-bar.right').call(dragRightSide);
    }

    getParentWidth() {
      return getElementWidth(this._parent)
    }

    getTargetWidth() {
      return getElementWidth(this._target);
    }

    updateDashes() {
      this._targetSelect.select('.drag-bar.left').classed('long', !(this.getFromHours() % 3));
      this._targetSelect.select('.drag-bar.right').classed('long', !(this.getToHours() % 3));
    }

    template() {
      var html = `
        <div class="time-selector">
          <div class="drag-bar left"></div>
          <div class="time-selector-info">
            <span class="time-from">FROM</span>
            <span class="time-duration">DURATION</span>
            <span class="time-to">TO</span>
          </div>
          <div class="drag-bar right"></div>
        </div>
      `.trim();

      var template = document.createElement('template');
      template.innerHTML = html;
      return template.content.firstChild;
    }
  }
  
  function translateInfoIfNeeded(timeSelector){
    var targetWidth=timeSelector.getTargetWidth();
    var targetChild=$(timeSelector.target).children('.time-selector-info');
    var infoWidth=0;
    targetChild.children().each((index, e) => infoWidth+=$(e).width());
    if(targetWidth<=infoWidth)
      targetChild.addClass("translate-info");
    else
      targetChild.removeClass("translate-info");
    
  }
});

//Instruction
var modal = document.getElementById('instruction');
var btn = document.getElementById("questbtn");
var span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
    modal.style.display = "block";
}

span.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

