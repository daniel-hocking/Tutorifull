# <img src="https://chybby.com/static/images/tutorifull_icon.svg" width="70" height="70"> Tutorifull

## Introduction

Every CSE person has at some point written a script to tell them when someone drops out of a full class so they can enrol. I did it, it was terrible, it spammed me with emails and only worked in my specific case so I decided to make it better - something everyone could use. Tutorifull is the result.

## How it works

Tutorifull is split into three parts: the website, the scraper and the database.

### The Website

The website frontend is written in HTML Jinja templates, Sass and vanilla JS.

The website backend is written in Python using Flask. The flask application is created in [tutorifull.py](https://github.com/Chybby/Tutorifull/blob/master/tutorifull.py).

### The Scraper

The scraper runs periodcally, checks whether classutil has updated (classutil only updates around 3 times a day), updates the database with any classutil updates and sends off any ready alerts.

People can be alerted in three different ways:

| Contact Method | API             |
| -------------  | --------------- |
| Email          | Mailgun         |
| SMS            | Telstra SMS API |
| YO             | YO API          |

### The Database

Both the website and the scraper need a place to store/retrieve information right?

The database is managed using SQLAlchemy. The models live in [models.py](https://github.com/Chybby/Tutorifull/blob/master/models.py).

## Running your own version

Note: These instructions might be incomplete in terms of installing things, you will probably need to install a couple more things - look at errors or something.

 1. Clone the repo into a directory somewhere
    - `git clone https://github.com/Chybby/Tutorifull.git`
 2. Install gulp globally: `npm install -g gulp`
 3. Run `npm install`
 4. Run `gulp`
    - In order for Gulp to be run automatically as you edit files, run `gulp watch`
 5. Copy example_config.py and rename it config.py
    - Edit all the example values into useful ones
    - You will need to make various accounts in order to get all the API keys
 6. Create a virtualenv and activate it
    - `virtualenv venv`
    - `. venv/bin/activate`
 7. Install all required python modules
    - `pip install -r requirements.txt`
 8. Populate your database
    - `python scraper.py --force-update`
 9. Start the Flask server
    - `python tutorifull.py`
 10. Go to `127.0.0.1:5000` in your browser
