URL = window.URL || window.webkitURL;

var gumStream;
var rec;
var input;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext;

var recStartTime;
var realRecStartTime;
var recStopTime;
var cliStartTime;
var recLength;
var metroBeatAbsTime = [];
var metroTimeArray;
var predictTimeArray;
var latency;
var testStartTime;
var outputLatency;
var baseLatency;
var interval_global;

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

function startRecording() {
  cliStartTime = Date.now();
    
    var constraints = { audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        }, 
                        video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	recordButton.disabled = true;
	stopButton.disabled = false;
	pauseButton.disabled = false

	navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		audioContext = new AudioContext();

    // audioContext.sampleRate = 44100;

		document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		gumStream = stream;
		
		input = audioContext.createMediaStreamSource(stream);
		rec = new Recorder(input,{numChannels:1, bufferLen:2048})

		//start the recording process
    rec.record();

		console.log("Recording started");
    recStartTime = Date.now();
    console.log('time@rec.record():', recStartTime);
    baseLatency = audioContext.baseLatency * 1000
    console.log('baseLatency', baseLatency);
	}).catch(function(err) {
    	recordButton.disabled = false;
    	stopButton.disabled = true;
    	pauseButton.disabled = true
	});
}

function pauseRecording(){
	if (rec.recording){
		//pause
		rec.stop();
		pauseButton.innerHTML="Resume";
	}else{
		//resume
		rec.record()
		pauseButton.innerHTML="Pause";

	}
}

function stopRecording() {
	stopButton.disabled = true;
	recordButton.disabled = false;
	pauseButton.disabled = true;

	//reset button just in case the recording is stopped while paused
	pauseButton.innerHTML="Pause";
	
	//tell the recorder to stop the recording
	rec.stop();
  console.log("getOutputTimestamp():", audioContext.getOutputTimestamp());
  outputLatency = audioContext.outputLatency * 1000;
  console.log('outputLatency', outputLatency);
  console.log('currentTime(seconds)', audioContext.currentTime);

  recStopTime = Date.now();
  console.log('The absolute time of recording stop is:', recStopTime);

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createDownloadLink);
}

function addWavesurfer(url) {
// Define wavesurfer instance
  var wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#b0e0e6',
    progressColor: '#4798b3',
    backgroundColor: '#ebf4f5',
    scrollParent: true,
    mediaControls: true,
    normalize: true,
    plugins: [
      WaveSurfer.cursor.create({
          showTime: true,
          opacity: 1,
          customShowTimeStyle: {
            'background-color': '#000',
            color: '#fff',
            padding: '2px',
            'font-size': '10px'
        }
      })
    ],
  });

  wavesurfer.load(url);
  btnPlay.addEventListener('click', function () {
    wavesurfer.play();
  });
  btnPause.addEventListener('click', function () {
    wavesurfer.pause();
  });

  wavesurfer.on('ready', function () {
    recLength = Math.floor(wavesurfer.getDuration() * 1000);
    diff = recStopTime - recStartTime;
    testStartTime = recStopTime + (diff  - recLength) - recLength;
    realRecStartTime = recStopTime - recLength;
    latency = realRecStartTime - recStartTime;
    calcMetro();
  })

}

function calcMetro(){
  metroBeatAbsTime.splice(1, 0, metroBeatAbsTime[1] - (metroBeatAbsTime[2] - metroBeatAbsTime[1]));

  // Adjust to relative time value.
  var test_arrayMinus = metroBeatAbsTime.map(function(num){
  // If use local speaker, add 80ms
    return num - recStartTime + outputLatency + baseLatency - 0.5 * latency + 80;
  })
  // Remove negative value
  var rmv_neg = test_arrayMinus.filter(function(num){
    return num > 0;
  })

  metroTimeArray = rmv_neg.map(function(num){
    return num / 1000;
  })
}

function drawDiff(arr) {
  console.log("arr.length:",arr.length)
  arr = arr[0].map((_, colIndex) => arr.map(row => row[colIndex]));
  tmp = arr[0];
  arr[0] = arr[1];
  arr[1] = tmp;
  arr = arr[0].map((_, colIndex) => arr.map(row => row[colIndex]));
  var dom = document.getElementById('echarts-diff');
  var myChart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });  
  var option; 

  option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    title: {
      // left: 'center',
      text: 'Time Difference'
    },
    legend: {},
    tooltip: {},
    xAxis: {},
    yAxis: {},
    series: [
      {
        name: 'Time Difference',
        type: 'scatter',
        data: arr,
      }
    ]  
  };
  if (option && typeof option === 'object') {
    myChart.setOption(option);
  }
  
  window.addEventListener('resize', myChart.resize);

}

