URL = window.URL || window.webkitURL;

var gumStream;
var rec;
var input;
var audioContext;

var metroBeatAbsTime = [];
var interval_global;

var absRecStartTime;
var absRecBufTimeArray = [];
var absRecLastBuffer;
var relTimerArray = [];
var predictedRecTimeArray = [];
var startClickTime;

var constraints = { audio: {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  }, 
  video:false };

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);

function startRecording() {
  startClickTime = Date.now();
  console.log("Upon click start recording: ", startClickTime);

	recordButton.disabled = true;
	stopButton.disabled = false;
	pauseButton.disabled = false

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
    audioContext = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
    document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz";
    gumStream = stream;
    input = audioContext.createMediaStreamSource(stream);

    rec = new Recorder(input,{numChannels:1, bufferLen:512});
    rec.record();
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

	absRecBufTimeArray = rec.stop();
    absRecStartTime = absRecBufTimeArray[0];
    absRecLastBuffer = absRecBufTimeArray[absRecBufTimeArray.length - 1];
    var absRecStopTime = absRecLastBuffer + (absRecLastBuffer - absRecBufTimeArray[absRecBufTimeArray.length - 2]);
    // Calibration algo based on experience
    var estimatedRecLength = absRecStopTime - absRecStartTime;
    console.log("estimatedRecLength", estimatedRecLength);
    console.log("absRecStartTime: ", absRecStartTime);
    console.log('absRecLastBuffer: ', absRecLastBuffer);

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createDownloadLink);
}

function handleArray(relTimerArray, predictedRecTimeArray){

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

    function cutArrays (metroTimeArray, predictTimeArray) {
      const [metroIndexLeft, predictIndexLeft] = findCombo(metroTimeArray, predictTimeArray);
      metroArrayCom = metroTimeArray.slice(metroIndexLeft);
      predictArrayCom = predictTimeArray.slice(predictIndexLeft);
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

    // Combine 2 arrays, example: a = [1, 2, 3], b = [4, 5, 6], return [[1, 4], [2, 5], [3, 6]]
    function combineArrays(array1, array2) {
        var tmp = new Array(2);
        tmp[0] = array1;
        tmp[1] = array2;
      
        var combinedTimeArrays = tmp[0].map(function(col, i){
          return tmp.map(function (row) {
            return row[i];
          })
        })
        return combinedTimeArrays;
    }

    function createArrayDiff(array, thresIndex=0.125) {
        var arrayDiff = [];
      
        for ( i = 0; i < array.length; i++) {
          arrayDiff[i] = array[i][1] - array[i][0];
        }

        // Only keep values that over threshold.
        var rmvIgnored = arrayDiff.filter(function(num){
          return Math.abs(num) > thresIndex * interval_global;
        });
        return [arrayDiff, rmvIgnored];
    }

    function createFasterSlower(arrayDiff, predictedRecTimeArray, thresIndex=0.02) {
        var fasterSlower = combineArrays(arrayDiff, predictedRecTimeArray);

        // Print threshold.
        var thres = document.getElementById("thres");
        thres.innerHTML = (thresIndex * interval_global).toFixed(5) + " seconds, which is " + thresIndex * 100 + "% of the interval between two beats.";
      
        var fasterTime;
        var slowerTime;
        var sortDiffFaster;
        var sortDiffSlower; 
        rmvUnderThres = [];
        var fasterArray = [];
        var slowerArray = [];

        // rmv values under threshold
        rmvUnderThres = fasterSlower.filter(function(item){
          return Math.abs(item[0]) > thresIndex * interval_global;
        })

        if (rmvUnderThres.length !== 0) {
            var accuRateValue = 1 - rmvUnderThres.length / arrayDiff.length;
            // Num of good beats / Num of all beats
            var accRate = document.getElementById("accRate");
            accRate.innerHTML = ( accuRateValue * 100 ).toFixed(1)  + '%';
        
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
          accuRateValue = 1 - rmvUnderThres.length / arrayDiff.length;
          var accRate = document.getElementById("accRate");
          accRate.innerHTML = ( accuRateValue * 100 ).toFixed(1) + '%. '+ 'Congratulations!'; 
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

    [relTimerArray, predictedRecTimeArray] = cutArrays (relTimerArray, predictedRecTimeArray);

    var combinedTimeArrays = combineArrays(relTimerArray, predictedRecTimeArray);

    const [arrayDiff, rmvIgnored] = createArrayDiff(combinedTimeArrays, 0.05);

    // const [fasterArray, slowerArray] = calFasterSlower(rmvIgnored);
    
    const [fasterTime, slowerTime, sortDiffFaster, sortDiffSlower] = createFasterSlower(arrayDiff, predictedRecTimeArray, 0.05);

    var comp = sortDiffSlower.concat(sortDiffFaster);
    comp = comp.map(r => r.reduce((a,b) => [a, Number(b)]));
    if(comp.length !== 0) {
        drawDiff(comp);
    } else {
        console.log("Com array is empty");
    };

    rangelistFaster = createRangeList(sortDiffFaster);
    rangelistSlower = createRangeList(sortDiffSlower);

    drawGraph(relTimerArray, predictedRecTimeArray, fasterTime, slowerTime, rangelistFaster, rangelistSlower);
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
                // var beat_times = document.getElementById("beatTimes");
                predictedRecTimeArray = e.target.responseText.replace(/\[|]/g, '' ).split(",");
                console.log("predictedRecTimeArray: ", predictedRecTimeArray);
                handleArray(relTimerArray, predictedRecTimeArray);
		    } else {
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

function addWavesurfer(url) {

    function createRelTimerArray(metroBeatAbsTime){
      
      var lastElement = Math.floor(metroBeatAbsTime[metroBeatAbsTime.length - 1]);
      console.log("last element: ", lastElement);
      console.log('Diff between click and buf start: ', absRecStartTime - startClickTime);

      var calibration = absRecLastBuffer - lastElement;
      console.log('calibration:', calibration);

      relTimerArray = metroBeatAbsTime.map(function(num){
        return (num - startClickTime) / 1000;
      });
      
      // Remove negative value, so that tick sound before the recorder start will not be used in future calculation.
      var relTimerArray = relTimerArray.filter(function(num){
        return num > 0;
      });

      var relTimerArray = relTimerArray.filter(function(num){
        return num < wavesurfer.getDuration();
      })

      relTimerArray = relTimerArray.map((value, index) => {
        // if ( index !== 0) {
          return value + ( absRecStartTime - startClickTime) / 1000;
        // } else {
        //   return value;
        // }
      });

      console.log('relTimerArray: ', relTimerArray);
      return relTimerArray;
    }

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
    console.log(`Recording length from wavesurfer.js: ${Math.floor(wavesurfer.getDuration() * 1000)}`);
    relTimerArray = createRelTimerArray(metroBeatAbsTime);
  })

}

function drawGraph(relTimerArray, predictedRecTimeArray, fasterTime, slowerTime, rangelistFaster, rangelistSlower){
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
  
    var realTimerArrayDraw = transArray(relTimerArray, 20);
    predictedTimesArrayDraw = transArray(predictedRecTimeArray,15);
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
          data: realTimerArrayDraw,
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
              color: 'rgba(255, 62, 165, 0.4)'
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
              color: 'rgba(100, 32, 170, 0.4)'
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

