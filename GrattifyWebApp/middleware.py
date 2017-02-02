#from datetime import datetime, timedelta
import time,json,urllib
from django.conf import settings
from django.contrib import auth
from django.http import QueryDict

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
		try:
			if time.time() - request.session['last_touch'] > settings.SESSION_TIMEOUT:
			#if datetime.now() - request.session['last_touch'] > timedelta(0,settings.SESSION_TIMEOUT,0):
				del request.session['tracks']
			    #clean up session stuff here
			    #delete any zip files
			else:
				request.session['last_touch'] = time.time()
		except Exception as e:
			request.session['last_touch'] = time.time()
		return

class JSONMiddleware(object):
    def process_request(self, request):
        if 'application/json' in request.META['CONTENT_TYPE']:
            # load the json data
            data = json.loads(request.body)
            # for consistency sake, we want to return
            # a Django QueryDict and not a plain Dict.
            # The primary difference is that the QueryDict stores
            # every value in a list and is, by default, immutable.
            # The primary issue is making sure that list values are
            # properly inserted into the QueryDict.  If we simply
            # do a q_data.update(data), any list values will be wrapped
            # in another list. By iterating through the list and updating
            # for each value, we get the expected result of a single list.
            q_data = QueryDict('', mutable=True)
            if isinstance(data, list):
            	q_data.update({'tracks':data})
            else:
	            for key, value in data.iteritems():
	                if isinstance(value, list):
	                    # need to iterate through the list and upate
	                    # so that the list does not get wrapped in an
	                    # additional list.
	                    for x in value:
	                        q_data.update({key: x})
	                else:
	                    q_data.update({key: value})

            if request.method == 'GET':
                request.GET = q_data

            if request.method == 'POST':
                request.POST = q_data

        return None