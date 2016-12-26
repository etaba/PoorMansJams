from django.conf.urls import url

from . import views

#namespace
app_name = 'GrattifyWebApp'

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^addsong',views.addSong, name = 'addSong')
]