from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.urls import reverse
from grattify import *
import os, zipfile

def index(request):
	if not 'tracks' in request.session:
		request.session['tracks'] = []
	context = {'tracks': request.session['tracks']}
	return render(request, 'GrattifyWebApp/index.html',context)


def addSong(request):
	if (request.POST['button']=="clear"):
		del request.session['tracks']
		return HttpResponseRedirect(reverse('GrattifyWebApp:index'))
	if (request.POST['entryType']=="album"):
		artist = request.POST['artist']
		album = request.POST['title']
		tracks = getAlbum(artist,album)
		tracks.reverse()
		for track in tracks:
			request.session['tracks'].insert(0,(artist,track))
	if (request.POST['button']=="download"):
		failedDownloads = []
		saveDir = "songCache"
		zipDir = "YourMusic_" + request.session.session_key + ".zip"
		zipOut = zipfile.ZipFile(zipDir,'w',zipfile.ZIP_STORED,True)

		if not os.path.exists(saveDir):
			os.makedirs(saveDir)
		for track in request.session['tracks']:
			if downloadSong(track[1],track[0],1,saveDir):
				savePath = makeSavepath(track[1],track[0],saveDir)
				zipOut.write(savePath)
			else:
				failedDownloads.append(track)
		zipOut.close()
		servableZip = open(zipDir,'r')
		response = HttpResponse(servableZip, content_type='application/force-download')
		response['Content-Disposition'] = 'attachment; filename="%s"' % zipDir
		return response
	else:
		request.session['tracks'].insert(0,(request.POST['artist'],request.POST['title']))
		#request.session.modified = True
		return HttpResponseRedirect(reverse('GrattifyWebApp:index'))

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

