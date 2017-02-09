from django.conf.urls import url

from . import views

#namespace
app_name = 'GrattifyWebApp'

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^getAlbumTracks',views.getAlbumTracks, name = 'getAlbumTracks'),
    url(r'^downloadTracks',views.downloadTracks, name = 'downloadTracks'),
    url(r'^serveZip',views.serveZip, name = 'serveZip'),
    url(r'^getYtlink',views.getYtlink, name = 'getYtlink'),
    url(r'^loadTracksToSession',views.loadTracksToSession, name = 'loadTracksToSession'),
    url(r'^callback/',views.callback, name = 'callback')
]