function drawGraph(metroTimeArray, predictTimeArray, fasterTime, slowerTime, rangelistFaster, rangelistSlower){
  function transArray(arr, fillNum){
    zero = new Array(arr.length).fill(fillNum);
    tmp = new Array(2);
    tmp[0] = arr;
    tmp[1] = zero;
  
    arrayForDraw = tmp[0].map(function(col, i){
      return tmp.map(function (row) {
        return row[i];
      })
    })
    return arrayForDraw;
  }

  metroTimeArrayDraw = transArray(metroTimeArray, 20);
  predictedTimesArrayDraw = transArray(predictTimeArray,15);
  fasterArrayDraw = transArray(fasterTime, 10);
  slowerArrayDraw = transArray(slowerTime, 5);

  var dom = document.getElementById('echarts-container');
  var myChart = echarts.init(dom, null, {
    renderer: 'canvas',
    useDirtyRect: false
  });  
  var option;
  
  option = {
    aria: {
      enabled: true,
      decal: {
        show: true
    }
    },
    title: {
      text: 'Analysis Result'
    },
    toolbox: {
      show: true,
      feature: {
        saveAsImage: {},
        dataView: {
          readOnly: false
        },
        dataZoom: {
          yAxisIndex: 'none',
        },
        restore:{},
      }
    },
    xAxis: {
      name: 'Time (second)',
      // minInterval: 0.5,
      nameLocation: 'center',
      nameTextStyle: {
        align: 'center',
        lineHeight: 56,
      },
      nameGap: 20,
      axisPointer: {
        snap: true,
        label: {
          show: true,
          formatter: function (params) {
            return (
              'Time: ' +
              params.value
            );
          }
        }
      }
    },
    yAxis: {
      show: false,
      axisPointer: {
        label: {
          show: false,
        }
      }
    },
    tooltip: {
      show: true,
      trigger: 'none',
      axisPointer: {
        type: 'cross',
        // axis: 'x',
        // snap: true
      }
    },
    datazoom:[
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 1,
        end: 35
      },
      {
        type: 'slider',
        show: true,
        yAxisIndex: [0],
        left: '93%',
        start: 29,
        end: 36
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        start: 1,
        end: 35
      },
      {
        type: 'inside',
        yAxisIndex: [0],
        start: 29,
        end: 36
      }
    ],
    series: [
      {
        name: "metroTime",
        symbolSize: 5,
        data: metroTimeArrayDraw,
        type: 'scatter',
      },
      {
        name: "playTime",
        symbolSize: 5,
        data: predictedTimesArrayDraw,
        type: 'scatter',
      },
      {
        name: "fasterTime",
        symbolSize: 5,
        data: fasterArrayDraw,
        type: 'scatter',
        markArea: {
          itemStyle: {
            color: 'rgba(255, 173, 177, 0.4)'
          },
          data: 
            rangelistFaster,
        }
      },
      {
        name: "slowerTime",
        symbolSize: 5,
        data: slowerArrayDraw,
        type: 'scatter',
        markArea: {
          itemStyle: {
            color: 'rgba(60, 179, 113, 0.4)'
          },
          data: 
            rangelistSlower,
        }
      }
    ],
    legend: {
    },
    color:['Green', 'Blue', 'red', 'yellow'],
  };
    
  if (option && typeof option === 'object') {
    myChart.setOption(option);
  }
  
  window.addEventListener('resize', myChart.resize);
}

