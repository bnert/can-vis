# can-vis

## By: Brent Daniels-Soles
## For: CS 410: Sound & Music w/ Bart Massey
## Term: Spring 2019

## CLI Commands ~ From preact cli
*   `npm install`: Installs dependencies -> RUN THIS FIRST

*   `npm run start`: Runs `serve` or `dev`, depending on `NODE_ENV` value. Defaults to `dev server`

*   `npm run dev`: Run a development, HMR server

*   `npm run serve`: Run a production-like server

*   `npm run build`: Production-ready build

*   `npm run lint`: Pass TypeScript files using TSLint

*   `npm run test`: Run Jest and [`preact-render-spy`](https://github.com/mzgoddard/preact-render-spy) for your tests

For detailed explanation on how things work, checkout the [CLI Readme](https://github.com/developit/preact-cli/blob/master/README.md).

# Overview

## Steps to build/install

There are two main requirements for getting the project up and running, the first is have Node.js installed on your local machine.
If it is not installed, you can find the download/install wizard [here](https://nodejs.org/en/). The second is to have the npm cli installed
(which to my knowledge is bundled in the download of Node). After those two requirements are met, run `npm install`, then `npm run start` and
navigate to `http://localhost:8080` in your browser to start messing around with audio!

## Application Details

### 1. The Idea

The idea behind this applicaiton is to translate a drawing into sound. This sounds good in theory, but in practice there are a whole slew of wierd edge cases when implementing such a system. I will get into what some of those cases are, but before then I want to describe the system at a high level.

First off, the idea was to have lines on an html canvas element represent a series of frequecies to play on a loop. 

What this looks like in practice, at a high leve, is:

1. A user 'draws' a line or shape on the canvas.
2. The system grabs a row of pixels at any given time and translates 'painted pixels' into frequency data.
3. The frequency data is then sent to an audio buss that will then output the sound at that point in time.
4. The system repeats 2 - 3 for the next slice of pixels at the next time interval

After I had the high level idea down, I started to work on architecting the system and implementing a solution. Some of the features that were added to the applications are:
* Multi wave types (sine, triangle, square, sawtooth), which each correspond to a individual monophonic channel
* Volume control for each wave type (that way it won't get annoyingly loud)
* Selection of what wave type to 'draw'
* Play/Pause
* Tempo adjust (though it doesn't work very well...)

To build this out, I used a framework called Preact.js, which enables component drive design/implementation of an application. Along with that I use TypeScript as the scripting language. Besides that I didn't use anything else except the standard web API's availble in Chrome and Firefox.

### 2. The Implementation

Getting the basic layout was pretty easy. The HTML5 spec has a lot for rolled in functionality for building slider/touch based elements, so I was able to utilize those and adapt them to my needs. From there, one of the first problems I ran into was getting data moving around the application. Since the application is componenet based, each component is isolated from one another, and requires some passing of functions/objects around in order to share the updates/application state with other components. This manual method became cumbersome very quickly, so I implemented a message buss which components could hook into and subscirbe to events, leaving the event handling up to each component.

After I had the message buss in place, I then started in work in implementing an audioScheduler, which would compute the sampeld pixels into sounds. I implemented a basic version fairly quickly, however, the computation would get so expensive it would take up much of the main thread compute time, which in turn froze the UI and made the application very un-usable. After I hit this snag, I took the scheduler code and broke into a WebWorker (essentially another thread in the browser) and moved all of the compute heavy work off of the main thread. In addition to breaking the audio scheduler into smalle chunks, I setup a HashMap with 4 buffers, one for each channel. The HashMap of buffers led to the ability to send along the first elements in each of the buffer as a whole chunk, rather than having to deal with interleaved frequency/pixel data packets.

The audioScheduler thread and the main thread communicate via a message buss defined by the browser, so I configured the application to do the following on a loop for the duration of a users session: 

1. The app polls the main thread for canvas data
2. Once recieved, the pixel data is computed to get the frequency data
3. After being computed, the frequency data is sent to a buffer
4. The first items in each of the channel buffers are sent back to the canvas components
5. Upon the canvas component receiving the data, it passes the data along to the mixer component.
6. Audio is updated for each of the mixer channels

Besides all of that going on, most state in the application is local to components, and when data is needing to be shared between them, but not serialized to a global store, the client side message buss is used to trigger events in other components or send along data.

#### 2.1 UI Elements

Briefly, the UI laid out from left to right is:

* Volume Controls for the Mixer
* Mute/Unmute Buttons
* Color Selections for drawing on  the canvas
* Canvas
* Tempo / Start & Stop buttons

The UI is styled to look like a MIDI controller, minus the tempo slider (I ran into some wierd conflicting browser specifications for vertical range sliders).

#### 2.2 Stuff that doesn't work (well at least)

One of the features that doesn't work too well is the Tempo slider. The reason being is it takes quite a long time to speed up/slow down, and I think this is due to how I am currently using setTimeout to queue up sending buffered data from the worker to the main thread.

Another feature that I ran out of time to implement, is the ability to clear the canvas without having to refresh the page.

Finally, the most significant bug that I haven't yet fixed, is the notes do not stop playing when pixels are not drawn on the canvas. Currently when the end of a line is reach, the audio will continue to play at the last computed frequency, rather than becoming silent.


### 3. Lesson learned

The biggest lessson I have learned throught this project is: audio is hard. The reason being, is it takes up so much computation, as well as some hackery, in order to get it working. Integrating audio into an application like this, was a bit awkward. Working to integrate painted pixels to certain audio frequencies for certain wave types was pretty cumbersome at first, and making the application perform well required some time hacking away at different pieces.

I also learned testing Web Apps can be difficult. I didn't write any formal unit tests for this application, due to a good chunk of the elements I were using were based on available browser API's, which I did not have the time to mock various browser functionality. In this future, I do know I will look into what testing libraries are available for certain browser API's before starting in on implementation.