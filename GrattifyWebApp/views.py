from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse, Http404, HttpResponseServerError
from django.urls import reverse
from spotipy import oauth2
import os, zipfile, json, grattify, spotipy
import shutil
from random import randint

def index(request):
	if not os.path.exists('tmp/'+request.session.session_key):
		#session start
		os.makedirs('tmp/'+request.session.session_key);
		request.session['tracks'] = []
	context = {'tracks': request.session['tracks']}
	return render(request, 'GrattifyWebApp/index.html',context)

def downloadSingleTrack(request):
	saveDir = "songCache"
	track = request.POST['track']
	if not 'title' in track:
		track['title'] = ""
	if not 'artist' in track:
		track['artist'] = ""

	if grattify.downloadSong(track['title'],track['artist'],1,saveDir,ytlink=track['ytlink']):
		success = True
	else:
		success = False

	if request.POST['serve']: #upload file directly to client, skip zipping
		if not success:
			return HttpResponseServerError();
		else:
			savePath = grattify.makeSavepath(track['title'],track['artist'],saveDir)
			print "savePath to download from: ",savePath
			trackFile = open(savePath,'rb')
			response = HttpResponse(trackFile, content_type='audio/mpeg-stream') #try octet-stream instead of zip if problems
			response['Content-Disposition'] = 'attachment; filename="%s - %s.mp3"' % (track['artist'],track['title'])
			return response
	else: #return without file
		response_data = {'success':success}
		return HttpResponse(json.dumps(response_data),content_type="application/json")

def zipTracks(request):
	zipName = request.POST['playlistName']+".zip"
	zipDir = "tmp/" + request.session.session_key + "/"+zipName
	zipOut = zipfile.ZipFile(zipDir,'w',zipfile.ZIP_STORED,True)
	for track in request.POST['tracks']:
		savePath = grattify.makeSavepath(track['title'],track['artist'],"songCache")
		if os.path.exists(savePath):
			zipOut.write(savePath,os.path.basename(savePath))
	zipOut.close()
	response_data = {"zipName":zipName}
	return HttpResponse(json.dumps(response_data),content_type="application/json")

def serveZip(request):
	zipPath = "tmp/" + request.session.session_key + "/" + request.GET['zipName']
	if os.path.exists(zipPath):
		servableZip = open(zipPath,'rb')
		response = HttpResponse(servableZip, content_type='application/zip') #try octet-stream instead of zip if problems
		response['Content-Disposition'] = 'attachment; filename="%s"' % request.GET['zipName']
		return response
	else:
		print "umm zip not found..."
		print os.getcwd()
		return HttpResponseServerError()

def getYtlink(request):
	artist = request.POST['artist'] if "artist" in request.POST else ""
	title =  request.POST['title'] if "title" in request.POST else ""
	print "gonna get that link"
	nthBest = grattify.findNthBestLink(1,artist,title);
	if not nthBest:
		return HttpResponseServerError("No Youtube search results")
	else:
		print "link on the way:",nthBest['link']

		response_data = {'link': nthBest['link']}
		return HttpResponse(json.dumps(response_data),content_type="application/json")

def callback(request):
	return render(request, 'GrattifyWebApp/spotifySelect.html',{})


def getAlbumTracks(request):
	artist = request.POST['artist']
	album = request.POST['title']
	trackTitles = grattify.getAlbum(artist,album)
	if not trackTitles:
		return HttpResponseServerError("Album not found.")
	tracks = [] 
	for title in trackTitles:
		tracks.append({'artist':artist,'title':title})
	tracks.reverse()
	response_data = {'tracks':tracks}
	return HttpResponse(json.dumps(response_data),content_type="application/json")

def changeStyleSheet(request):
	print os.getcwd();
	customStylesheet = "GrattifyWebApp/static/customSheets/styles_"+str(randint(0,99999))+".css"
	newCss = open(customStylesheet,'w+')
	templateCss = open("GrattifyWebApp/static/customSheets/stylesheetTemplate.css",'r')
	for line in templateCss.readlines():
		firstDelim = line.find('%')
		if firstDelim != -1:
			secondDelim = line.find('%',firstDelim+1)
			token = line[firstDelim+1:secondDelim]
			newCss.write(line[0:firstDelim] + request.POST[token] + line[secondDelim+1:])
		else:
			newCss.write(line)
	newCss.close()
	templateCss.close()
	return HttpResponse(json.dumps({'newStylesheet': customStylesheet[14:]}),content_type="application/json")

def saveStyle(request):
	shutil.copy("GrattifyWebApp"+ request.POST['filename'], "GrattifyWebApp/savedSheets/" + request.POST['filename'][-10:])
	return HttpResponse()



