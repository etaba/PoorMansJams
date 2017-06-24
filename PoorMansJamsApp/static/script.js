var googleApiReady = false;
googleApiClientReady = function() {
    gapi.client.setApiKey('AIzaSyCEP6Mt-yoKXgxdJ8et7HFgGSLLJKjTe-Y');
    gapi.client.load('youtube', 'v3', function() {
        googleApiReady = true;
    });
}

var app = angular.module('myApp', ['ngSanitize', 'ui.bootstrap']);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);

app.factory('ytService', ['$http', '$q', function($http, $q) {
    var service = {};

    service.downloadSingleTrackFrontEnd = function(track, i) {
        /*youtube6 api test code
        var placeholder = document.getElementById('y2m_placeholder');
        var a = document.createElement('a');
        var ytID = track.ytlink.substr(track.ytlink.indexOf("v=")+2);
        a.href = "http://api.youtube6download.top/fetch/link.php?i=" + ytID;
        a.target="_blank"
        a.download="test.mp3"
        //a.rel = "nofollow";
        placeholder.appendChild(a);
        a.click();
        return;
        */

        //ATTEMPT 1 - works the first time, then same video downloaded for all subsequent tries
        //var a = document.getElementById('y2mp3Link_'+i.toString());
        if(i >= 1000) {
            alert("Currently Poor Mans Jams only supports up to 1000 tracks a time. Please refresh the page now and reenter any remaining tracks not downloaded. Sorry soon we will support unlimited tracks.");
        }
        var placeholderLinks = document.getElementById('y2m_placeholder').getElementsByTagName('a');
        var a = placeholderLinks[i];
        a.attributes['data-href'].value = track.ytlink;
        a.download = "testNAme.mp3";
        a.click();
        return;

        //ATTEMPT 2 - doesnt download anything
        //var placeholder = document.getElementById('y2m_placeholder');
        //var a = document.createElement('a');
        //a.href = "";
        //a.className = "y2m";
        //a.target="_blank"
        ////a.rel = "nofollow";
        ////a.attributes['data-href'] = {'value' : track.ytlink};
        //a.setAttribute('data-href',track.ytlink);
        //placeholder.appendChild(a);
        //a.click();
        //return;

        //ATTEMPT 3 - angular approach, data binding doesnt update
        //var a = document.getElementById('y2mp3Link3');
        //a.click();
        //return;

        //ATTEMPT 4
        //var placeholder = document.getElementById('y2m_placeholder');
        //placeholder.innerHTML = '<a id="uniqueId" href="" target="_blank"  data-href="'+track.ytlink+'" class="y2m">DID THIS WORK</a>';
        //$("#uniqueId").click();
        //return;
    };

    service.getYtLink = function(searchString) {
        return $q(function(resolve, reject) {
            if(googleApiReady) {
                var ytSearchResults = [];
                var request = gapi.client.youtube.search.list({
                    q: searchString,
                    part: 'snippet',
                    maxResults: 10
                });
                request.execute(function(response) {
                    if(response.result.pageInfo.totalResults == 0) {
                        reject();
                    }
                    var srchItems = response.result.items;
                    var ids = '';
                    srchItems.forEach(function(item, index) {
                        if(item.id.kind == "youtube#video") {
                            vidId = item.id.videoId;
                            vidTitle = item.snippet.title;
                            vidThumburl = ("thumbnails" in item.snippet) ? item.snippet.thumbnails.default.url : "";
                            vidThumbimg = '<pre><img id="thumb" src="' + vidThumburl + '" alt="No  Image Available." style="width:204px;height:128px"></pre>';
                            ytSearchResults.push({
                                'title': vidTitle,
                                'thumbUrl': vidThumburl,
                                'thumbImg': vidThumbimg,
                                'id': vidId,
                                'link': 'https://www.youtube.com/watch?v=' + vidId
                            });
                            ids += ',' + vidId;
                        }

                    });
                    if(ids == '') {
                        reject();
                    }
                    var detailsRequest = gapi.client.youtube.videos.list({
                        part: 'contentDetails,statistics', //add ',statistics' for view count info 
                        id: ids
                    })
                    detailsRequest.execute(function(response) {
                        srchItems = response.result.items;
                        srchItems.forEach(function(item, index) {
                            searchResult = ytSearchResults.find(function(sR) {
                                if(sR['id'] == item['id']) {
                                    return sR;
                                }
                            });
                            searchResult['duration'] = item.contentDetails.duration;
                            searchResult['views'] = item.statistics.viewCount;
                            searchResult['dislikes'] = item.statistics.dislikeCount;
                            searchResult['likes'] = item.statistics.likeCount;
                            searchResult['favorites'] = item.statistics.favoriteCount;
                            searchResult['comments'] = item.statistics.commentCount;
                        });
                        resolve(ytSearchResults);
                    })

                })
            }
        });
    };
    return service;
}])


