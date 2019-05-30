import { timeout } from "q";

let canWidth = 700;
let freq = 250; // ms/sampling rate
let bandOffset = 10; // 10 px sampling bandOffset
let currBand = 0;
let bandLimit = canWidth / bandOffset;

function browserChecks() {
  if( !document || !window ) {
    return false;
  }
  return true;
}



interface IScheduler {
  audioCtx?: AudioContext;
  canvasCtx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  samplingSliceWidth: number;
  samplingFreq: number;
  pollFn(freqData: any[]): void;
}

interface ISchedulerReturn {
  (): void;
}

interface ISampleQueueAudioNode {
  audioNodeTargetID: string;
  freq: number;
}

/**
 * 
 * @param schedulerSettings => paramters for scheduling audio nodes to play
 * 
 * @return ISchedulerReturn => function that takes in 
 */
const soundScheduler = (
    schedulerSettings: IScheduler
  ) => {
  
  if(!browserChecks()) {
    throw new Error(`
      ContextError: The scheduler must have either DOM 'document' or 'window' available to run.
      Please check what context you are running this function.
    `);
  }
  
  const {
    canvasCtx,
    canvasWidth,
    canvasHeight,
    samplingSliceWidth,
    samplingFreq,
    pollFn
  } = schedulerSettings;

  // This will be the number of times we find pixels
  // in the canvas in order to play sounds
  let currentSliceStart = 0;
  const numOfSlices: number = canvasWidth / samplingSliceWidth;
  const sampleQueue: Array<any> = [];

  const currentSampleLocation = () => {
    // Let Top Width Height
    return [currentSliceStart % canvasWidth, 0, samplingSliceWidth, canvasHeight];
  }

  console.log('slices possible:', numOfSlices);

  const compPx = (pxArray: Uint8ClampedArray, i: number) => ({ 
    r: pxArray[i],
    g: pxArray[i + 1],
    b: pxArray[i + 2],
    a: pxArray[i + 3]
  })


  let timeoutId = -1;
  const schedule = () => {
    const [l, t, w, h] = currentSampleLocation();
    console.log('Polling Canvas Component...');
    const canvData = canvasCtx.getImageData(l, t, w, h).data;
    
    let pixelBuffer: Array<any> = [];

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
    currentSliceStart += samplingSliceWidth;
    // console.log('PIXEL BUFFER @', l);
    // console.log(currentSampleLocation());
    // console.log(pixelBuffer);
    // console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'); 
    
    // The 'time' being passed into the timeout, is
    // 1 / (sampling frequency in Hz) which is then multiplied by 1000
    // in order to convert milliseconds to seconds
    timeoutId = window.setTimeout(schedule, ( 1 / samplingFreq ) * 1000 );
  }

  return {
    start: () => {
      console.log('Sampling at this may ms:', ( 1 / samplingFreq ) * 1000 );
      schedule();
    },
    cancel: () => {
      console.log('Cancelling timeout', timeoutId);
      timeoutId !== -1 ?
        window.clearTimeout(timeoutId):
        console.log("Timeout id negative");
    }
  }
    
}

export default soundScheduler;