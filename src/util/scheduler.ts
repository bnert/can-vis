import { timeout } from "q";

let canWidth = 700;
let freq = 250; // ms/sampling rate
let bandOffset = 10; // 10 px sampling bandOffset
let currBand = 0;
let bandLimit = canWidth / bandOffset;


// // (700 / 10) => 70 slices throughout canvas
// // ()

// let currOffset = currBand  

// function sampleData(){
//   const currentSampleBand = currBand % bandLimit;
//   console.log('Current Sample Band:', currentSampleBand);
  
//   // Left, top, width, height
//   let ctxData = document.getElementById('can-vis').getContext('2d').getImageData(currentSampleBand, 0, bandOffset, 500);
//   console.log('Sampled (', currentSampleBand, 0, bandOffset, 500, ')');
//   console.log(ctxData);
//   currBand += bandOffset;
// }

// function schedule() {
//   sampleData();
//   // setTimeout(schedule, freq)
// }

// schedule();

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
  samplingFreq?: number;
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
    audioCtx,
    canvasCtx,
    canvasWidth,
    canvasHeight,
    samplingSliceWidth,
    samplingFreq
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


  let timeoutId = -1;
  const schedule = () => {
    const [l, t, w, h] = currentSampleLocation();
    const canvData = canvasCtx.getImageData(l, t, w, h).data;
    let pixelBuffer = [];

    let rowCounter = 0;
    let rowBounds = samplingSliceWidth * 4 - 1; // ex. 0..39 = 0th row
    let colCounter = 0;
    for(let i = 0; i < canvData.length; i += 4) {
      if( i > rowBounds ){
        rowBounds += 40;
        rowCounter++;
      }
      colCounter = i % 10;
      // Skip bcs blank line
      if(canvData[i] === 0) {
        continue;
      }
      console.log(i, '-> row, col: ', rowCounter, colCounter);
      console.log('bounds>>>>>>', rowBounds);
      

      pixelBuffer.push({
        pixelNumber: {
          row: rowCounter,
          col: colCounter,
        },
        pixelData: [
          canvData[i],
          canvData[i + 1],
          canvData[i + 2],
          canvData[i + 3],
        ]
      })
    }
    currentSliceStart += samplingSliceWidth;
    console.log('PIXEL BUFFER @', l);
    console.log(currentSampleLocation());
    console.log(pixelBuffer);
    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'); 
    timeoutId = window.setTimeout(schedule, 500);
  }

  return {
    start: () => {
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