app.controller('indexCtrl', ['$scope', '$http', '$location', '$window', '$q', '$timeout', 'ytService', function($scope, $http, $location, $window, $q, $timeout, ytService) {

    var init = function() {
        document.getElementById("artist_input").focus();
        $scope.selectedPlaylists = [];
        $scope.entry = {
            'artist': '',
            'title': '',
            'ytlink': ''
        };
        $scope.entry.entryType = "Track";
        $scope.importSpotify = false;
        $scope.loading = false;
    }

    $scope.removeLinkError = function(track) {
        if(track["status"] == 'ERROR' &&
            track["err"] != 'Download failed.') {
            track["status"] = '';
        }
    }

    $scope.downloadTracksFrontEnd = function(playlists, playlistIndex, trackIndex, i) {
        //base case
        if(trackIndex >= playlists[playlistIndex]['tracks'].length) {
            if(++playlistIndex >= playlists.length) {
                //all playlists downloaded, done
                return;
            } else {
                //reset trackIndex to start next playlist download
                trackIndex = 0;
            }
        }
        track = playlists[playlistIndex].tracks[trackIndex];
        track['status'] = 'DOWNLOADING';
        ytService.downloadSingleTrackFrontEnd(track, i);
        $timeout(function() {
            track['status'] = 'COMPLETE';
            $scope.downloadTracksFrontEnd(playlists, playlistIndex, ++trackIndex, ++i);
        }, 5000);
    }

    $scope.getArtists = function(val) {
        var apiKey = "6b6c09f642b5cfb021742ab36859cdb3"
        return $http.get("http://ws.audioscrobbler.com/2.0/?method=artist.search", {
            params: {
                artist: val,
                api_key: apiKey
            }
        }).then(function(response) {
            parser = new DOMParser();
            xmlResponse = parser.parseFromString(response.data, "text/xml");
            artists = xmlResponse.getElementsByTagName("artist");
            var artistArray = Array.prototype.slice.call(artists);
            artistArray = artistArray.map(function(artist) {
                return artist.getElementsByTagName('name')[0].innerHTML;
            });
            return artistArray
        });
    }

    $scope.getTrackOrAlbums = function(val) {
        if($scope.entry.entryType == "Track") {
            return $scope.getTracks(val);
        }
        if($scope.entry.entryType == "Album") {
            return $scope.getAlbums(val);
        }
    }

    $scope.getAlbums = function(val) {
        var apiKey = "6b6c09f642b5cfb021742ab36859cdb3"
        return $http.get("http://ws.audioscrobbler.com/2.0/?method=album.search", {
            params: {
                album: val,
                api_key: apiKey
            }
        }).then(function(response) {
            parser = new DOMParser();
            xmlResponse = parser.parseFromString(response.data, "text/xml");
            albums = xmlResponse.getElementsByTagName("album");
            var albumArray = Array.prototype.slice.call(albums);
            albumArray = albumArray.map(function(album) {
                return album.getElementsByTagName('name')[0].innerHTML;
            });
            return albumArray
        });
    }

    $scope.getTracks = function(val) {
        var apiKey = "6b6c09f642b5cfb021742ab36859cdb3"
        return $http.get("http://ws.audioscrobbler.com/2.0/?method=track.search", {
            params: {
                artist: $scope.entry.artist,
                track: val,
                api_key: apiKey
            }
        }).then(function(response) {
            parser = new DOMParser();
            xmlResponse = parser.parseFromString(response.data, "text/xml");
            tracks = xmlResponse.getElementsByTagName("track");
            var trackArray = Array.prototype.slice.call(tracks);
            trackArray = trackArray.map(function(track) {
                return track.getElementsByTagName('name')[0].innerHTML;
            });
            return trackArray
        });
    }

    $scope.debugSearch = function(entry) {
        var track = {
            'artist': entry.artist,
            'title': entry.title,
            'ytlink': entry.ytlink,
            'entryType': entry.entryType
        };
        if(track.artist === "" && track.title == "" && track.ytlink == "") {
            document.getElementById("artist_input").focus();
            return;
        }
        findNthBestLink(track, 2).then(function(results) {
            $scope.linkData = results
        }, function error(response) {
            $scope.linkData = [{'title':"search failed"}]
        });
    }

    $scope.processEntry = function(entry) {
        $scope.loading = true;
        var entryCopy = {
            'artist': entry.artist,
            'title': entry.title,
            'ytlink': entry.ytlink,
            'entryType': entry.entryType
        };
        if(entryCopy.entryType == "Album") {
            var apiKey = "6b6c09f642b5cfb021742ab36859cdb3"
            $http.get("http://ws.audioscrobbler.com/2.0/?method=album.getinfo", {
                params: {
                    album: entryCopy.title,
                    artist: entryCopy.artist,
                    api_key: apiKey
                }
            }).then(function success(response) {
                parser = new DOMParser();
                xmlResponse = parser.parseFromString(response.data, "text/xml");
                tracks = xmlResponse.getElementsByTagName("track");
                console.log(tracks);
                for(track of Array.from(tracks)) {
                    $scope.addTrack({
                        'artist': entryCopy.artist,
                        'title': track.getElementsByTagName('name')[0].innerHTML,
                        'ytlink': ""
                    })
                }
                $scope.loading=false;
            }, function error() {
                alert("Could not find that album :(");
                $scope.loading=false;
            })
        } else {
            $scope.addTrack(entryCopy);
            $scope.loading=false;
        }
    }

    $scope.addTrack = function(entry) {
        var track = {
            'artist': entry.artist,
            'title': entry.title,
            'ytlink': entry.ytlink,
            'entryType': entry.entryType
        };
        if(track.artist === "" && track.title == "" && track.ytlink == "") {
            document.getElementById("artist_input").focus();
            return;
        }
        if($scope.selectedPlaylists.length > 0 && $scope.selectedPlaylists[0]['name'] == "PoorMansJams Playlist") {
            var duplicate = $scope.selectedPlaylists[0]['tracks'].find(function(t, i) {
                if(t.artist == track.artist && t.title == track.title) {
                    return t;
                }
            });
            if(duplicate != undefined) {
                //TODO: do something to duplicate row
                alert(entry.title+" by "+entry.artist+" already in list. Skipping.");
                return
            }
        }
        if($scope.selectedPlaylists.length == 0 || $scope.selectedPlaylists[0].name != "PoorMansJams Playlist") {
            $scope.selectedPlaylists.unshift({
                'tracks': [],
                'name': "PoorMansJams Playlist"
            });
        }
        //Add tracks to PoorMansJams Playlist
        $scope.selectedPlaylists[0]['tracks'].unshift(track);
        if(track.ytlink == "") //link not provided
        {
            track.ytlink = "Smart Search..."
            findNthBestLink(track, 1).then(function(best) {
                if(track.ytlink == "Smart Search...") {
                    track.ytlink = best['link'];
                }
            }, function error(response) {
                if(track.ytlink == "Smart Search...") {
                    track['status'] = 'ERROR';
                    track['err'] = "Smart search failed. Please enter a link.";
                    track['ytlink'] = "Link Needed"
                }
            });
        }
        $scope.entry.title = "";
        $scope.entry.ytlink = "";
        document.getElementById("artist_input").select();
    }

    var findNthBestLink = function(track, n) {
        return $q(function(resolve, reject) {
            var searchString = track['artist'] + ' ' + track['title'];
            console.log(searchString);
            ytService.getYtLink(searchString).then(function success(results) {
                badKeywords = ["video", "album", "live", "cover", "remix", "instrumental", "acoustic", "karaoke"]
                goodKeywords = ["audio", "lyric"]

                badKeywords = badKeywords.filter(function(bK) {
                    if(searchString.indexOf(bK) == -1) {
                        return bK;
                    }
                });

                var scoreIndex = [];
                results.forEach(function(result, i) {
                    var matchScore = i;
                    badKeywords.forEach(function(bK) {
                        if(result['title'].indexOf(bK) != -1) {
                            matchScore += 1.1;
                        }
                    })
                    goodKeywords.forEach(function(gK) {
                        if(result['title'].indexOf(gK) != -1) {
                            matchScore -= 1.1;
                        }
                    })
                    if(result['title'].indexOf(track['artist'].replace('the ', '')) != -1) {
                        matchScore -= 5;
                    }
                    if(result['title'].indexOf(track['title']) != -1) {
                        matchScore -= 3;
                    }
                    scoreIndex.push([i, matchScore])
                });
                var bestToWorst = scoreIndex.sort(function(a, b) {
                    return a[1] - b[1];
                })
                if(n==2){
                    searchResults = []
                    for(j=0;j<5;j++){
                        resultDetails = results[bestToWorst[j][0]]
                        resultDetails['originalOrder'] = bestToWorst[j][0]
                        resultDetails['algScore'] = bestToWorst[j][1]
                        searchResults.push(resultDetails)
                    }
                    resolve(searchResults);
                }
                var nthBestIndex = bestToWorst[n - 1][0]
                resolve(results[nthBestIndex]);
            }, function error() {
                //try getting link using poormansjams server's algorithm implementation (which for some lame reason yields different results)
                $http({
                    url: "getYtlink/",
                    method: 'POST',
                    data: track
                }).then(function success(response) {
                    resolve(response.data);
                }, function error(response) {
                    reject();
                });
            });
        })

    }



    $scope.deletePlaylist = function(playlistID) {
        $scope.selectedPlaylists = $scope.selectedPlaylists.filter(function(playlist) {
            return playlist['id'] != playlistID;
        });
    };

    $scope.deletePlaylistRow = function(playlistID, rowIndex) {
        for(var i = 0; i < $scope.selectedPlaylists.length; i++) {
            playlist = $scope.selectedPlaylists[i]
            if(playlist.id == playlistID) {
                playlist.tracks.splice(rowIndex, 1);
                if(playlist.tracks.length == 0) {
                    $scope.selectedPlaylists.splice(i, 1);
                }
            }
        }
    };

    var importSpotifyPlaylists = function(event) {
        if(event.key == "selectedPlaylists") {
            var spotifyPlaylists = JSON.parse(event.newValue);
            if (spotifyPlaylists != "") {
                spotifyPlaylists.forEach(function(playlist) {
                    var duplicate = $scope.selectedPlaylists.find(function(p, i) {
                        if(p.name == playlist.name) {
                            return p;
                        }
                    });
                    if(duplicate != undefined) {
                        //TODO: do something to duplicate row
                        alert(playlist.name+" is already in list. Skipping.");
                        return
                    }
                    $scope.selectedPlaylists.push(playlist);
                    playlist.tracks.forEach(function(track) {
                        if(track.ytlink == undefined) //link not provided
                        {
                            track.ytlink = "Smart Search..."
                            findNthBestLink(track, 1).then(function(best) {
                                if(track.ytlink == "Smart Search...") {
                                    track.ytlink = best['link'];
                                }
                            }, function error(response) {
                                if(track.ytlink == "Smart Search...") {
                                    track['status'] = 'ERROR';
                                    track['err'] = "Smart search failed. Please enter a link.";
                                    track['ytlink'] = "Link Needed"
                                }
                            });
                        }
                    })
                })
            }
            
            $scope.importSpotify = false;
            $scope.$apply();
        }
        
    }

    $scope.loginSpotify = function() {
        $scope.importSpotify = true
        var SPOTIPY_CLIENT_ID = "6ddf2f4253a847c5bac62b17cd735e66"
        //for development server:
        //var SPOTIPY_REDIRECT_URI = "http://127.0.0.1:8000/callback/"
        //for production server:
        var SPOTIPY_REDIRECT_URI = "http://www.poormansjams.com/callback/"
        var spotifyScope = "playlist-read-private user-library-read"
        var spotifyAuthEndpoint = "https://accounts.spotify.com/authorize?" + "client_id=" + SPOTIPY_CLIENT_ID + "&redirect_uri=" + SPOTIPY_REDIRECT_URI + "&scope=" + spotifyScope + "&response_type=token&state=123";
        $window.open(spotifyAuthEndpoint,'callBackWindow','height=500,width=400');
        $window.addEventListener("storage", importSpotifyPlaylists);
    }

    $scope.onKeyPress = function($event, entry) {
        if($event.keyCode == 13) {
            // Here is where I must fire the click event of the button
            $scope.processEntry(entry);
        }
    }

    $scope.getRowClass = function(status, hovering) {
        if(hovering) {
            return 'hovering-row'
        }
        switch(status) {
            case "COMPLETE":
                return 'complete-row';
                break;
            case "ERROR":
                return 'error-row';
                break;
            case "DOWNLOADING":
                return 'downloading-row';
                break;
            default:
                return 'default-row';
                break;
        }
    }



    init();

}]);

