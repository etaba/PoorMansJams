from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.urls import reverse
from spotipy import oauth2
import os, zipfile, json, grattify, spotipy

def index(request):
	if not 'tracks' in request.session:
		request.session['tracks'] = []
	context = {'tracks': request.session['tracks']}
	return render(request, 'GrattifyWebApp/index.html',context)


def downloadTracks(request):
	print "downloading the tracks now..."
	request.session['tracks'] = request.POST['tracks']
	failedDownloads = []
	saveDir = "songCache"
	zipDir = "YourMusic_" + request.session.session_key + ".zip"
	zipOut = zipfile.ZipFile(zipDir,'w',zipfile.ZIP_STORED,True)

	if not os.path.exists(saveDir):
		os.makedirs(saveDir)
	for track in request.session['tracks']:
		if grattify.downloadSong(track['title'],track['artist'],1,saveDir,ytlink=track['ytlink']):
			savePath = grattify.makeSavepath(track['title'],track['artist'],saveDir)
			zipOut.write(savePath)
		else:
			failedDownloads.append(track)
	zipOut.close()
	request.session['zipDir'] = zipDir
	response_data = {'failedTracks':failedDownloads, 'zipPath':zipDir}
	return HttpResponse(json.dumps(response_data),content_type="application/json")

def serveZip(request):
	if os.path.exists(request.session['zipDir']):
		servableZip = open(request.session['zipDir'],'r')
		response = HttpResponse(servableZip, content_type='application/zip')
		response['Content-Disposition'] = 'attachment; filename="%s"' % request.session['zipDir']
		return response
	else:
		return Http404

def getYtlink(request):
	artist = request.POST['artist'] if "artist" in request.POST else ""
	title =  request.POST['title'] if "title" in request.POST else ""
	response_data = {'link': grattify.findNthBestLink(1,artist,title)['link']}
	return HttpResponse(json.dumps(response_data),content_type="application/json")

def callback(request):
	print "in callback, dumping request shit\n"
	SPOTIPY_CLIENT_ID = "6ddf2f4253a847c5bac62b17cd735e66"
	SPOTIPY_CLIENT_SECRET = "5b54de875ad349f3bb1bbecd5832f276"
	SPOTIPY_REDIRECT_URI = "http://127.0.0.1:8000/callback/"
	
	return render(request, 'GrattifyWebApp/spotifySelect.html',{})




	#scope = "playlist-read-private user-library-read"
	#sp_oauth = oauth2.SpotifyOAuth( SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET,SPOTIPY_REDIRECT_URI,scope=scope)
	#code = sp_oath.parse_response_code(request.url)
	#token_info = sp_oauth.get_access_token(code)
	#access_token = token_info['access_token']
	
#	playlists = []
#	if token:
#	    sp = spotipy.Spotify(auth=token)
#	    user = sp.current_user()['id']
#	    spPlaylists = sp.user_playlists(user)
#	    for playlist in spPlaylists['items']:
#	    	if (len(reqPlaylists) == 0 or playlist['name'].lower() in [pl.lower() for pl in reqPlaylists]):
#				results = sp.user_playlist(user, playlist['id'],
#				    fields="tracks,next")
#				songs = map((lambda item:item['track']['name']),results['tracks']['items'])
#				artists = map((lambda item:item['track']['artists'][0]['name']),results['tracks']['items'])
#				tracks = zip(artists,songs)
#				
#				playlists.append({'name':playlist['name'],'tracks':tracks})
#		return HttpResponse(json.dumps(playlists),content_type="application/json")
#	else:
#	    print "Can't get token for", username
#	return Http404

#def getSpotifyPlaylists(request):
#	SPOTIPY_CLIENT_ID = "6ddf2f4253a847c5bac62b17cd735e66"
#	SPOTIPY_CLIENT_SECRET = "5b54de875ad349f3bb1bbecd5832f276"
#	SPOTIPY_REDIRECT_URI = "http://127.0.0.1:8000/callback/"
#	scope = "playlist-read-private user-library-read"
#	link = "https://accounts.spotify.com/authorize"

	#code = sp_oauth.parse_response_code(url)
	#if code:
	#	print "Found Spotify auth code in Request URL! Trying to get valid access token..."
	#	token_info = sp_oauth.get_access_token(code)
	#	access_token = token_info['access_token']
#
	#if access_token:
	#	print "Access token available! Trying to get user information..."
	#	sp = spotipy.Spotify(access_token)
	#	results = sp.current_user()
	#	return results
#
	#else:
	#	return htmlForLoginButton()

#def htmlForLoginButton():
#    auth_url = getSPOauthURI()
#    htmlLoginButton = "<a href='" + auth_url + "'>Login to Spotify</a>"
#    return htmlLoginButton
#
#def getSPOauthURI():
#    auth_url = sp_oauth.get_authorize_url()
#    return auth_url
#	sp_oauth = oauth2.SpotifyOAuth( SPOTIPY_CLIENT_ID, SPOTIPY_CLIENT_SECRET,SPOTIPY_REDIRECT_URI,scope=SCOPE)
#
#	playlists = grattify.getSpotifyPlaylists("dummy",[])
#	return HttpResponse(json.dumps(playlists),content_type="application/json")

def loadTracksToSession(request):
	request.session['tracks'] = request.POST['tracks']
	return

def getAlbumTracks(request):
	artist = request.POST['artist']
	album = request.POST['title']
	trackTitles = grattify.getAlbum(artist,album)
	tracks = [] 
	for title in trackTitles:
		tracks.append({'artist':artist,'title':title})
	tracks.reverse()
	response_data = {'tracks':tracks}
	return HttpResponse(json.dumps(response_data),content_type="application/json")



