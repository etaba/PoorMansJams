Making changes to PMJ:

1) Local repo should have DJANGO_DEVELOPMENT environment variable set to True
2) Production repo should have POORMANSJAMS_SECRET_KEY environment variable set to the Django private key
3) Make changes in local repo and test by calling 'python manage.py runserver'
4) Local server is at 127.0.0.1, uncomment dev code in the JS spotify callback handler so that it uses this localhost if you are testing Spotify import
5) When changes are ready, push back to origin branch on github first:
	git add *
	git commit -m "message"
	git push origin
6) Code can then be pushed directly to prod:
	git push production

To interact with prod server
1) ssh into eptaba@poormansjams.com
2) If branch is behind master, 'git pull'
3) When repo is up to date, run 'python manage.py collectstatic' to copy and minify JS and stylesheets
4) To apply changes, run 'touch ~/poormansjams.com/tmp/restart.txt'
5) Changes should now be propagated and observable through the browser

TODO:
album error handle
import spotify twice
download, add, download again
redownload row
detect html downloaded instead of mp3?
