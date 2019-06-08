/**
 * Web Worker for computing data sent by the canvas
 */
// It isn't usually the best to have global variables,
// however, in this context, we do need to asign out some // globals in order to check 

// Housekeeping
let initialized = false;
let audioScheduer = null;

// Pixels
let pixelBuffer = [];
// Audio buffer
let frequencyDataBuffer = [];
let currentAudioClockTime = 0;

// Some canvas data
let canvasWidth = 0;
let canvasHeight = 0;

// Some sampling computational data
let currentSliceStart = 0;
let samplingBufferLookahead = 0;
let samplingSliceWidth = 0;
let samplingFreq = 0;

/**
 * We want a hash map of buffers for each
 * color value, that way instead of interleaving
 * seperate values, we can batch them in a single
 * package.
 */
// First let's list key variables for
// ease of using:
const sinKey = '0-160-210';
const triKey = '0-160-70';
const squKey = '210-0-0';
const sawKey = '240-70-130';
let sampleBufferHash = {
  [sinKey]: [], // sine blue
  [triKey]: [], // triangle green
  [squKey]: [], // square red
  [sawKey]: [] // saw purple
}

// Only need an array, due to the fact
// we need to cancel all timeouts at a given
// point in time
let timeOuts = new Array(10); // arbitrary 10

/**
 * This is meant to poll the canvas for its
 * data. The reason we do this here, is so there
 * is no concern about syncing timeouts between
 * the worker and the canvas component.
 */
const getCanvasData = () => {
  self.postMessage({
    action: 'GET_CANVAS',
    payload: {
      sliceStart: currentSliceStart
    }
  });
  currentSliceStart += samplingSliceWidth;
  if (currentSliceStart >= canvasWidth) {
    // Need to reset, otherwise, there may be stale data in the buffer
    currentSliceStart = 0;
    frequencyDataBuffer = [];
    pixelBuffer = [];
  }
  timeOuts[0] = self.setTimeout(getCanvasData, samplingFreq);
}

/**
 * Formats and pushes sampeld data from the
 * canvas object into a buffer which is then
 * used to compute frequency data.
 * @param {*} payload 
 */
const pushSampledDataToBuffer = (payload) => {
  const data = {
    time: payload.currentTime,
    pxData: new Uint8Array(payload.buf)
  };
  pixelBuffer.push(data);
}

/**
 * Utility for throwing the rgba values into 
 * an object
 * @param {*} pxArray 
 * @param {*} i 
 */
const compPx = (pxArray, i) => ({
  r: pxArray[i],
  g: pxArray[i + 1],
  b: pxArray[i + 2],
  a: pxArray[i + 3]
})

const nearestTenth = (value) => Math.floor(value / 10) * 10

/**
 * Use this to create a hash for
 * pixels that have already been computed.
 *
 * Using this, the program will not have to
 * sift through various frequency data,
 * but will only have to use one.
 *
 * @param {object} rgba data
 */
const fmtPxData = ({ r, g, b, a }) => {
  return `${nearestTenth(r)}-${nearestTenth(g)}-${nearestTenth(b)}`;
}

// Pixel data reads:
// left -> right, then top -> bottom
// so if a canvas ctx was height: 100, width: 200,
// then each row would be split up into 200 indices in
// the array before getting to the next row.
const computePaintedToFreq = () => {
  if (!pixelBuffer[0]) return;

  let yValue = 0;
  let xValue = 0;

  // Canvas data
  let scheduleAtTime = 0.2; // Add 20ms to when to play next
  let canvData = pixelBuffer[0].pxData;

  let nextAvailablePixel = 0;
  let tempFrequencyBuffer = [];
  let tempPxBuffer = [];
  let computedPxDataHash = {};
  /**
   * If we iterate through only a pixel at a time,
   * and only take a single column are 
   */
  for (let currentPixel = 0; currentPixel < canvData.length; currentPixel += 4) {

    // Move onto next pixel,
    // bcs we have hit a blank one
    if (
      canvData[currentPixel] === 0 &&
      canvData[currentPixel + 1] === 0 &&
      canvData[currentPixel + 2] === 0
    ) {
      continue;
    }

    // We know we hit a new pixel,
    // Otherwise we want to skip over
    // other pixel data
    // pixel is current a 4px x 4px block 
    if (nextAvailablePixel === 0) {
      nextAvailablePixel = 12;
    } else {
      nextAvailablePixel -= 4;
      continue;
    }

    // Dividing by 4 gets number of actual pixels,
    // diving by another 4 gets the number of 4px x 4px chunks
    yValue = (currentPixel / 4) / 4;
    xValue = currentPixel % 4; // value will always be zero; Needed?

    let pxData = compPx(canvData, currentPixel);
    let pxDataHashKey = fmtPxData(pxData);


    // Start simple and only compute the leftmost pixel
    // value
    if (xValue % 4 === 0) {
      // Will keep from writing to the same key
      // a bunch of times
      if (!computedPxDataHash[pxDataHashKey]) {
        // This top one is what we'll end up sending
        computedPxDataHash[fmtPxData(pxData)] = 700 - yValue;
        // tempFrequencyBuffer.push(yValue);
        // tempPxBuffer.push(compPx(canvData, currentPixel));
      } else {
        // console.log('Skipped...', fmtPxData(pxData));
      }
    }
  }

  // Get the average accross the sampled
  // frequencies, in order to have a consistent frequency to play

  // if (tempFrequencyBuffer.length >= 4) {
  //   freqToPlay = tempFrequencyBuffer.reduce((avgAcc, currFreq) => {
  //     return avgAcc + currFreq;
  //   }, 0) / tempFrequencyBuffer.length;

  //   frequencyDataBuffer.push({
  //     freqToPlay: 700 - freqToPlay,
  //     scheduleAtTime,
  //   });
  // }

  Object.entries(computedPxDataHash).forEach(([color, freq]) => {
    // If the color doesn't exists, don't but it in the buffer
    if (sampleBufferHash[color]) {
      sampleBufferHash[color].push(freq);
    }
  })

  tempFrequencyBuffer.splice(0, tempFrequencyBuffer.length); // Clears it out, just to be sure
}