function createDownloadLink(blob) {
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extention)
	var filename = new Date().toISOString();

  addWavesurfer(url);

	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Analyse";
	upload.addEventListener("click", function(event){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
              var beat_times = document.getElementById("beatTimes");
              var predictTimeArray = e.target.responseText.replace(/\[|]/g, '' ).split(",");
              console.log("predictTimeArray:", predictTimeArray);

              const [metroArrayCom, predictArrayCom] = cutArrays (metroTimeArray, predictTimeArray);
              combinedTimeArrays = combineArrays(metroArrayCom, predictArrayCom);
              const [timeDiffArray, rmvIgnored] = calDiffArray(combinedTimeArrays, 0.01);
              const [fasterArray, slowerArray] = calFasterSlower(rmvIgnored);
              const [fasterTime, slowerTime, sortDiffFaster, sortDiffSlower] = createFasterSlower(timeDiffArray, predictArrayCom, 0.05);
              var com = sortDiffSlower.concat(sortDiffFaster);
              com = com.map(r => r.reduce((a,b) => [a, Number(b)]));
              if(com.length !== 0) {
                drawDiff(com);
              }
              rangelistFaster = createRangeList(sortDiffFaster);
              rangelistSlower = createRangeList(sortDiffSlower);
              drawGraph(metroArrayCom, predictArrayCom, fasterTime, slowerTime, rangelistFaster, rangelistSlower);
		      }else{
            upload.innerHTML = "Loading";
          }
		  };
		  var fd=new FormData();
		  fd.append("audio_data",blob, filename);
      console.log("Now the interval_global is:", interval_global);
      fd.append("setBPM", Math.floor(60 / interval_global));
		  xhr.open("POST","/v1/upload",true);
		  xhr.send(fd);
      
	})

	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(upload)//add the upload link to li

	//add the li element to the ol
	recordingsList.appendChild(li);
}

// Input: 2 arrays, Output: Index
// This fun is used to find the first align dot.
function findCombo (metroTimeArray, predictTimeArray){
  for (i = 0; i < metroTimeArray.length;i++) {
    let interval = 60000 / interval_global;
    left = metroTimeArray[i] - interval_global * 0.25;
    right = metroTimeArray[i] + interval_global * 0.25;
    for (j = 0; j < predictTimeArray.length;j++) {
      if ((predictTimeArray[j] > left) && (predictTimeArray[j] < right)) {
        console.log("i:", i);
        console.log('j:',j);
        return [i, j];
      }
    }
  }
}

// Build 2 new arrays
// This func is used to align two arrays.
function cutArrays (metroTimeArray, predictTimeArray) {
  const [metroIndexLeft, predictIndexLeft] = findCombo(metroTimeArray, predictTimeArray);
  // console.log("metroIndexLeft:", metroIndexLeft);
  // console.log("predictIndexLeft:", predictIndexLeft);
  metroArrayCom = metroTimeArray.slice(metroIndexLeft);
  // console.log("predictTimeArray[0] before slice:", predictTimeArray[0])
  predictArrayCom = predictTimeArray.slice(predictIndexLeft);
  // console.log("predictTimeArray[0] after slice:", predictTimeArray[0])
  // console.log("predictArrayCom[0] after slice:", predictArrayCom[0])
  a = metroArrayCom.length;
  b = predictArrayCom.length;
  console.log("predict-metro", b-a);

  if ( a !== b ) {
    if (a > b) {
      console.log("len of metroArrayCom before slice:", metroArrayCom.length);
      metroArrayCom = metroArrayCom.slice(0, b - a);
      console.log("len of metroArrayCom after slice:", metroArrayCom.length);
    } else {
      predictArrayCom = predictArrayCom.slice(0, a - b );
    }
  }
  return [metroArrayCom, predictArrayCom];
}

function combineArrays(metroArrayCom, predictArrayCom) {
    tmp = new Array(2);
    tmp[0] = metroArrayCom;
    tmp[1] = predictArrayCom;
  
    combinedTimeArrays = tmp[0].map(function(col, i){
      return tmp.map(function (row) {
        return row[i];
      })
    })

    return combinedTimeArrays;

}

function calDiffArray(combinedTimeArrays, thresIndex=0.125) {
  timeDiffArray = []

  for ( i = 0; i < combinedTimeArrays.length; i++) {
    timeDiffArray[i] = combinedTimeArrays[i][1] - combinedTimeArrays[i][0];
  }

  rmvIgnored = timeDiffArray.filter(function(num){
    return Math.abs(num) > thresIndex * interval_global;
  })
  // timeDiffArray is the difference of data with the same x-axis index.
  // rmvIgnored is used to filter unimportant data.
  return [timeDiffArray, rmvIgnored];
}

// This func is used to create two arrays for faster/slower data, index here is meaningless.
// The two arrays can be used in other calculation.
function calFasterSlower(rmvIgnored) {
  fasterArray = rmvIgnored.filter(function(num){
    return num < 0;
  })
  slowerArray = rmvIgnored.filter(function(num){
    return num > 0;
  })
  return [fasterArray, slowerArray];
}

