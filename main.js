(function(){

  const FRAMERATE = 50;
  const COLORS = {
    minimum: "blue",
    maximum: "red",
  };
  
  // Returns in radians the roll
  function calculateRoll(x, y, z) {
    return Math.atan2(y, z); // * 180.0 / Math.PI;
  }

  // Returns in radians the pitch
  function calculatePitch(x, y, z) {
    return Math.atan2(-x, Math.sqrt(y * y + z * z)); // * 180.0 / Math.PI;
  }

  function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
  }
  
  function celsiusToFahrenheit(celsius) {
    return celsius * 9 / 5 + 32;
  }
  
  function responseToString(response) {
    return response.text();
  }
  
  function dataStringToData(string) {
    var data = string.trim().split('\n');

    return data.map(function(dataLine) {
      var row = dataLine.split(',');
      return row.map(function(point){
        return point.trim() * 1;
      });
    });
  }

  function dataToLabelledData(data) {
    var temperaturesC = data.map((row) => row[3]);
    var minimumTemperature = {
      value: celsiusToFahrenheit(Math.min(...temperaturesC)),
      color: COLORS.minimum,
    };
    var maximumTemperature = {
      value: celsiusToFahrenheit(Math.max(...temperaturesC)),
      color: COLORS.maximum,
    };
    
    var scaleTemperatureF = d3.scaleLinear()
                              .domain([
                                minimumTemperature.value,
                                maximumTemperature.value,
                              ])
                              .interpolate(d3.interpolateRgb)
                              .range([
                                minimumTemperature.color,
                                maximumTemperature.color,
                              ]);

    return data.map(function(row, index) {
      var [x, y, z, temperatureC, light] = row;
      var temperatureF = celsiusToFahrenheit(temperatureC);

      var pitch = calculatePitch(x, y, z);
      var roll = calculateRoll(x, y, z);
      var rotation = [pitch, 0, roll];

      var color = scaleTemperatureF(temperatureF);

      return {
        acceleration: { x, y, z },

        temperatureC,
        temperatureF,
        minimumTemperature,
        maximumTemperature,

        light,

        timeRecorded: index,
        timeLapse: index * FRAMERATE,

        pitch: radiansToDegrees(pitch),
        roll: radiansToDegrees(roll),

        rotation,
        color,
      };
    });
  }

  function getDataForTime(data, animationTime) {
    return data.find(function (dataPoint) {
      if (Math.abs(dataPoint.timeLapse - animationTime) < (FRAMERATE / 2) ) {
        return dataPoint;
      }
    });
  }

  function makeLabelHTMLForTimepoint(timepoint) {
    return `
<h2>${timepoint.timeRecorded} seconds</h2>
<h3>Accelerometer</h3>
<p><label>x</label> ${timepoint.acceleration.x.toFixed(2)}</p>
<p><label>y</label> ${timepoint.acceleration.y.toFixed(2)}</p>
<p><label>z</label> ${timepoint.acceleration.z.toFixed(2)}</p>
<h3>Rotation</h3>
<p><label>Pitch</label> ${timepoint.pitch.toFixed(2)}</p>
<p><label>Roll</label> ${timepoint.roll.toFixed(2)}</p>
<h3 style="color: ${timepoint.color};">Temperature</h3>
<p>
  <label style="color: ${timepoint.minimumTemperature.color};">Min: </label>${timepoint.minimumTemperature.value.toFixed(2)} (F)
  <label style="color: ${timepoint.maximumTemperature.color};">Max: </label>${timepoint.maximumTemperature.value.toFixed(2)} (F)
</p>
<p><label>(F)</label> ${timepoint.temperatureF.toFixed(2)}</p>
<p><label>(C)</label> ${timepoint.temperatureC.toFixed(2)}</p>
<h3>Light</h3>
<p><label>(lumens)</label> ${timepoint.light.toFixed(2)}</p>
    `;
  }
  
  function animate(model, timepoint) {
    model.object3D.rotation.set.apply(model.object3D.rotation, timepoint.rotation);
    model.children[0].children[0].setAttribute('color', timepoint.color);
  }

  function label(element, timepoint) {
    var html = makeLabelHTMLForTimepoint(timepoint);
    element.innerHTML = html;
  }
  
  var modelElement = document.getElementById('cpx');
  var informationElement = document.getElementById('information');

  fetch('./data.txt')
    .then(responseToString)
    .then(dataStringToData)
    .then(dataToLabelledData)
    .then(function(data) {

      function step(timestamp) {
        var timepoint = getDataForTime(data, timestamp);
        if (timepoint) {
          animate(modelElement, timepoint);
          label(informationElement, timepoint);
        }
        if (timestamp < data[data.length - 1].timeLapse) {
          window.requestAnimationFrame(step);
        }
      }

      window.requestAnimationFrame(step);

    });
}());