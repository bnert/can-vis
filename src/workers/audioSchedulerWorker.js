/**
 * Web Worker for computing data sent by the canvas
 */
// It isn't usually the best to have global variables,
// however, in this context, we do need to asign out some
// globals in order to check 

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
    currentSliceStart = 0;
  }
  self.setTimeout(getCanvasData, samplingFreq);
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


// Pixel data reads:
// left -> right, then top -> bottom
// so if a canvas ctx was height: 100, width: 200,
// then each row would be split up into 200 indices in
// the array before getting to the next row.
const computePaintedToFreq = () => {
  if(!pixelBuffer[0]) return;

  let yValue = 0;
  let xValue = 0;

  // Canvas data
  let scheduleAtTime = pixelBuffer[0].time + 0.2; // Add 20ms to when to play next
  let canvData = pixelBuffer[0].pxData;
  
  let nextAvailablePixel = 0;
  let tempFrequencyBuffer = [];
  /**
   * If we iterate through only a pixel at a time,
   * and only take a single column are 
   */
  for(let currentPixel = 0; currentPixel < canvData.length; currentPixel += 4) {

    // Move onto next pixel,
    // bcs we have hit a blank one
    if(
        canvData[currentPixel] === 0 &&
        canvData[currentPixel + 1] === 0 &&
        canvData[currentPixel + 2] === 0
      ) {
      continue;
    }
    
    // We know we hit a new pixel,
    // Otherwise we want to skip over
    // other pixel data
    if(nextAvailablePixel === 0) {
      // console.log('Current Pixel', currentPixel);
      nextAvailablePixel = 12;
    } else {
      nextAvailablePixel -= 4;
      continue;
    }

    // Dividing by 4 gets number of actual pixels,
    // diving by another 4 gets the number of 4 x 4 chunks
    yValue = (currentPixel / 4) / 4;
    xValue = currentPixel % 4; // value will always be zero; Needed?

    // Start simple and only compute the leftmost pixel
    // value
    if(xValue % 4 === 0) {
      tempFrequencyBuffer.push(yValue);
    }
  }

  // Get the average accross the sampled
  // frequencies, in order to have a consistent frequency to play
  if(tempFrequencyBuffer.length >= 4) {
    freqToPlay = tempFrequencyBuffer.reduce((avgAcc, currFreq) => {
      return avgAcc + currFreq;
    }, 0) / tempFrequencyBuffer.length;

    frequencyDataBuffer.push({
      // x: xValue,
      // y: yValue,
      freqToPlay: 700 - freqToPlay,
      scheduleAtTime,
      // px: compPx(canvData, currentPixel)
    });
  }
}

const sendFreqDataToCanvas = () => {
  self.postMessage({
    action: 'UPDATE_OSCFREQ',
    payload: frequencyDataBuffer[0]
  })
}

let test = false;
const computeFrequencyData = () => {

  // These functions grab data from the
  // global variables.
  computePaintedToFreq();

  if(frequencyDataBuffer.length > 0) {
    sendFreqDataToCanvas();
    frequencyDataBuffer.splice(0, 1);
  } else {
    // Send a mute signal
  }

  if (pixelBuffer.length > 0) {
    // Remove data that has been sent
    pixelBuffer.splice(0, 1); // Better perf than unshift
  } else {
    // Do nothing
  }

  currentAudioClockTime += samplingFreq;
  self.setTimeout(computeFrequencyData, samplingFreq);
}


self.onmessage = function({ data }) {
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
  switch(action) {
    case 'GET_CANVAS':
        getCanvasData();
        // self.setTimeout(getCanvasData, samplingFreq + samplingBufferLookahead)
      break;
    case 'RESP_CANVAS':
        // Payload will be a Uint8Array buffer
        pushSampledDataToBuffer(payload);
      break;
    case 'UPDATE_SAMPFREQ':
      samplingFreq = ( 1 / payload.newSamplingFreq ) * 1000;
      console.log('New Sampling Freq', samplingFreq);
      break;
    case 'INIT_WORKER':
      // Want to initialize data upon creation of the
      // worker
      console.log("Initialized");
      canvasHeight = payload.canvasHeight;
      canvasWidth = payload.canvasWidth;
      samplingBufferLookahead = payload.samplingBufferLookahead;
      samplingSliceWidth = payload.samplingSliceWidth;
      samplingFreq = ( 1 / payload.samplingFreq ) * 1000;
      initialized = true;
      break;
    case 'START_WORKER':
      console.log('Starting scheduling', initialized);
      if(!initialized) {
        throw new Error('Cannot start a scheduler which is not initialized');
      }
      // Start scheduling cycle
      getCanvasData()
      self.setTimeout(computeFrequencyData, samplingFreq);
      break;
    case 'STOP_WORKER':
      if(!initialized) {
        throw new Error('Cannot stop a non-existent scheduler');
      }
      // audioScheduer.stop();
      initialized = false;
      break;
    default:
      console.log('Invalid message:', data);
      return;
  }
}