/**
 * Web Worker for computing data sent by the canvas
 */


function decideAction({ action }) {
  switch(action) {
    case 'START_SCHEDULER':
      
  }
}


/**
 * 
 * @param schedulerSettings => paramters for scheduling audio nodes to play
 * 
 * @return ISchedulerReturn => function that takes in 
 */
const soundScheduler = (
  schedulerSettings
) => {

// if(!browserChecks()) {
//   throw new Error(`
//     ContextError: The scheduler must have either DOM 'document' or 'window' available to run.
//     Please check what context you are running this function.
//   `);
// }

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

const compPx = (pxArray, i) => ({ 
  r: pxArray[i],
  g: pxArray[i + 1],
  b: pxArray[i + 2],
  a: pxArray[i + 3]
})


let timeoutId = -1;
const schedule = () => {
  const [l, t, w, h] = currentSampleLocation();
  const canvData = canvasCtx.getImageData(l, t, w, h).data;
  let pixelBuffer = [];

  let rowCounter = 0;
  let rowBounds = w * 4; // ex. 0..39 = 0th row
  let colCounter = 0;

  // Pixel data reads:
  // left -> right, then top -> bottom
  // so if a canvas ctx was height: 100, width: 200,
  // then each row would be split up into 200 indices in
  // the array before getting to the next row.
  for(let i = 0; i < canvData.length; i += 4) {
    if( i >= rowBounds ){
      rowBounds += (w * 4);
      rowCounter += 1;
    }
    // Need to have this at the end, in order not to have a wrapping column number

    colCounter = (i / 4) % (w);
    // Skip bcs blank line
    if(canvData[i] === 0) {
      continue;
    }

    pixelBuffer.push({
      x: colCounter,
      y: rowCounter,
      px: compPx(canvData, i)
    })
  }
  // pollFn([ currentSliceStart ]);
  console.log('Current Slice', currentSliceStart);
  currentSliceStart += samplingSliceWidth;
  // console.log('PIXEL BUFFER @', l);
  // console.log(currentSampleLocation());
  // console.log(pixelBuffer);
  // console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'); 
  
  // The 'time' being passed into the timeout, is
  // 1 / (sampling frequency in Hz) which is then multiplied by 1000
  // in order to convert milliseconds to seconds
  // timeoutId = window.setTimeout(schedule, ( 1 / samplingFreq ) * 1000 );
  timeoutId = self.setTimeout(schedule, ( 1 / samplingFreq ) * 1000 );
}

return {
  start: () => {
    console.log('Sampling at this may ms:', ( 1 / samplingFreq ) * 1000 );
    schedule();
  },
  stop: () => {
    console.log('Cancelling timeout', timeoutId);
    timeoutId !== -1 ?
      // window.clearTimeout(timeoutId):
      self.clearTimeout(timeoutId):
      console.log("Timeout id negative");
  }
}
  
}



// It isn't usually the best to have global variables,
// however, in this context, we do need to asign out some
// globals in order to check 
let initialized = false;
let audioScheduer = null;

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
    case 'INIT_WORKER':
      audioScheduer = soundScheduler(payload);
      initialized = true;
      break;
    case 'START_WORKER':
      if(!initialized) {
        throw new Error('Cannot start a scheduler which is not initialized');
      }
      audioScheduer.start();
      break;
    case 'STOP_WORKER':
      if(!initialized) {
        throw new Error('Cannot stop a non-existent scheduler');
      }
      audioScheduer.stop();
      initialized = false;
      break;
  }


}