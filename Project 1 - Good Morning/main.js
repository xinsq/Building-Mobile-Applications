function alertMessage(message, close) {
	console.log(message);

	if (close === false) {

	}
}

function clearPage() {
	// Wipes away previous data for a fresh start
	$("#weatherCurrent .message").empty();
	$("#weatherCurrent").empty();
	$("#weatherFuture li").empty();
	$(".news article").empty();
}

function error(status) {
	// Handles errors
	switch(status) {
		case 'geolocation':
			console.log('try another address');
			break;
		case 'blank input':
			console.log('please type something in');
			break;

		case 'no news':
			console.log('cannot find any news');
			break;
		default:
			console.log('oops, something went wrong!');
	}
}

function getNews(location) {
	// Gets google news results from city name and displays it
	var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20rss%20where%20url%20%3D%20'http%3A%2F%2Fnews.google.com%2Fnews%3Fgeo%3D"+location+"%26output%3Drss%26num%3D20'&format=json&diagnostics=true";
	// Todo: throw an error if timeout
	$.getJSON(url, function(data){
		if (data.query.results === null) {
			error('no rss');
			return;
		}
		else {
			for (var i=0; i<14; i++) {
				var article = data.query.results.item[i];
				var articleSection = '#article'+(i+1);
				if(typeof article.title !== 'undefined' && typeof article.link !== 'undefined') {
					$(articleSection).append('<h1><a href="'+article.link+'">'+article.title+'</a></h1>');
				}
				else {
					error('no news articles');
				}
			}
		}
	});
}

function getWeather(location,latitude,longitude) {
	// Use Forecast.io to predict the temperation min/max and weather of next 7 days
	var url = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'https%3A%2F%2Fapi.forecast.io%2Fforecast%2Fe053334212f4dd449660bd61b61b29e2%2F"+latitude+"%2C"+longitude+"'&format=json&diagnostics=true";
	$.getJSON(url, function(data){
		// Todo: detect api failure
		var components = data.query.results.json.daily.data;

		var todayTempMax = Math.round(components[0].temperatureMax);
		var todayTempMin = Math.round(components[0].temperatureMin);

		$('#weatherCurrent').html('Good day, '+location.slice(0,-4)+'!<div class="weatherToday"><div>'+components[0].icon+'</div><div>'+todayTempMin+'-'+todayTempMax+'&deg;</div></div>');

		for (var i=1; i<8; i++) {
			if (components[i].temperatureMax && components[i].temperatureMin && components[i].time && components[i].icon) {
				// var temperatureMax[i] = components[i].temperatureMax;
				// var temperatureMin[i] = components[i].temperatureMin;
				// var weatherTime[i] = components[i].time;
				// var weatherIcon[i] = components[i].icon;

				var tempMax = Math.round(components[i].temperatureMax);
				var tempMin = Math.round(components[i].temperatureMin);
				var timeStamp = new Date(components[i].time*1000);

				var day = timeStamp.getUTCDay();
				var dayOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

				$('#weatherFuture .day'+[i]).html('<div>'+dayOfWeek[day]+'</div><div>'+components[i].icon+'</div><div>'+tempMin+'-'+tempMax+'&deg;');
			}
		}
	});
}

function getLocation(url) {
	// Get city, state, and geographic coordinates and pass to loadSearch
	$.getJSON(url, function(data){
		if(data.status === 'ZERO_RESULTS') {
			error('geolocation');
			return;
		}
		var components = data.results[0].address_components;
		var geolocation = data.results[0].geometry.location;

		for (var i=0; i<components.length; i++) {
			if(components[i].types.indexOf('locality') !== -1) {
				var city = components[i].long_name;
			}
			if(components[i].types.indexOf('administrative_area_level_1') !== -1) {
				var state = components[i].short_name;
			}
		}

		if (typeof city === 'undefined' || state === 'undefined') {
			error('geolocation');
			return;
		}

		var location = city + ', ' + state;
		var latitude = geolocation.lat;
		var longitude = geolocation.lng;
		loadSearch(location, latitude, longitude);
	});
}

function loadSearch(location,latitude,longitude) {
	// Takes 'city, state' and set up the page
	console.log(latitude+", "+longitude);
	$('header .shortcuts').addClass('hide');
	$('#locationSearch').blur();
	clearPage();
	
	// Todo: move alert message to other functions to account for slow functions

	$('#historyList li:contains("'+location+'")').remove();
	$('#historyList').prepend('<li>'+location+'</li>');
	$('#historyList li').slice(5).remove();
	if (typeof localStorage !== 'undefined') {
		var pastSearches = [];
		$('#historyList li').each(function(){pastSearches.push($(this).text());});
		localStorage.pastSearches = JSON.stringify(pastSearches);
	}
	var locationEncoded = encodeURIComponent(location.replace(/\s+/g, ''));
	getNews(locationEncoded);
	getWeather(location,latitude,longitude);
	//		update messages to new location
	//		remove alert messages
}

function setPosition(position) {
	// Takes position from geolocation and passes it to loadSearch
	var latitude = position.coords.latitude;
	var longitude = position.coords.longitude;
	var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng='+position.coords.latitude+','+position.coords.longitude+'&sensor=true';

	getLocation(url);
}

$(document).ready(function() {

	// Load last searches and search for the most recent search
	if (typeof localStorage.pastSearches !== 'undefined') {
		$('#historyList').empty();
		var pastSearches = JSON.parse(localStorage.pastSearches);
		for (var i=0; i<pastSearches.length; i++) {
			$('#historyList').append('<li>'+pastSearches[i]+'</li>');
		}
		var url='http://maps.googleapis.com/maps/api/geocode/json?address='+pastSearches[0]+'&sensor=true';
		getLocation(url);
	}

	// Setup shortcuts if there are any available
	if (navigator.geolocation || $('#historyList') !== '') {
		$('#locationSearch').focus(function() {$('header .shortcuts').removeClass('hide');});
		$('.shortcuts .close').click(function() {$('header .shortcuts').addClass('hide');});

		if (navigator.geolocation) {
			$('.shortcuts').prepend('<a id="getLocation">Get current location</a>');
			// Todo: Throw an error message if geolocation times out
			$('#getLocation').click(function(){navigator.geolocation.getCurrentPosition(setPosition);});
		}

		$('#historyList li').click(function(){
			var location = $(this).html();
			var url='http://maps.googleapis.com/maps/api/geocode/json?address='+location+'&sensor=true';
			getLocation(url);
		});
	}

	// Take user value and turn into city + state, and pass to loadSearch
	$('header form').on('submit', function(){
		var searchBox = $('#locationSearch').val();

		if (searchBox.length === 0) {
			error('blank input');
			return false;
		}

		var searchBox = encodeURIComponent(searchBox);
		var url='http://maps.googleapis.com/maps/api/geocode/json?address='+searchBox+'&sensor=true';
		getLocation(url);

		return false;
	});

}); // End $(document).ready