// const sendFreqDataToCanvas = () => {
//   // self.postMessage({
//   //   action: 'UPDATE_OSCFREQ',
//   //   payload: frequencyDataBuffer[0]
//   // })
// }

const sendComputedFreqData = () => {
  // console.log(sampleBufferHash);
  self.postMessage({
    action: 'UPDATE_OSCFRQ',
    payload: {
      [sinKey]: sampleBufferHash[sinKey][0],
      [triKey]: sampleBufferHash[triKey][0],
      [squKey]: sampleBufferHash[squKey][0],
      [sawKey]: sampleBufferHash[sawKey][0]
    }
  })

  // Mutates each array, getting rid of first
  // element
  sampleBufferHash[sinKey].shift()
  sampleBufferHash[triKey].shift()
  sampleBufferHash[squKey].shift()
  sampleBufferHash[sawKey].shift()
}


let test = false;
const computeFrequencyData = () => {

  // These functions grab data from the
  // global variables.
  computePaintedToFreq();
  sendComputedFreqData();


  // if (frequencyDataBuffer.length > 0) {
  //   sendFreqDataToCanvas();
  //   frequencyDataBuffer.splice(0, 1);
  // } else {
  //   // Send a mute signal
  // }

  if (pixelBuffer.length > 0) {
    // Remove data that has been sent
    pixelBuffer.splice(0, 1); // Better perf than unshift
  } else {
    // Do nothing
  }

  // console.log('sampleBufferHash: ', sampleBufferHash);
  currentAudioClockTime += samplingFreq;
  timeOuts[1] = self.setTimeout(computeFrequencyData, samplingFreq);
}


self.onmessage = function ({ data }) {
  /**
   * 3 options for action:
   *  1. INIT_WORKER
   *  2. START_WORKER
   *  3. STOP_WORKER
   * 
   * Part of the data will contain the 'initialized' audio scheduler data,
   * which will funnel data back up to the UI layer;
   */
  const { action, payload } = data;
  switch (action) {
    case 'GET_CANVAS':
      getCanvasData();
      break;
    case 'RESP_CANVAS':
      // Payload will be a Uint8Array buffer
      pushSampledDataToBuffer(payload);
      break;
    case 'UPDATE_SAMPFREQ':
      // Sets the sampling frequency to an
      // interval that is short enough to produce a coherent
      // result. Default is  (1 / 4410) * 1000 = .22 seconds
      samplingFreq = (1 / payload.newSamplingFreq) * 1000;
      console.log('New Sampling Freq', samplingFreq);
      break;
    case 'INIT_WORKER':
      canvasHeight = payload.canvasHeight;
      canvasWidth = payload.canvasWidth;
      samplingBufferLookahead = payload.samplingBufferLookahead;
      samplingSliceWidth = payload.samplingSliceWidth;
      samplingFreq = (1 / payload.samplingFreq) * 1000;
      initialized = true;
      break;
    case 'START_WORKER':
      if (!initialized) {
        throw new Error('Cannot start a scheduler which is not initialized');
      }
      // Start scheduling cycle
      getCanvasData()
      initialized = true;
      self.setTimeout(computeFrequencyData, samplingFreq);
      break;
    case 'STOP_WORKER':
      if (!initialized) {
        throw new Error('Cannot stop a non-existent scheduler');
      }
      timeOuts.forEach(timeoutId => {
        if(timeoutId) {
          self.clearTimeout(timeoutId);
        }
      })
      // Reset the buffers
      sampleBufferHash = {
        [sinKey]: [], // sine blue
        [triKey]: [], // triangle green
        [squKey]: [], // square red
        [sawKey]: [] // saw purple
      }
      // initialized = false;
      break;
    default:
      console.log('Invalid message:', data);
      return;
  }
}
