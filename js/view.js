/************************ Globals ***************************/
var viewMetaData = {selectedRow: 0};
var map = null;
var resampleFactor = 3;
var currPage;
var animationOn = false;
var changeDirectionTH = 2;
var userMetadataTemp = null;
/***********************************************************/

fetchTripFileList();
initTableListener();

function initTableListener(){
  $('#statsTable').on('click', 'tbody tr', function(event){
      $(this).addClass('highlight').siblings().removeClass('highlight');
      var rowId = $(this).attr("id"); 
      viewMetaData.selectedRow = $(this).index();
      
      if (currPage == "Trip Summary"){
        // if currently animating
        if (animationOn){
            animationOn = false;
            userMetadata = userMetadataTemp;
            userMetaDataUpdateView();
        }

        // initialize google map
        $.ajax({
          url: rowId,
          success: function(response){
            var data = eval("(" + response + ")");
            gm_initialize(data);
          }
        })
      }
      else if (currPage == "charts-inline"){
        // initialize chart
        $.ajax({
          url: rowId,
          success: function(response){
            var data = eval("(" + response + ")");
            updateChart(data);
          }
        })
      }
  });
}

function fetchTripFileList(){
    // set all user meta data fields to zero
    userMetadata.init();

    // get trip file list
    $.ajax({
        url: 'http://chenprice.com/superpedestrian/json/tripFileList.json',
        success: function (fileList){
           // update table with data from server
           fetchTripFile(fileList);
        }
    });    
}

function fetchTripFile(fl){
  var fileList = eval ("(" + fl + ")");
  for (idx in fileList.tripFiles){

    var filename = fileList.tripFiles[idx].filename;
    $.ajax({
        url: 'http://chenprice.com/superpedestrian/json/' + fileList.tripFiles[idx].filename,
        success: function(response){
          data = eval("(" + response + ")");
          // Update control data
          if (currPage == "Trip Summary" || currPage == "charts-inline"){
            userMetaDataUpdate(data, this.url);          
            tableUpdate(data, this.url);
          }
          else{
            updateCalendarChart();
          }
        }
    })
  }
}

function tableUpdate(response, url){
      var id = data.startTime;
      var sumDistance = 0;
      var sumCalories = 0;
      var sumSpeedMps = 0;
      var sampleCount = 0;

      // compute average speed
      for (idx in data.samples){
          currSpeedMps = parseFloat(data.samples[idx].speedmps);
          sumSpeedMps += currSpeedMps;
          sampleCount++;
      }
      var avgSpeed = sumSpeedMps / sampleCount;

      // add row to table
      var x = document.getElementById('statsTable').insertRow(-1);

      // link file name and row in table
      x.setAttribute("id", url);

      // add cells to row
      var c0 = x.insertCell(0);
      var c1 = x.insertCell(1);
      var c2 = x.insertCell(2);
      var c3 = x.insertCell(3);
      
      // trip id
      c0.innerHTML = id.toString();

      // Average Speed
      c1.innerHTML = avgSpeed.toFixed(2);

      // Distance Traveled
      c2.innerHTML = data.distanceTraveled.toFixed(2);

      // Calories Burned
      c3.innerHTML = data.caloriesBurned.toFixed(2);

      // Update table
      table = document.getElementById("statsTable");
      rows = table.getElementsByTagName('tr');
      rows[1].className = 'highlight';
      viewMetaData.selectedRow = 1;
}

function userMetaDataUpdate(data, url){
      userMetadata.numRides += 1;
      userMetadata.distanceTraveled += data.distanceTraveled;
      userMetadata.caloriesBurned += data.caloriesBurned;
      userMetadata.timeOnBicycle += data.secondsElapsed;

      // update view according to page
      if (currPage == "Trip Summary"){
          userMetaDataUpdateView();
          // default dislay - first trip in the list
          if (userMetadata.numRides == 1){
            // initialize google map
            $.ajax({
              url: url,
              success: function(response){
                var data = eval("(" + response + ")");
                gm_initialize(data);
              }
            })
          }
      }
      else if (currPage == "charts-inline"){
          // default dislay - first trip in the list
          if (userMetadata.numRides == 1){
            // initialize chart
              updateChart(data);
          }
      }
}

function clone(obj){
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
}

function userMetaDataUpdateView(){
    document.getElementById('numRides').innerHTML = userMetadata.numRides;
    document.getElementById('distanceTraveled').innerHTML = userMetadata.distanceTraveled.toFixed(2);
    document.getElementById('caloriesBurned').innerHTML = userMetadata.caloriesBurned.toFixed(2);
    document.getElementById('timeOnBicycle').innerHTML = convertTime(userMetadata.timeOnBicycle);
}

