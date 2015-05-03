var METERS_TO_MILES = 0.000621371192;

var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer();
var map, startLocation, endLocation, directRouteDuration;
var directionsCtr = 0;
var potentialPlaces = [];
var numPotentialPlaces = 0;
var allProperties = [];
var allMarkers = [];

function midPoint(point1, point2){
  var lat1 = point1.lat();
  var lon1 = point1.lng();
  var lat2 = point2.lat();
  var lon2 = point2.lng();

  var dLon = toRad(lon2 - lon1);

  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);
  var lon1 = toRad(lon1);

  var Bx = Math.cos(lat2) * Math.cos(dLon);
  var By = Math.cos(lat2) * Math.sin(dLon);
  var lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By));
  var lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return new google.maps.LatLng(toDeg(lat3), toDeg(lon3));
}

function distanceBetween(point1, point2) 
 {
   var lat1 = point1.lat();
   var lon1 = point1.lng();
   var lat2 = point2.lat();
   var lon2 = point2.lng();
 
   var R = 6371; // km
   var dLat = toRad(lat2-lat1);
   var dLon = toRad(lon2-lon1);
   var lat1 = toRad(lat1);
   var lat2 = toRad(lat2);

   var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
     Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
   var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
   var d = R * c;
   return d;
 }

// Converts numeric degrees to radians
function toRad(val) 
{
   return val * Math.PI / 180;
}

function toDeg(val){
  return val * 180 / Math.PI;
}

function getDirections(callback){
  if(potentialPlaces.length > 0){
    var place = potentialPlaces[0].place;
    var request = {
      origin: startLocation.geometry.location,
      destination: endLocation.geometry.location,
      optimizeWaypoints: true,
      unitSystem: google.maps.UnitSystem.IMPERIAL,
      travelMode: google.maps.TravelMode.DRIVING
    };
    if(place){
      request.waypoints = [{location: "" + place.la + "," + place.lo}];
    }
    directionsService.route(request, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        potentialPlaces.shift();
        var progress = (numPotentialPlaces  - potentialPlaces.length) / numPotentialPlaces;
        $('.progress-bar').css('width', "" + progress * 100 + "%");
        addResult(response, place);
        if(potentialPlaces.length > 0){
          setTimeout(function(){getDirections(callback)}, 400);
        } else {
          $('.progress').hide();
          if (callback){
            callback(response);
          }
        }
      } else if (status == google.maps.DirectionsStatus.OVER_QUERY_LIMIT){
        console.log('OVER_QUERY_LIMIT');
        setTimeout(function(){getDirections(callback)}, 2500);
      }
    });
  } else {
    $('.progress').hide();
    if (callback){
      callback(); 
    }
  }
}

function addResult(directions, place){
  var route = directions.routes[0];
  
  var duration = route.legs[0].duration.value;
  var distance = route.legs[0].distance.value;
  var legRatio = 1;
  
  if(place){
    duration += route.legs[1].duration.value;
    distance += route.legs[1].distance.value;
    legRatio = route.legs[0].duration.value / route.legs[1].duration.value;
    if(legRatio > 1){
      legRatio = 1 / legRatio;
    }
  }

  var resultText = '';
  var durationDiff = 0;
  if(place){
    durationDiff = duration - directRouteDuration;
    resultText += "<strong>" + place.name + "</strong><br>";
    resultText += secondsToTime(durationDiff, true) + " longer"
  } else {
    resultText += "<strong>" + "Direct route" + "</strong> &ndash; ";
    resultText += secondsToTime(duration) + " &ndash; "
    resultText  += " (" + Math.round(distance * METERS_TO_MILES) + " miles)";
    directRouteDuration = duration;
  }
  
  var result = $("<li class='list-group-item'>" + resultText + "</li>");
  if(place == null){
    result.addClass('list-group-item-info');
  }
  result.data('leg-ratio', legRatio);
  result.data('duration',duration);
  result.on('click', function(){
    directionsDisplay.setDirections(directions);
  });
  
  // Don't add more than a third of the journey time
  if(place && (durationDiff <= (directRouteDuration/3))){
    var marker = new google.maps.Marker({
         position: new google.maps.LatLng(place.la, place.lo),
         map: map,
         title: place.name
     });
     allMarkers.push(marker);
     $('#results').append(result);
   } else if (place == null){
     $('#results').append(result);
   }

  // Sort by extra duration
  $('#results').find("li").detach().sort(function(a, b) {
    return($(a).data('duration') - $(b).data('duration'));
  }).each(function(index, el) {
    $('#results').append(el);
  });
  
  // Sort by leg ratio
  // $('#results').find("li").detach().sort(function(a, b) {
  //   return($(b).data('leg-ratio') - $(a).data('leg-ratio'));
  // }).each(function(index, el) {
  //   $('#results').append(el);
  // });
}

