var bicycleLeft = {
  url: 'img/bicycleLeft.png',
  // This marker is 44 pixels wide by 44 pixels tall.
  size: new google.maps.Size(44, 44),
  // The origin for this image is 0,0.
  origin: new google.maps.Point(0,0),
  // The anchor for this image is the base of the flagpole at 0,22.
  anchor: new google.maps.Point(22, 22)
};
var bicycleRight = {
  url: 'img/bicycleRight.png',
  // This marker is 44 pixels wide by 44 pixels tall.
  size: new google.maps.Size(44, 44),
  // The origin for this image is 0,0.
  origin: new google.maps.Point(0,0),
  // The anchor for this image is the base of the flagpole at 0,22.
  anchor: new google.maps.Point(22, 22)
};


function gm_initialize(data)
{
    var tripPath = "";
    var delim = "|";
    var points = [];
    var sampleData = {metersTraveled:{samples:[], sum:0}, caloriesBurned:{samples:[], sum:0}, timeOnBicycle:{samples:[], sum:0}};

    // initialize trip vars
    minLat = parseFloat(data.samples[0].latitude);
    maxLat = parseFloat(data.samples[0].latitude);
    minLng = parseFloat(data.samples[0].longitude);
    maxLng = parseFloat(data.samples[0].longitude);
    currLat = 0;
    currLat = 0;

    // extract trip data
    for (idx in data.samples){
        extractSampleData(sampleData, data, idx);

        // find trip boundaries for map centering
        if (currLng < minLng){
          minLng = currLng;
        }
        if (currLng > maxLng){
          maxLng = currLng;
        }
        if  (currLat < minLat){
          minLat = currLat;
        }
        if  (currLat > maxLat){
          maxLat = currLat;
        }

        // append to trip path string
        tripPath += currLat + ',' + currLng + delim;
        points.push(new google.maps.LatLng(parseFloat(currLat), parseFloat(currLng)));
    }
    currSampleData = sampleData;

    // get map boundaries and center
    NE = new google.maps.LatLng(maxLat, maxLng);
    SW = new google.maps.LatLng(minLat , minLng);
    bounds = new google.maps.LatLngBounds(SW, NE);
    center = bounds.getCenter();
   
    // initialize/update map object
    var mapProp = {
        center:center,
        zoom:15,
        mapTypeId:google.maps.MapTypeId.SATELLITE,
        disableDefaultUI: true,
        mapTypeControl: false,
        scaleControl: false,
        zoomControl: false
    };

    map = new google.maps.Map(document.getElementById("googleMap"),mapProp);
    
    // add marker
    addMarker(points, sampleData, center);
}

function extractSampleData(sampleData, data, idx){
    currLng = parseFloat(data.samples[idx].longitude);
    currLat = parseFloat(data.samples[idx].latitude);
    currMetersTraveled = isNaN(data.samples[idx].metersTraveled)? 0 : parseFloat(data.samples[idx].metersTraveled);
    currCaloriesBurned = isNaN(data.samples[idx].kcalWorked)? 0 : parseFloat(data.samples[idx].kcalWorked);
    currTimeOnBicycle = isNaN(data.samples[idx].secondsElapsed)? 0 : parseFloat(data.samples[idx].secondsElapsed);

    sampleData.caloriesBurned.samples.push(currCaloriesBurned);
    sampleData.caloriesBurned.sum += currCaloriesBurned;
    sampleData.metersTraveled.samples.push(currMetersTraveled);
    sampleData.metersTraveled.sum += currMetersTraveled;
    sampleData.timeOnBicycle.samples.push(currTimeOnBicycle);
    sampleData.timeOnBicycle.sum += currTimeOnBicycle;
}

// adds a new point to a googlemap polyline
function addNewPoint(newPoint, line) {
    var path = line.getPath();
    path.push(newPoint);
}

// add marker as bicycle icon
function addMarker(points, sampleData, center) {
    var marker = new google.maps.Marker({
      icon: bicycleLeft,
      map: map,
      position: points[0]
    });

    // full path line
    color = '#CD5C5C';
    var tripPath = new google.maps.Polyline({
          path: points,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 1.0,
          strokeWeight: 2
    });
    tripPath.setMap(map);

    // resample trip
    pointsResampled = resample(points, resampleFactor);

    // event listener - click
    google.maps.event.addListener(marker, 'click', function(event) {
        fromLat = this.position.lat();
        fromLng = this.position.lng();

        // prepare dashboard views
        resetUserMetaData(sampleData);
        tripPath.setMap(null);
        
        // prepare dashed line
        var lineSymbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 3,
          strokeColor: '#F80000'
        };

        // this is the trail for the animation
        var tempLine = new google.maps.Polyline({
          path: [],
          strokeOpacity: 0,
          icons: [{
            icon: lineSymbol,
            offset: '0',
            repeat: '20px',
          }],
          map: map
        });
        map.setZoom(18);

        // Begin animation, send back to origin after completion
        animationOn = true;
        move(center, marker, points, pointsResampled, sampleData, tripPath, 0, tempLine, 0, 30);
    });
}

// animation function
function move(center, marker, latlngs, resampledLatLngs, sampleData, tripPath, index, tempLine, changeDirectionCount, wait) {
    if (animationOn){
        marker.setPosition(resampledLatLngs[index]);
        map.setCenter(marker.getPosition());
        if (index % resampleFactor == 0){
              //update view data
              userMetaDataStepUpdate(sampleData, index / resampleFactor);
        }

        if(index != resampledLatLngs.length-1) {
          // add current location to animated line
          addNewPoint(resampledLatLngs[index], tempLine);

          // change direction of bicycle image as needed
          if (index > 0){
              direction = resampledLatLngs[index].lng() - resampledLatLngs[index-1].lng();
              if (direction < 0){
                changeDirection = (changeDirectionCount--) % changeDirectionTH;
              }
              else{
                changeDirection = (changeDirectionCount++) % changeDirectionTH;
              }
              if (Math.abs(changeDirectionCount) == changeDirectionTH){
                 if (direction > 0){
                    marker.setIcon(bicycleRight);
                 }
                 else{
                    marker.setIcon(bicycleLeft);
                 }
                 changeDirectionCount = 0;
              }
          }
        

          // call the next "frame" of the animation
          setTimeout(function() { 
            move(center, marker, latlngs, resampledLatLngs, sampleData, 
                tripPath, index+1, tempLine, changeDirectionCount, wait); 
            }, wait);
        }
        else{
          // finished animation
          userMetaDataStepUpdate(sampleData, latlngs.length-1);
          tempLine.setMap(null);
          tripPath.setMap(map);
          map.setZoom(15);
          marker.setPosition(latlngs[0]);
          map.setCenter(center);
        }
    }
}

// resamples the trip data to enable smooth animation
function resample(points, factor){
  newVec = [];
  for (i = 1; i < points.length; i++){
      difLat = points[i].lat() - points [i-1].lat();
      difLng = points[i].lng() - points [i-1].lng();
      stepLat = difLat / factor;
      stepLng = difLng / factor;
      
      for (j = 0; j < factor; j++){
        currLat = points[i].lat() + stepLat * j;
        currLng = points[i].lng() + stepLng * j;
        newVec.push(new google.maps.LatLng(parseFloat(currLat), parseFloat(currLng)));
      }
  }
  return newVec;
}

