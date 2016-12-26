from datetime import datetime, timedelta
from django.conf import settings
from django.contrib import auth

class EndSession(object):
#    def __init__(self, get_response):
#        self.get_response = get_response
#        # One-time configuration and initialization.
#
#    def __call__(self, request):
#        # Code to be executed for each request before
#        # the view (and later middleware) are called.
#
#        response = self.get_response(request)
#
#        # Code to be executed for each request/response after
#        # the view is called.
#
#        return response
    def process_request(self, request):
        if datetime.now() - request.session['last_touch'] > timedelta(0,settings.SESSION_TIMEOUT,0):
            del request.session['last_touch']
            #clean up session stuff here
            return
        request.session['last_touch'] = datetime.now()