function createFasterSlower(timeDiffArray, predictArrayCom, thresIndex=0.02) {
  fasterSlower = combineArrays(timeDiffArray, predictArrayCom);
  var thres = document.getElementById("thres");
  thres.innerHTML = (thresIndex * interval_global).toFixed(5) + " seconds, which is " + thresIndex * 100 + "% of the interval between two beats.";

  var fasterTime;
  var slowerTime;
  var sortDiffFaster;
  var sortDiffSlower; 
  rmvUnderThres = [];
  fasterArray = [];
  slowerArray = [];
  // rmv under threshold
  rmvUnderThres = fasterSlower.filter(function(item){
    return Math.abs(item[0]) > thresIndex * interval_global;
  })
  if (rmvUnderThres.length !== 0) {
    AccuRate = 1 - rmvUnderThres.length / timeDiffArray.length;
    // Num of good beats / Num of all beats
    var accRate = document.getElementById("accRate");
    accRate.innerHTML = AccuRate.toFixed(4) * 100 + '%';

    // Ave(The time length of diffs / Interval).
    diffRate = rmvUnderThres.map(item => {return item[0] / interval_global})
    sum = diffRate.reduce((previous, current) => current += previous);
    avg = sum / diffRate.length;
    console.log("avg diff:", avg);
  
    fasterArray = rmvUnderThres.filter(function(item){
      return item[0] < 0;
    });

    if (fasterArray.length !== 0) {
      fasterTime = fasterArray.map(item => {return item[1]});
      //avg fasterTime
      diffFaster = fasterArray.map(item => {return item[0] / interval_global});
      sumDiffFaster = - diffFaster.reduce((previous, current) => current += previous);
      avgDiffFaster = sumDiffFaster / diffFaster.length;
      sortDiffFaster = fasterArray.sort(function(x, y) {
        return x[0] - y[0];
      })
      // console.log("Faster: diff from short to long", sortDiffFaster);
    } else {
      fasterTime = [];
      sortDiffFaster = [];
    }

    slowerArray = rmvUnderThres.filter(function(item){
      return item[0] > 0;
    });
  
    if (slowerArray.length !== 0) {
      //avg slowerTime
      slowerTime = slowerArray.map(item => {return item[1]});
      diffSlower = slowerArray.map(item => {return item[0] / interval_global});
      sumDiffSlower = diffSlower.reduce((previous, current) => current += previous);
      avgDiffSlower = sumDiffSlower / diffSlower.length;
      sortDiffSlower = slowerArray.sort(function(x, y) {
        return y[0] - x[0];
      })
      // console.log("Slower: diff from long to short", sortDiffSlower);
    } else {
      slowerTime = [];
      sortDiffSlower = [];
    }
  } else {
    fasterTime = [];
    slowerTime = [];
    sortDiffFaster = [];
    sortDiffSlower = [];
    AccuRate = 1 - rmvUnderThres.length / timeDiffArray.length;
    var accRate = document.getElementById("accRate");
    accRate.innerHTML = AccuRate.toFixed(4) * 100 + '%. '+ 'Congratulations!'; 
  }
    return [fasterTime, slowerTime, sortDiffFaster, sortDiffSlower];
}

function createRangeList(sortDiff) {
  var rangelist = [];
  var tmp = [];

  if (sortDiff.length === 0) {
    return rangelist;
  }

  function makeTimeArray(sortDiff) {
    // For faster time array
    if (sortDiff[0][0] < 0 ) {
      tmp = sortDiff.map(r => r.reduce((a, b) => [Number(b), Number(b) - a]));
      return tmp;
    } else {
      tmp = sortDiff.map(r => r.reduce((a, b) => [Number(b) - a, Number(b)]));
       return tmp;
    }
  }

  tmp = makeTimeArray(sortDiff);
  if (sortDiff[0][0] < 0 ) {
    for (i = 0; i < tmp.length; i++) {
      rangelist.push([
        {
          name:'FASTER',
          xAxis: tmp[i][0],
        },
        {
          xAxis: tmp[i][1],
        }
    ])
    }
  } else {
    for (i = 0; i < tmp.length; i++) {
      rangelist.push([
        {
          name:'SLOWER',
          xAxis: tmp[i][0],
        },
        {
          xAxis: tmp[i][1],
        }
    ])
    }
  }

  return rangelist;

}