app.controller('headCtrl', ['$scope', '$http', '$window', function($scope, $http, $window) {
    $scope.debugMode = false;
    $scope.dynamicStylesheet = "/static/island.css"
    $scope.PRIMARY = "cf66ff";
    $scope.SECONDARY = "ffe866";
    $scope.PRIMARY_LIGHT = "efccff";
    $scope.SUCCESS_ROW = "96ff66";
    $scope.BACKGROUND = "000000";
    $scope.HOVER_ROW = "efccff";
    $scope.OPACITY = "1";
    $scope.changeStyle = function(PRIMARY, PRIMARY_LIGHT, SECONDARY, SUCCESS_ROW, HOVER_ROW, BACKGROUND, OPACITY) {
        $http({
            url: "changeStyleSheet/",
            method: 'POST',
            data: {
                'PRIMARY': PRIMARY,
                'PRIMARY_LIGHT': PRIMARY_LIGHT,
                'SECONDARY': SECONDARY,
                'SUCCESS_ROW': SUCCESS_ROW,
                'HOVER_ROW': HOVER_ROW,
                'BACKGROUND': BACKGROUND,
                'OPACITY': OPACITY,
                'ERROR_ROW': "ff6666",
                'oldSheet':$scope.dynamicStylesheet
            }
        }).then(function success(response) {
            var newStyle = response.data['newStylesheet'];
            $scope.dynamicStylesheet = newStyle;
            setTimeout(function(){$scope.$apply()},1000);
        }, function error(response) {
            alert('something went wrong. did you enter a color for each?')
        });
        $scope.PRIMARY = PRIMARY
        $scope.SECONDARY = SECONDARY
        $scope.PRIMARY_LIGHT = PRIMARY_LIGHT
        $scope.SUCCESS_ROW = SUCCESS_ROW
        $scope.BACKGROUND = BACKGROUND
        $scope.HOVER_ROW = HOVER_ROW
    }

    $scope.randomStyle = function(){
        $scope.changeStyle(randColor(),randColor(),randColor(),randColor(),randColor(),randColor(),"1");
    }

    randColor = function(){
        hex = "0123456789ABCDEF";
        randDigit = function() { return hex[getRandomInt(0,hex.length)]};
        return randDigit() +
                randDigit() +
                randDigit() +
                randDigit() +
                randDigit() +
                randDigit();


    }

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }
    $scope.saveStyle = function() {
        $http({
            url: "saveStyle/",
            method: 'POST',
            data: {
                'filename': $scope.dynamicStylesheet
            }
        }).then(function success(response) {
            alert('success! eric will check out your submission. you can let him know its named: ' + $scope.dynamicStylesheet);
            console.log("success");
        }, function error(response) {
            console.log("failed");
        })
    }

    //setInterval( "$scope.randomStyle()", 300 );
    //$scope.randomStyle();

}])

