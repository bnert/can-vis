/**
 * Web Worker for computing data sent by the canvas
 */


/**
 * 
 * @param schedulerSettings => paramters for scheduling audio nodes to play
 * 
 * @return ISchedulerReturn => function that takes in 
 */
const soundScheduler = (schedulerSettings) => {
  const {
    canvasCtx,
    canvasWidth,
    canvasHeight,
    samplingSliceWidth,
    samplingFreq,
    // pollFn
  } = schedulerSettings;

  // This will be the number of times we find pixels
  // in the canvas in order to play sounds
  let currentSliceStart = 0;
  const numOfSlices = canvasWidth / samplingSliceWidth;

  const currentSampleLocation = () => {
    // Let Top Width Height
    return [currentSliceStart % canvasWidth, 0, samplingSliceWidth, canvasHeight];
  }

  console.log('slices possible:', numOfSlices);

  /**
   * Shorthand for getting pixel values
   * @param {*} pxArray 
   * @param {*} i 
   */
  const compPx = (pxArray, i) => ({ 
    r: pxArray[i],
    g: pxArray[i + 1],
    b: pxArray[i + 2],
    a: pxArray[i + 3]
  })


  let timeoutId = -1;
  /**
   * Function for taking in 
   */
  const schedule = () => {
    const [l, t, w, h] = currentSampleLocation();
    // const canvData = canvasCtx.getImageData(l, t, w, h).data;

    let canvData = self.postMessage({ 
      action: 'GET_CANVAS'
    });

    // let pixelBuffer = [];
    // let rowCounter = 0;
    // let rowBounds = w * 4; // ex. 0..39 = 0th row
    // let colCounter = 0;

    // // Pixel data reads:
    // // left -> right, then top -> bottom
    // // so if a canvas ctx was height: 100, width: 200,
    // // then each row would be split up into 200 indices in
    // // the array before getting to the next row.
    // for(let i = 0; i < canvData.length; i += 4) {
    //   if( i >= rowBounds ){
    //     rowBounds += (w * 4);
    //     rowCounter += 1;
    //   }
    //   // Need to have this at the end, in order not to have a wrapping column number

    //   colCounter = (i / 4) % (w);
    //   // Skip bcs blank line
    //   if(canvData[i] === 0) {
    //     continue;
    //   }

    //   pixelBuffer.push({
    //     x: colCounter,
    //     y: rowCounter,
    //     px: compPx(canvData, i)
    //   })
    // }
    // // pollFn([ currentSliceStart ]);
    // console.log('Current Slice', currentSliceStart);
    // currentSliceStart += samplingSliceWidth;
    
    timeoutId = self.setTimeout(schedule, ( 1 / samplingFreq ) * 1000 );
  }

  return {
    start: () => {
      console.log('Sampling at this may ms:', ( 1 / samplingFreq ) * 1000 );
      /**
       * What we want to do is:
       *  1. Get canvas data
       *  2. For duration of time, compute pixels in the buffer
       *  3. Send out computed values
       *  4. Re-schedule
       */
      schedule();
    },
    stop: () => {
      console.log('Cancelling timeout', timeoutId);
      timeoutId !== -1 ?
        self.clearTimeout(timeoutId):
        console.log("Timeout id negative");
    }
  }
}

// Psuedo code for operations
/*

1. Because of the nature of workers, we need to break the 
  scheduler up into bits which `postMessage` can interact with.

  They will look like:

    getCanvasData
    computeFrequencyData
    sendFrequencyData

*/





// It isn't usually the best to have global variables,
// however, in this context, we do need to asign out some
// globals in order to check 

// Housekeeping
let initialized = false;
let audioScheduer = null;

// Audio buffer
let audioBuffer = [];
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
    payload: null
  });
  self.setTimeout(getCanvasData, samplingFreq + samplingBufferLookahead);
}

const pushSampledDataToBuffer = (payload) => {
  // console.log("PAYLOAD", payload);
  const data = {
    time: payload.currentTime,
    pxData: new Uint8Array(payload.buf)
  };
  audioBuffer.push(data);
  // console.log("Pushed:", data)
}

const computeFrequencyData = () => {
  console.log("Computing");
  if(Math.floor(currentAudioClockTime) % 100000 === 0 ) {
    console.log('Current Buffer', audioBuffer);
  }
  // Do compute stuff then remove head of queue
  audioBuffer.splice(0, 1); // Better perf than unshift
  currentAudioClockTime += samplingFreq;
  self.setTimeout(computeFrequencyData, samplingFreq + (samplingBufferLookahead * 2));
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
        self.setTimeout(getCanvasData, samplingFreq + samplingBufferLookahead)
      break;
    case 'RESP_CANVAS':
        // Payload will be a Uint8Array buffer
        pushSampledDataToBuffer(payload);
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