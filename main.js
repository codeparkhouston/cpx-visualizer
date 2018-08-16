/**************************************
** Overview
**
** Code in this file starts with definitions for the simpler functions
** (calculations, reshaping the data).
**
** Later in the file, functions for the animation itself
** are defined.
**
** The very last part of this file is what runs the visualization
** using the functions defined previously.
**************************************/


/************************************
** Variables that are used throughout
************************************/
// Frame rate is in frames per milliseconds
var FRAMERATE = 50 / 1000;
var COLORS = {
  minimum: "blue",
  maximum: "red",
};


/**************************************
** Functions for calculating things.
**************************************/

// Returns the roll in radians from x, y, and z acceleration
function calculateRoll(x, y, z) {
  return Math.atan2(y, z);
}

// Returns the pitch in radians from x, y, and z acceleration
function calculatePitch(x, y, z) {
  return Math.atan2(-x, Math.sqrt(y * y + z * z));
}

// Returns the degrees from radians
function calculateRadiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

// Returns the Fahrenheit from Celsius
function calculateCelsiusToFahrenheit(celsius) {
  return celsius * 9 / 5 + 32;
}


/**************************************
** Returns response from data.txt as a text string
**************************************/
// Takes the response from loading or fetching the data.txt file and translating it to text
function transformResponseToString(response) {
  return response.text();
}

/**************************************
Takes text or string that is of the comma separated values (CSV) format and
returns arrays of arrays of numbers.

CSV becomes [
  [ 12.0, 20304, 304.0, 2039, 129.0 ],
  [ 3,    403,   2302,  349,  3491  ],
  [ 45,   49,    239.4, 599,  2.192 ]
]
for example.
**************************************/
function transformStringToData(string) {
  var data = string.trim().split('\n');

  return data.map(function(dataLine) {
    var row = dataLine.split(',');
    return row.map(function(point){
      return point.trim() * 1;
    });
  });
}


/**************************************
** Functions for cleaning and calculating data
**************************************/

// Takes arrays of arrays of numbers.
// Returns arrays of objects.
// Each object represents a row of data.
// Keys of objects are the labels, and the values themselves are the data values.
function labelData(data) {
  return data.map(function(row, index) {
    var [x, y, z, temperatureC, light] = row;
    var temperatureF = calculateCelsiusToFahrenheit(temperatureC);

    return {
      acceleration: { x, y, z },

      temperatureC,
      temperatureF,

      light,

      // time data was recorded in milliseconds.
      timeRecorded: index * 1000,
    };
  });
}

// Takes labelled data, or arrays of objects, and performs calculations
// for color scaled to temperature value and
// for rotation with roll and pitch calculated from accelerations in x, y, and z.
// Returns array of objects.
function makeAnimationData(data) {

  var temperaturesF = data.map((row) => row.temperatureF);
  var minimumTemperature = {
    value: Math.min(...temperaturesF),
    color: COLORS.minimum,
  };
  var maximumTemperature = {
    value: Math.max(...temperaturesF),
    color: COLORS.maximum,
  };
  var scaleTemperatureFToColor = d3.scaleLinear()
                                    .domain([
                                      minimumTemperature.value,
                                      maximumTemperature.value,
                                    ])
                                    .interpolate(d3.interpolateRgb)
                                    .range([
                                      minimumTemperature.color,
                                      maximumTemperature.color,
                                    ]);

  return data.map(function(row) {
    var {
      acceleration: { x, y, z },
      temperatureF,
      light,
      timeRecorded,
    } = row;

    var pitch = calculatePitch(x, y, z);
    var roll = calculateRoll(x, y, z);
    var rotation = [pitch, 0, roll];

    var color = scaleTemperatureFToColor(temperatureF);

    var calculatedData = {
      minimumTemperature,
      maximumTemperature,

      // actual data time adjusted to the framerate
      // animation will play faster than how data was recorded.
      // unit is milliseconds.
      timeLapse: timeRecorded * FRAMERATE,

      pitch: calculateRadiansToDegrees(pitch),
      roll: calculateRadiansToDegrees(roll),

      rotation,
      color,
    };

    return Object.assign(calculatedData, row);
  });
}



/**************************************
** Functions for the animation of data
**
** This section includes functions for animating the CPX 3D model
** and labelling the visualization based on the data at a timepoint.
**************************************/

// Returns the closest data at any timestamp
function getDataForTimestamp(data, timestamp) {
  return data.find(function (dataPoint) {
    if (Math.abs(dataPoint.timeLapse - timestamp) < (FRAMERATE * 1000 / 2) ) {
      return dataPoint;
    }
  });
}

// Modifies the rotation and color of the 3D model based on timepoint data
function animate(model, timepoint) {
  model.object3D.rotation.set.apply(model.object3D.rotation, timepoint.rotation);
  model.children[0].children[0].setAttribute('color', timepoint.color);
}

// Returns the HTML for the label based on the timepoint.
function makeLabelHTMLForTimepoint(timepoint) {
  return `
<h2>${(timepoint.timeRecorded / 1000).toFixed(0)} seconds</h2>
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

// Modifies the HTML in the label element with label HTML at timepoint.
function label(element, timepoint) {
  var html = makeLabelHTMLForTimepoint(timepoint);
  element.innerHTML = html;
}

// For provided data, this function will start and recursively
// animate and label the visualization until there are no more
// data points to display.
function animateFromData(data) {

  // Select the 3D model element and the label element.
  var modelElement = document.getElementById('cpx');
  var informationElement = document.getElementById('information');
  
  var dataEndTimestamp = data[data.length - 1].timeLapse;
  
  // For any step of the animation...
  function step(timestamp) {
    // Get the data at the current timestamp.
    var timepoint = getDataForTimestamp(data, timestamp);

    // If there is data for this timestamp...
    if (timepoint) {
      // animate the 3D model and label the data
      animate(modelElement, timepoint);
      label(informationElement, timepoint);
    }
    
    // Play the next step in the animation if timestamp is less than
    // the last data timeLapse time --
    // If the animation has not yet ended.
    if (timestamp < dataEndTimestamp) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}



/**************************************
** Running the visualization
**************************************/

// This code is what runs all previous functions and actually
// gets the data from `data.txt` file,
// turns the text file into data,
// and animates the 3D model based on the data.
fetch('data.txt')
  .then(transformResponseToString)
  .then(transformStringToData)
  .then(labelData)
  .then(makeAnimationData)
  .then(animateFromData);
