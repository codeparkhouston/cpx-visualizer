(function(){
  function calculateRoll(x, y, z) {
    return Math.atan2(y, z); // * 180.0 / Math.PI;
  }

  function calculatePitch(x, y, z) {
    return Math.atan2(-x, Math.sqrt(y * y + z * z)); // * 180.0 / Math.PI;
  }

  function dataStringToData(string) {
    var data = string.trim().split('\n');

    return data.map(function(dataLine) {
      var row = dataLine.split(',');

      var pitch = calculatePitch.apply(null, row);
      var roll = calculateRoll.apply(null, row);

      return [pitch, 0, roll, row[3], row[4]];
    });
  }

  var model = document.getElementById('cpx');
  var light = document.getElementById('light');

  fetch('./data.txt')
    .then(function(response) {
      return response.text();
    })
    .then(dataStringToData)
    .then(function(data) {
      var temperatures = data.map((row) => row[3].trim() * 1);
      var lights = data.map((row) => row[4].trim() * 1);

      var scaleTemperature = d3.scaleLinear()
        .domain([Math.min(...temperatures), Math.max(...temperatures)])
        .interpolate(d3.interpolateRgb)
        .range(["#ff0000", "#0000ff"]);

      var scaleLight = d3.scaleLinear()
        .domain([Math.min(...lights), Math.max(...lights)])
        .interpolate(d3.interpolate)
        .range([0, 1]);

      data.forEach(function animate(time, index) {
        setTimeout(function(){
          model.object3D.rotation.set(time[0], time[1], time[2]);
          model.children[0].children[0].setAttribute('color', scaleTemperature(time[3]));
          light.setAttribute('light', 'intensity', scaleLight(time[4]));
        }, index * 50);
      });

    });
}());