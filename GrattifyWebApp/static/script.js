var app = angular.module('myApp', ["ngRoute"]);

app.config(['$httpProvider', function($httpProvider, $routeProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.factory('ytDownload', ['$http', function($http){
    var service = {};
    service.downloadTrack = function(track,serve=false){
        var payload = {
                url: "/downloadSingleTrack/",
                method: 'POST',
                data: {'track':track,'serve':serve}
            }
        if(serve){
            payload[responseType]="arraybuffer";
        }
        return $http(payload);
    };
    return service;
}])



app.controller('indexCtrl', function($scope, $http, $location, $window, $q, ytDownload) {
    var init = function(){
        document.getElementById("artist_input").focus();
        $scope.selectedPlaylists = [];
        $scope.entry = {};
        $scope.entry.entryType = "track";
    }

    $scope.removeLinkError = function(track){
        if(track["status"] == 'ERROR' &&
            track["err"] != 'Download failed.'){
            track["status"] = '';
        }
    }

    $scope.downloadSingleTrack = function(track){
        //move loading bar
        track['status'] = 'DOWNLOADING';
        ytDownload.downloadTrack(track).then(function success(response) {
            if(!response.data.success){
                //track failed to download
                track['status'] = 'ERROR';
                track['err'] = "Download failed."
            }
            else{
                track['status'] = 'COMPLETE';
                var a = document.createElement('a');
                var blob = new Blob([response.data], {'type':"application/octet-stream"}); //try octet-stream instead of zip if this breaks
                a.href = URL.createObjectURL(blob);
                a.download = track['title']+'-'+track['artist'];
                a.click();
            }},function error(response) {
                //track failed to download
                track['status'] = 'ERROR';
                track['err'] = "Download failed."
            });
    }

    $scope.downloadTracksRecursive = function(playlists, playlistIndex, trackIndex){
        //DUMMY:https://www.youtube.com/watch?v=6e-sCFZlM1s
        if(playlists[playlistIndex].tracks[trackIndex]['status'] == 'ERROR' || 
           playlists[playlistIndex].tracks[trackIndex]['ytlink'] == undefined){
            //skip this track
            return $scope.downloadTracksRecursive(playlists,++playlistIndex,++trackIndex);
        }
        if(playlistIndex < playlists.length &&
           trackIndex < playlists[playlistIndex].tracks.length){
            //move loading bar
            playlists[playlistIndex].tracks[trackIndex]['status'] = 'DOWNLOADING';
            ytDownload.downloadTrack(playlists[playlistIndex].tracks[trackIndex]).then(function success(response) {
                if(!response.data.success)
                {
                    //track failed to download
                    $scope.selectedPlaylists[playlistIndex].tracks[trackIndex]['status'] = 'ERROR';
                    $scope.selectedPlaylists[playlistIndex].tracks[trackIndex]['err'] = "Download failed."
                }
                else
                {
                    $scope.selectedPlaylists[playlistIndex].tracks[trackIndex]['status'] = 'COMPLETE';
                }
                //download next song
                if(++trackIndex == playlists[playlistIndex]['tracks'].length){
                    if(++playlistIndex == playlists.length){
                        //all playlists downloaded, time to zip
                        zipTracks(playlists, 0);
                        return;
                    }
                    else{
                        //reset trackIndex to start next playlist download
                        trackIndex=0;
                    }
                }
                return $scope.downloadTracksRecursive(playlists,playlistIndex,trackIndex);
                });
        }
    };

    var zipTracks = function(playlists,playlistIndex){
        var playlist = playlists[playlistIndex];
        if (playlist['tracks'].find(function(track){
            track['status'] != 'ERROR';
        }).length == 0){
            //no tracks in this playlist successfully downloaded, skip playlist
            zipTracks(playlists,)
        }
        $http({
            url: "/zipTracks/",
            method: 'POST',
            data: {'tracks':playlist['tracks'], 'playlistName':playlist['name']}
        }).then(function success(response){
            //download zip
            zipName = response.data['zipName'];
            $http({
                url: "/serveZip",
                method: 'GET',
                params: {'zipName':zipName},
                responseType: 'arraybuffer'
            }).then(function success(response){
                    var a = document.createElement('a');
                    var blob = new Blob([response.data], {'type':"application/zip"}); //try octet-stream instead of zip if this breaks
                    a.href = URL.createObjectURL(blob);
                    a.download = zipName;
                    a.click();
                    if(++playlistIndex < playlists.length){
                        zipTracks(playlists,playlistIndex)
                    }
            }, function error(response){
                alert('Failed to download '+zipName+' from server');
            });
        }, function error(response){
            alert('Failed to create zip for '+playlist['name']);
        });
    }

    $scope.processEntry = function(entry){
        if(entry.entryType == "album")
        {
            if(entry.title==undefined || entry.artist==undefined){
                alert("Artist AND Name of album required");
                return
            }
            $http({
                url: "getAlbumTracks",
                method: 'POST',
                data: entry//{'artist':$scope.track.artist, 'title':$scope.track.title}
            }).then(function success(response) {
                    for(albumTrack of response.data.tracks){
                        albumTrack.entryType = "track"
                        $scope.addTrack(albumTrack);
                    }
                }, function error(response) {
                  alert("Could not find that album :(");
                });
        }
        else
        {
            $scope.addTrack(entry);
        }
    }
    
    $scope.addTrack = function(entry){
        var track = {'artist':entry.artist, 'title':entry.title, 'ytlink':entry.ytlink, 'entryType':entry.entryType};
        if(track.artist === undefined && track.title == undefined && track.ytlink == undefined)
        {
            document.getElementById("artist_input").focus();
            return;
        }
        if ($scope.selectedPlaylists.length > 0 && $scope.selectedPlaylists[0]['name']=="Gratify Playlist"){
            var duplicates = $scope.selectedPlaylists[0]['tracks'].find(function(t,i){
                if (t.artist == track.artist && t.title == track.title)
                    {
                        return t;
                    }
                });
            if(duplicates != undefined)
            {
                //do something to duplicate row
                alert('you already said that');
                return
            }
        }
        if ($scope.selectedPlaylists.length == 0 || $scope.selectedPlaylists[0].name != "Gratify Playlist"){
            $scope.selectedPlaylists.unshift({'tracks':[],'name':"Gratify Playlist"});
        }
        //Add tracks to Gratify Playlist
        $scope.selectedPlaylists[0]['tracks'].unshift(track);
        if(track.ytlink == undefined) //link not provided
        {
            track.ytlink="Smart Search..."
            $http({
                url: "getYtlink",
                method: 'POST',
                data: track
            }).then(function success(response) {
                track.ytlink = response.data['link'];
            }, function error(response){
                track['status']='ERROR';
                track['err'] = "Smart search failed. Please enter a link.";
                track['ytlink'] = "Link Needed"
            });
        }
        $scope.entry.artist = undefined;
        $scope.entry.title = undefined;
        $scope.entry.ytlink = undefined;
        document.getElementById("artist_input").focus();
    }

    $scope.deletePlaylist = function(playlistID){
        $scope.selectedPlaylists = $scope.selectedPlaylists.filter(function(playlist){
            return playlist['id'] != playlistID;
        });
    };

    $scope.deletePlaylistRow = function(playlistID,rowIndex){
        for(var i = 0; i < $scope.selectedPlaylists.length; i++){
            playlist = $scope.selectedPlaylists[i]
            if (playlist.id == playlistID){
                playlist.tracks.splice(rowIndex,1);
                if(playlist.tracks.length == 0){
                    $scope.selectedPlaylists.splice(i,1);
                }
            }
        }
    };

    $scope.editPlaylistRow = function(playlistID,rowIndex){
        $scope.selectedPlaylists.forEach(function(playlist){
            if (playlist.id == playlistID){
                playlist.tracks[rowIndex]['edit']=true;
            }
        });
    }

    var importSpotifyPlaylists = function(event){
        if (event.key == "selectedPlaylists"){
            var spotifyPlaylists = JSON.parse(event.newValue);
            spotifyPlaylists.forEach(function(playlist){
                $scope.selectedPlaylists.push(playlist);
                playlist.tracks.forEach(function(track){
                    if(track.ytlink == undefined) //link not provided
                    {
                        track.ytlink="Smart Search..."
                        $http({
                            url: "../getYtlink",
                            method: 'POST',
                            data: track
                        }).then(function success(response) {
                            //$scope.tracks[0].ytlink = response.data.link;
                            track.ytlink = response.data.link;
                        }, function error(response){
                            track['status']='ERROR'
                            track['err'] = "Smart search failed. Please enter a link."
                            track['ytlink'] = "Link Needed"
                        });
                    }
                })
            })
        }
    }

    $scope.loginSpotify = function(){
        var SPOTIPY_CLIENT_ID = "6ddf2f4253a847c5bac62b17cd735e66"
        var SPOTIPY_REDIRECT_URI = "http://127.0.0.1:8000/callback/"
        var spotifyScope = "playlist-read-private user-library-read"
        var spotifyAuthEndpoint = "https://accounts.spotify.com/authorize?"+"client_id="+SPOTIPY_CLIENT_ID+"&redirect_uri="+SPOTIPY_REDIRECT_URI+"&scope="+spotifyScope+"&response_type=token&state=123";
        //window.location.href = spotifyAuthEndpoint;
        $window.open(spotifyAuthEndpoint,'callBackWindow','height=500,width=400');
        $window.addEventListener("storage",importSpotifyPlaylists);
    }

    $scope.onKeyPress = function($event,entry) {
          if ($event.keyCode == 13) {
              // Here is where I must fire the click event of the button
              $scope.processEntry(entry);
          }
    }

    $scope.getRowStyle = function(status){
        switch(status){
            case "ERROR":
                return {'background-color':'#ff6666','border':'solid black'};
                break;
            case "COMPLETE":
                return {'background-color':'#66ff66','border':'solid black'};
                break;
            case "DOWNLOADING":
                return {'background-color':'#efccff','border':'solid black'};
                break;
            default:
                return {'background-color':'#ffe680','border':'solid black'};
                break;
        }
    }

    init();

});


app.controller('spotifyCtrl', function($scope, $http, ytDownload) {
    var init = function() {
        //grant = {'access_token','state','token_type','expires_in'}
        $scope.spotifyGrant = $scope.parseHash(String(window.location.hash));
        $scope.playlists = [];
        $scope.selectedPlaylists = [];
        $scope.pageStatus = 'LOADING';
        var userID
        var oauthHeader = {
            'Authorization': 'Bearer ' + $scope.spotifyGrant['access_token']
        };
        //oh god time to get the playlist data
        $http({
            method: 'GET',
            url: 'https://api.spotify.com/v1/me',
            headers: oauthHeader
        }).then(function success(response) {
                userID = response.data['id'];
                $http({
                    method: 'GET',
                    url: 'https://api.spotify.com/v1/users/' + userID + '/playlists',
                    headers: oauthHeader
                }).then(function success(response) {
                        response.data['items'].forEach(function(playlist) {
                            $http({
                                method: 'GET',
                                url: playlist['tracks']['href'],
                                headers: oauthHeader,
                            }).then(function success(response) {
                                    var tracks = [];
                                    response.data['items'].forEach(function(track) {
                                        tracks.push({
                                            'title': track['track']['name'],
                                            'artist': track['track']['artists'][0]['name']
                                        });
                                    });
                                    $scope.playlists.push({
                                        'name': playlist['name'],
                                        'id': playlist['id'],
                                        'tracks': tracks
                                    });
                                    $scope.pageStatus = 'COMPLETE';
                                },
                                function error(response) {
                                    $scope.pageStatus = 'ERROR';
                                    $scope.err = 'Error getting tracks for playlist ' + playlist['name'];
                                });
                        });
                    },
                    function error(response) {
                        $scope.pageStatus = 'ERROR';
                        $scope.err = 'Error getting user playlists!';
                    });
            },
            function error(response) {
                $scope.pageStatus = 'ERROR';
                $scope.err = 'Error getting user profile!';
            });
    };

    $scope.parseHash = function(urlHash) {
        var hashContents = {};
        var fieldStart, valueStart, currField;
        for (i = 0; i < urlHash.length; i++) {
            if (i == urlHash.length - 1) {
                //get last field value
                hashContents[currField] = urlHash.substr(valueStart);
            }
            switch (urlHash[i]) {
                case ('#'):
                    //first field
                    fieldStart = i + 1;
                    break;
                case ('&'):
                    hashContents[currField] = urlHash.substr(valueStart, i - valueStart);
                    fieldStart = i + 1;
                    break;
                case ('='):
                    currField = urlHash.substr(fieldStart, i - fieldStart);
                    valueStart = i + 1;
                    break;
            }
        }
        return hashContents;
    };

    $scope.addPlaylistsToQueue = function(){
        var selectedPlaylists = []
    	$scope.playlists.forEach(function(playlist){
    		if ($('#'+playlist['id'])[0].checked){
    			selectedPlaylists.push(playlist);
    		}
    	})
        localStorage.clear();
        localStorage.setItem('selectedPlaylists', JSON.stringify(selectedPlaylists));
        window.close();
    };

    $scope.onKeyPress = function($event,entry) {
          if ($event.keyCode == 13) {
              // Here is where I must fire the click event of the button
              $scope.addPlaylistsToQueue();
          }
    }
    init();

});