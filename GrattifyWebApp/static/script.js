var googleApiReady = false;
googleApiClientReady = function(){
    gapi.client.setApiKey('AIzaSyCEP6Mt-yoKXgxdJ8et7HFgGSLLJKjTe-Y');
    gapi.client.load('youtube','v3',function() {
        googleApiReady = true;
    });
}

var app = angular.module('myApp', ["ngRoute"]);

app.config(['$httpProvider', function($httpProvider, $routeProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.factory('ytService', ['$http','$q', function($http,$q){
    var service = {};
    service.downloadTrackBackEnd = function(track,serve=false){
        var payload = {
                url: "/downloadSingleTrack/",
                method: 'POST',
                data: {'track':track,'serve':serve}
            }
        if(serve){
            payload.responseType="arraybuffer";
        }
        return $http(payload);
    };

    service.downloadSingleTrackFrontEnd = function(track){
        var a = document.getElementById('y2mp3Link');
        a.attributes['data-href'].value = track.ytlink;
        a.download = "testNAme.mp3";
        a.click();
        return;
        //ATTEMPT 2
        //var head = document.getElementsByTagName('head')[0]
        //var a = document.createElement('a');
        //head.appendChild(a);
        //a.href = "#";
        //a.attributes['data-href'] = "https://www.youtube.com/watch?v=KMU0tzLwhbE"
        //a.className = "y2m";
        //a.rel = "nofollow"; 
        //a.click();
        //return;

        //ATTEMPT 3
        //$http({
        //    url: "http://www.trciw.yt-downloader.org/download.php",
        //    method: 'GET',
        //    params: {'id':"55f583ab4f53cac3497777316e7bc161",'d':"KMU0tzLwhb"},
        //    //responseType: 'arraybuffer'
        //    }).then(function success(response){
        //        console.log(response);
        //    }, function error(response){
        //        console.log(response);
        //    });
        //return;
    };

    service.getYtLink = function(searchString){
        return $q(function(resolve,reject){
            if (googleApiReady){
                var ytSearchResults = [];
                var request = gapi.client.youtube.search.list({
                        q: searchString,
                        part: 'snippet',
                        maxResults: 10
                });
                request.execute(function(response)  {         
                    if(response.result.pageInfo.totalResults == 0){
                        reject();
                    }                                                                           
                    var srchItems = response.result.items;
                    var ids = '';                 
                    srchItems.forEach(function(item, index) {
                        if (item.id.kind=="youtube#video"){
                            vidId = item.id.videoId;
                            vidTitle = item.snippet.title;
                            vidThumburl =  ("thumbnails" in item.snippet) ? item.snippet.thumbnails.default.url : "";                 
                            vidThumbimg = '<pre><img id="thumb" src="'+vidThumburl+'" alt="No  Image Available." style="width:204px;height:128px"></pre>';                   
                            ytSearchResults.push({'title':vidTitle,
                                                  'thumbUrl':vidThumburl,
                                                  'thumbImg':vidThumbimg,
                                                  'id':vidId,
                                                  'link':'https://www.youtube.com/watch?v='+vidId
                                                   });
                            ids += ',' + vidId; 
                        }
                                          
                    });
                    if(ids == ''){
                        reject();
                    }
                    var detailsRequest = gapi.client.youtube.videos.list({
                        part: 'contentDetails',//add 'statistics' for view count info 
                        id: ids
                    })
                    detailsRequest.execute(function(response){
                        srchItems = response.result.items;
                        srchItems.forEach(function(item, index) {
                            searchResult = ytSearchResults.find(function(sR){
                                if (sR['id']==item['id']){
                                    return sR;
                                }
                            });
                            searchResult['duration'] = item.contentDetails.duration;
                        });
                        resolve(ytSearchResults);
                    })
                    
                })
            }              
        });
    };
    return service;
}])


//The Girl I Love She Got Long Black Wavy Hair - 22/6/69 Pop Sundae", artist: "Led Zeppelin
app.controller('indexCtrl', function($scope, $http, $location, $window, $q, ytService) {
    var init = function(){
        document.getElementById("artist_input").focus();
        $scope.selectedPlaylists = [];
        $scope.entry = {};
        $scope.entry.entryType = "track";
        console.log(googleApiReady);
    }

    $scope.removeLinkError = function(track){
        if(track["status"] == 'ERROR' &&
            track["err"] != 'Download failed.'){
            track["status"] = '';
        }
    }

    $scope.download = function(playlists){
        //check single song case
        if(playlists.length == 1 &&
            playlists[0].tracks.length == 1){
            ytService.downloadSingleTrackFrontEnd(playlists[0].tracks[0]);
        }
        else{
            $scope.downloadTracksFrontEnd(playlists,0,0);
        }
    }

    $scope.downloadSingleTrackBackEnd = function(track){
        //move loading bar
        track['status'] = 'DOWNLOADING';
        ytService.downloadTrackBackEnd(track,true).then(function success(response) {
                var a = document.createElement('a');
                var blob = new Blob([response.data], {'type':"audio/mpeg-stream"}); //try octet-stream instead of zip if this breaks
                a.href = URL.createObjectURL(blob);
                a.download = track['artist']+' - '+track['title']+'.mp3'  ;
                a.click();
                track['status'] = 'COMPLETE';
            },function error(response) {
                console.log('error')
                console.log(response);
                //track failed to download
                track['status'] = 'ERROR';
                track['err'] = "Download failed."
            });
    }

    $scope.downloadTracksFrontEnd = function(playlists,playlistIndex,trackIndex){
        //base case
        if(trackIndex >= playlists[playlistIndex]['tracks'].length){
            if(++playlistIndex >= playlists.length){
                //all playlists downloaded, done
                return;
            }
            else{
                //reset trackIndex to start next playlist download
                trackIndex=0;
            }
        }
        track = playlists[playlistIndex].tracks[trackIndex];
        ytService.downloadSingleTrackFrontEnd(track);
        setTimeout(function(){$scope.downloadTracksFrontEnd(playlists,playlistIndex,++trackIndex);},5000);
    }

    //https://www.youtube.com/watch?v=EUHcNeg_e9g
    $scope.downloadTracksRecursiveBackEnd = function(playlists, playlistIndex, trackIndex){
        //base case
        if(trackIndex >= playlists[playlistIndex]['tracks'].length){
            if(++playlistIndex >= playlists.length){
                //all playlists downloaded, time to zip
                zipTracks(playlists, 0);
                return;
            }
            else{
                //reset trackIndex to start next playlist download
                trackIndex=0;
            }
        }
        track = playlists[playlistIndex].tracks[trackIndex];
        //skip tracks that have error status
        if(track['status'] == 'ERROR' || 
           track['ytlink'] == undefined){
            return $scope.downloadTracksRecursiveBackEnd(playlists,playlistIndex,++trackIndex);
        }
        //move loading bar
        track['status'] = 'DOWNLOADING';
        ytService.downloadTrackBackEnd(track).then(function success(response) {
            if(!response.data.success)
            {
                //track failed to download
                track['status'] = 'ERROR';
                track['err'] = "Download failed."
            }
            else
            {
                track['status'] = 'COMPLETE';
            }
            //download next song
            return $scope.downloadTracksRecursiveBackEnd(playlists,playlistIndex,++trackIndex);
        });
    };

    var zipTracks = function(playlists,playlistIndex){
        if(playlistIndex >= playlists.length){
            return;
        }
        var playlist = playlists[playlistIndex];
        var readyTracks = playlist['tracks'].filter(function(track){
                if (track['status'] == 'COMPLETE'){
                    return track;
                }
            });
        if (readyTracks == undefined){
            //no tracks in this playlist successfully downloaded, skip playlist
            zipTracks(playlists,++playlistIndex);
            return;
        }
        $http({
            url: "/zipTracks/",
            method: 'POST',
            data: {'tracks':readyTracks, 'playlistName':playlist['name']}
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
                    //recursive step
                    zipTracks(playlists,++playlistIndex)
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

    var findNthBestLink = function(track,n){
        return $q(function(resolve,reject){
            var searchString = track['artist'] + ' ' + track['title'];
            //searchString = searchString.replace(/[^0-9a-zA-Z ]+/,'');
            //searchString = "led+zeppelin+the+girl+i+love+she+got+long+black+wavy+hair++22669+pop+sundae"
            //searchString = "led zeppelin the girl i love she got long black wavy hair  22669 pop sundae"
            console.log(searchString);
            ytService.getYtLink(searchString).then(function success(results){
                badKeywords = ["video","album","live","cover","remix","instrumental","acoustic","karaoke"]
                goodKeywords = ["audio","lyric"]

                badKeywords = badKeywords.filter(function(bK){
                    if (searchString.indexOf(bK) == -1){
                        return bK;
                    }
                });

                var scoreIndex = [];
                results.forEach(function(result,i){
                    var matchScore = i;
                    badKeywords.forEach(function(bK){
                        if (result['title'].indexOf(bK) != -1){
                            matchScore += 1.1;
                        }
                    })
                    goodKeywords.forEach(function(gK){
                        if (result['title'].indexOf(gK) != -1){
                            matchScore -= 1.1;
                        }
                    })
                    if(result['title'].indexOf(track['artist'].replace('the ','')) != -1){
                        matchScore -= 5;
                    }
                    if(result['title'].indexOf(track['title']) != -1){
                        matchScore -= 3;
                    }
                    scoreIndex.push([i,matchScore])
                });
                var bestToWorst = scoreIndex.sort(function(a,b){
                    return a[1] - b[1];
                })
                var nthBestIndex = bestToWorst[n-1][0]
                resolve(results[nthBestIndex]);
            }, function error(){
                //try getting link using gratify server's algorithm implementation (which for some stupid reason yields different results)
                $http({
                        url: "getYtlink/",
                        method: 'POST',
                        data: track
                    }).then(function success(response) {
                        resolve(response.data);
                    }, function error(response){
                        reject();
                    });
            });
        })
        
    }
    
    $scope.addTrack = function(entry){
        var track = {'artist':entry.artist, 'title':entry.title, 'ytlink':entry.ytlink, 'entryType':entry.entryType};
        if(track.artist === undefined && track.title == undefined && track.ytlink == undefined)
        {
            document.getElementById("artist_input").focus();
            return;
        }
        if ($scope.selectedPlaylists.length > 0 && $scope.selectedPlaylists[0]['name']=="Gratify Playlist"){
            var duplicate = $scope.selectedPlaylists[0]['tracks'].find(function(t,i){
                if (t.artist == track.artist && t.title == track.title)
                    {
                        return t;
                    }
                });
            if(duplicate != undefined)
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
            findNthBestLink(track,1).then(function(best){
                if(track.ytlink=="Smart Search..."){
                    track.ytlink = best['link'];
                } 
            }, function error(response){
                    if(track.ytlink=="Smart Search..."){
                        track['status']='ERROR';
                        track['err'] = "Smart search failed. Please enter a link.";
                        track['ytlink'] = "Link Needed"
                    }
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
                        findNthBestLink(track,1).then(function(best){
                            if(track.ytlink=="Smart Search..."){
                                track.ytlink = best['link'];
                            } 
                        }, function error(response){
                                if(track.ytlink=="Smart Search..."){
                                    track['status']='ERROR';
                                    track['err'] = "Smart search failed. Please enter a link.";
                                    track['ytlink'] = "Link Needed"
                                }
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

    $scope.getRowStyle = function(status,hovering){
        if(hovering){
            return {'background-color':'#efccff','border':'solid black'}
        }
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


app.controller('spotifyCtrl', function($scope, $http, ytService) {
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