app.controller('spotifyCtrl', ['$scope', '$http', 'ytService', function($scope, $http, ytService) {
    
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
        for(i = 0; i < urlHash.length; i++) {
            if(i == urlHash.length - 1) {
                //get last field value
                hashContents[currField] = urlHash.substr(valueStart);
            }
            switch(urlHash[i]) {
                case('#'):
                    //first field
                    fieldStart = i + 1;
                    break;
                case('&'):
                    hashContents[currField] = urlHash.substr(valueStart, i - valueStart);
                    fieldStart = i + 1;
                    break;
                case('='):
                    currField = urlHash.substr(fieldStart, i - fieldStart);
                    valueStart = i + 1;
                    break;
            }
        }
        return hashContents;
    };

    $scope.addPlaylistsToQueue = function() {
        var selectedPlaylists = []
        $scope.playlists.forEach(function(playlist) {
            if($('#' + playlist['id'])[0].checked) {
                selectedPlaylists.push(playlist);
            }
        })
        localStorage.clear();
        localStorage.setItem('selectedPlaylists', JSON.stringify(selectedPlaylists));
        window.close();
    };

    $scope.cancel = function() {
        localStorage.clear();
        localStorage.setItem('selectedPlaylists', JSON.stringify(""));
        window.close();
    }

    $scope.onKeyPress = function($event, entry) {
        if($event.keyCode == 13) {
            //fire the click event of the button
            $scope.addPlaylistsToQueue();
        }
    }
    init();
}]);