function secondsToTime(secs, long)
{
    var hours = Math.floor(secs / (60 * 60));
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);
   
    var out = "";
    if(hours > 0){
      out += hours;
      out += long ? (hours == 1 ? " hour " : " hours ") : "hr ";
    }
    out += minutes;
    out += long ? (minutes == 1 ? " minute " : " minutes ") : "min ";
    return out;
}

function initialize() {
  var mapOptions = {
    center: new google.maps.LatLng(54.96175206818404,-4.454484374999992),
    streetViewControl: false,
    panControl: false,
    mapTypeControl: false,
    zoom: 5
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
  mapOptions);
  directionsDisplay.setMap(map);
    
  // Start input
  var startInput = document.getElementById('start-input');
  var autocompleteStart = new google.maps.places.Autocomplete(startInput);
  autocompleteStart.bindTo('bounds', map);
  google.maps.event.addListener(autocompleteStart, 'place_changed', function() {
    startLocation = autocompleteStart.getPlace();
  });
    
  // End input
  var endInput = document.getElementById('end-input');
  var autocompleteEnd = new google.maps.places.Autocomplete(endInput);
  autocompleteEnd.bindTo('bounds', map);
  google.maps.event.addListener(autocompleteEnd, 'place_changed', function() {
    endLocation = autocompleteEnd.getPlace();
  });
  
  $.getJSON('./data/all.json', function(data){
    allProperties = data;
  })
  
  $('.search-form a').click(function(e){
    e.preventDefault();
    if (startLocation && endLocation){
      $('#results').html('');
      for (var i = 0; i < allMarkers.length; i++) {
        allMarkers[i].setMap(map);
      }
      var mid = midPoint(startLocation.geometry.location, endLocation.geometry.location);
      var crowFliesDist = distanceBetween(startLocation.geometry.location, endLocation.geometry.location);
      potentialPlaces = [{place:null, totalDistance:crowFliesDist}];
      
      // Get most direct route without stop
      getDirections(function(directDirections){
        directionsDisplay.setDirections(directDirections);

        allProperties.results.forEach(function(place){
          var placeLatLng = new google.maps.LatLng(place.la, place.lo);

          var distFromMid = distanceBetween(placeLatLng, mid);
          var inTheCircle = distFromMid < (crowFliesDist/2);
          
          var distanceFromStart = distanceBetween(startLocation.geometry.location, placeLatLng);
          var distanceFromEnd = distanceBetween(endLocation.geometry.location, placeLatLng);
          var totalDistance = distanceFromStart + distanceFromEnd;
          var notTooMuchExtraMileage = totalDistance < (crowFliesDist * 1.2);
          
          var tooCloseToEitherEnd = (distanceFromEnd < (crowFliesDist/3)) || (distanceFromStart < (crowFliesDist/3))
          
          if (inTheCircle && notTooMuchExtraMileage && !tooCloseToEitherEnd){
            potentialPlaces.push({place: place, totalDistance: totalDistance, distanceFromMid: distFromMid});
          }
        });
        potentialPlaces.sort(function(a,b){
          return a.distanceFromMid - b.distanceFromMid;
        });
        numPotentialPlaces = potentialPlaces.length;
        $('.progress-bar').css('width', '0%');
        $('.progress').show();
        getDirections();
      })
    }
  });
}

google.maps.event.addDomListener(window, 'load', initialize);