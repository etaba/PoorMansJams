from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.urls import reverse
from grattify import *
import os, zipfile, json

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
		if downloadSong(track['title'],track['artist'],1,saveDir):
			savePath = makeSavepath(track['title'],track['artist'],saveDir)
			zipOut.write(savePath)
		else:
			failedDownloads.append(track)
	zipOut.close()
	request.session['zipDir'] = zipDir
	response_data = {'failedTracks':failedDownloads, 'zipPath':zipDir}
	print "done downloading..."
	return HttpResponse(json.dumps(response_data),content_type="application/json")

def serveZip(request):
	print "serving zip...", request.session['zipDir']
	if os.path.exists(request.session['zipDir']):
		print "it exists..."
		servableZip = open(request.session['zipDir'],'r')
		response = HttpResponse(servableZip, content_type='application/zip')
		response['Content-Disposition'] = 'attachment; filename="%s"' % request.session['zipDir']
		return response
	else:
		print "file not found..."
		return Http404

	


def getAlbumTracks(request):
	artist = request.POST['artist']
	album = request.POST['title']
	tracks = getAlbum(artist,album)
	tracks.reverse()
	response_data = {'tracks':tracks}
	return HttpResponse(json.dumps(response_data),content_type="application/json")

#def downloadTracks(request):
#	print "here!"
#	failedDownloads = []
#	saveDir = "songCache"
#	zipDir = "YourMusic_" + request.session.session_key
#	zipOut = zipfile.ZipFile(zipDir,'w',zipfile.ZIP_STORED,True)
#
#	if not os.path.exists(saveDir):
#		os.makedirs(saveDir)
#	for track in request.session['tracks']:
#		if downloadSong(track[1],track[0],1,saveDir):
#			savePath = makeSavepath(track[1],track[0],saveDir)
#			zipOut.write(savePath)
#		else:
#			failedDownloads.append(track)
#	response = HttpResponse(zipOut, content_type='application/force-download')
#	response['Content-Disposition'] = 'attachment; filename="%s"' % 'YourSongs.zip'
#	zipOut.close()
#	return response

