from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.urls import reverse
from grattify import *
import os

def index(request):
	try:
		context = {'tracks': request.session['tracks']}
	except KeyError:
		#beginning of session
		request.session['tracks'] = []
		context = {'tracks': request.session['tracks']}
		#raise Http404("KeyError on session track list")
	return render(request, 'GrattifyWebApp/index.html', context)

def addSong(request):
	if (request.POST['button']=="clear"):
		del request.session['tracks']
		return HttpResponseRedirect(reverse('GrattifyWebApp:index'))
	if(request.POST['entryType']=="album"):
		artist = request.POST['artist']
		album = request.POST['title']
		tracks = getAlbum(artist,album)
		tracks.reverse()
		for track in tracks:
			request.session['tracks'].insert(0,(artist,track))
	else:
		request.session['tracks'].insert(0,(request.POST['artist'],request.POST['title']))
	
	#request.session.modified = True
	return HttpResponseRedirect(reverse('GrattifyWebApp:index'))

def downloadTracks(request):
	failedDownloads = []
	saveDir = "tracks_" + request.session.session_key
	if not os.path.exists(saveDir):
		os.makedirs(saveDir)
	for track in request.session['tracks']:
		if not downloadSong(track[1],track[0],1,saveDir):
			failedDownloads.append(track)
