var app = angular.module('myApp',[]);
	app.config(['$httpProvider', function($httpProvider){
		$httpProvider.defaults.xsrfCookieName = 'csrftoken';
		$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
	}])
	app.controller('myCtrl', function($scope,$http){
		document.getElementById("artist_input").focus();
		$scope.entryType = "track";
		$scope.tracks = [];
		$scope.track = {};

		$scope.addTrack = function(){
			if($scope.track.artist === undefined && $scope.track.title == undefined && $scope.track.ytlink == undefined)
			{
				document.getElementById("artist_input").focus();
				return;
			}
			if($scope.entryType == "album")
			{
				$http({
					url: "getAlbumTracks",
					method: 'POST',
					data: $scope.track
				}).then(function mySuccess(response) {
						for(albumTrack of response.data.tracks){
							$scope.tracks.unshift({artist:$scope.track.artist, title:albumTrack});
						}
				    }, function myError(response) {
				      alert("Could not find that album :(");
				  	});
			}
			else
			{
				$scope.tracks.unshift({artist:$scope.track.artist, title:$scope.track.title});
				alert($scope.track);
				$http({
					url: "getYtlink",
					method: 'POST',
					data: $scope.track
				}).then(function mySuccess(response) {
					$scope.tracks[0].ytlink = response.data.ytlink;
					alert('success?');
				}, function error(response){
					alert("Could not find a youtube link for that song, please provide one manually :(");
				});
			}
			$scope.track.artist = undefined;
			$scope.track.title = undefined;
			$scope.track.ytlink = undefined;
			document.getElementById("artist_input").focus();
		}

		$scope.clearTracks = function(){
			$scope.tracks = [];
		}

		$scope.deleteRow = function(rowID){
			$scope.tracks.splice(rowID,1);
		}
		$scope.downloadTracks = function(){
			$http({
					url: "downloadTracks",
					method: 'POST',
					data: $scope.tracks,
				}).then(function mySuccess(response) {
						if(response.data.failedTracks.length > 0)
						{
							//do stuff to track table here
							alert("Some tracks failed to download :(");
						}
						else
						{
							$scope.zipPath = response.data.zipPath;
							$http.get('/serveZip',{responseType:'arraybuffer'}).then(function zipReady(response){
								var a = document.createElement('a');
								var blob = new Blob([response.data], {'type':"application/zip"}); //try octet-stream instead of zip if this breaks
								a.href = URL.createObjectURL(blob);
								a.download = $scope.zipPath;
								a.click();
							}, function zipNotReady(response){
								alert('no response!?');
							});
							
							//$http.post("serveZip");
						}
				    });
		}

		$scope.onKeyPress = function($event) {
		      if ($event.keyCode == 13) {
		      		console.log("test");
		          // Here is where I must fire the click event of the button
		          $scope.addTrack();
		      }
		  }; 
	})