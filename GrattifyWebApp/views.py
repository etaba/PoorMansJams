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
	zipName = request.GET['name'] + '.zip'
	#zipName = request.session['zipDir']
	#print 'serving ' + zipName
	if os.path.exists(request.session['zipDir']):
		os.rename(request.session['zipDir'],zipName)
		servableZip = open(zipName,'rb')
		#servableZip = zipName;
		response = HttpResponse(servableZip, content_type='application/zip') #try octet-stream instead of zip if problems
		response['Content-Disposition'] = 'attachment; filename="%s"' % zipName
		return response
	else:
		return Http404

def getYtlink(request):
	artist = request.POST['artist'] if "artist" in request.POST else ""
	title =  request.POST['title'] if "title" in request.POST else ""
	response_data = {'link': grattify.findNthBestLink(1,artist,title)['link']}
	return HttpResponse(json.dumps(response_data),content_type="application/json")

def callback(request):
	return render(request, 'GrattifyWebApp/spotifySelect.html',{})


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



