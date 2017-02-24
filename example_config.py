# This is an example config file
# copy this into a file called 'config.py' and change values to ones specific to you

DATABASE = 'postgresql://tutorifull:tutorifull@localhost:5432/tutorifull'  # how to connect to the database
REDIS_PORT = 6379
DEBUG = False  # never set this to True in production
SECRET_KEY = 'example secret key'  # flask secret key
BASE_DOMAIN_NAME = 'example.com'  # base domain name hosting the site
SUB_DOMAIN_NAME = 'test'  # sub domain name hosting the site
FULL_DOMAIN_NAME = SUB_DOMAIN_NAME + '.' + BASE_DOMAIN_NAME # full domain name hosting the site
MAILGUN_DOMAIN_NAME = 'mg.example.com'  # domain for sending mailgun emails
YO_API_KEY = 'example YO api key'  # YO api key
MAILGUN_API_KEY = 'example Mailgun api key'  # Mailgun api key
TELSTRA_CONSUMER_KEY = 'example telstra consumer key'  # Telstra consumer key
TELSTRA_CONSUMER_SECRET = 'example telstra consumer secret'  # Telstra consumer secret
SENTRY_DSN = 'https://1234567890:1234567890@sentry.io/1234567890' # sentry.io DSN, for error logging
ASSETREV_MANIFEST_FILE = 'manifest.json'  # Manifest file for content hashed static files (for cache busting)