function resetUserMetaData(sampleData){
    userMetadataTemp = clone(userMetadata);
    userMetadata.distanceTraveled = (userMetadata.distanceTraveled * 1000 - sampleData.metersTraveled.sum) / 1000;
    userMetadata.caloriesBurned -= sampleData.caloriesBurned.sum;
    userMetadata.timeOnBicycle -= sampleData.timeOnBicycle.sum;
    userMetaDataUpdateView();
}

function userMetaDataStepUpdate(sampleData, index){
    userMetadata.distanceTraveled = (userMetadata.distanceTraveled * 1000 + sampleData.metersTraveled.samples[index]) / 1000;
    userMetadata.caloriesBurned += sampleData.caloriesBurned.samples[index];
    userMetadata.timeOnBicycle += sampleData.timeOnBicycle.samples[index];
    userMetaDataUpdateView();
}

function convertTime(timeInSeconds) {
    var sec_num = parseInt(timeInSeconds, 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);
    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    var time = hours + ':' + minutes + ':' + seconds;
    return time;
}

function updateChart(data){
    $(function() {
        // extract relevant chart data
        speed = [];
        for (idx in data.samples){
              if(!isNaN(data.samples[idx].speed))
                speed.push([parseInt(idx), parseFloat(data.samples[idx].speedmps)]);
        }

        // chart options
        var options = {
          // chart options
           xaxis: {
              show: false
           },
           grid: { hoverable: true}
        };
        
        // animate chart
        $.plotAnimator($("#speedChart"), [{data : speed, lines: {lineWidth:2}, animator: {start:$("#start").val(), steps:$("#steps").val(), 
                          duration:$("#duration").val(), direction: $("#dir").val()}}], options);
        var previousPoint = null;
        $("#speedChart").bind("plothover", function (event, pos, item) {
            $("#x").text(pos.x.toFixed(2));
            $("#y").text(pos.y.toFixed(2));

            if (item) {
               if (previousPoint != item.dataIndex) {
                   previousPoint = item.dataIndex;
                        
                   $("#tooltip").remove();
                   y1 = speed[item.dataIndex][1];
                   showTooltip(item.pageX, item.pageY, y1.toFixed(2)+"<br>");
               }
            }
            else {
               $("#tooltip").remove();
               previousPoint = null;            
            }
        });
    });
}

function showTooltip(x, y, contents) {
    $('<div id="tooltip">' + contents + '</div>').css( {
        position: 'absolute',
        display: 'none',
        top: y + 5,
        left: x + 5,
        border: '1px solid #fdd',
        padding: '2px',
        'background-color': '#fee',
        opacity: 0.80
    }).appendTo("body").fadeIn(200);
}

function updateCalendarChart(data){
    $(function() {
        // extract relevant chart data
        caloriesBurned = [[1,0.8],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0.3],[12,0],[13,0],[14,0],[15,0.654],[16,0],[17,0.8],[18,0],[19,0],[20,0],[21,0],[22,0.1864],[23,0],[24,0],[25,0],[26,0],[27,0],[28,0],[29,0],[30,0]];
        distanceTraveled = [[1,0.5],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0.84],[12,0],[13,0],[14,0],[15,0.24],[16,0],[17,0.8],[18,0],[19,0],[20,0],[21,0],[22,0.35],[23,0],[24,0],[25,0],[26,0],[27,0],[28,0],[29,0],[30,0]];
        rideTime = [[1,0.1],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0.47],[12,0],[13,0],[14,0],[15,0.9],[16,0],[17,0.8],[18,0],[19,0],[20,0],[21,0],[22,0.8],[23,0],[24,0],[25,0],[26,0],[27,0],[28,0],[29,0],[30,0]];

        // chart options
        var options = {
          // chart options
           xaxis:{
              show: true,
              ticks: 15
           },
           grid: { hoverable: false},
           legend:{
              show: true,
              backgroundOpacity: 0.4
           }
        };
        
        // animate chart
        $.plotAnimator($("#calendarChart"), [{label: "Calories Burned", data : caloriesBurned, lines: {lineWidth:2}, animator: {start:$("#start").val(), steps:$("#steps").val(), 
                          duration:$("#duration").val(), direction: $("#dir").val()}}, 
                          {label: "Distance Traveled", data : distanceTraveled, lines: {lineWidth:2}, animator: {start:$("#start").val(), steps:$("#steps").val(), 
                          duration:$("#duration").val(), direction: $("#dir").val()}},
                          {label: "Ride Time", data : rideTime, lines: {lineWidth:2}, animator: {start:$("#start").val(), steps:$("#steps").val(), 
                          duration:$("#duration").val(), direction: $("#dir").val()}}], options);
    });
}

function normalize(data){
    max = 0;
    for (i in dataArray){
        curr = Math.abs(dataArray[i]);
        if (curr > max){
          max = curr;
        }
    }
    for (i in dataArray){
        curr = Math.abs(dataArray[i]);
        dataArray[i] = dataArray[i] / max;
    }
}
