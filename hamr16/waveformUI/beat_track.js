/*Identify Peaks
getPeaksAtThreshold:
  inputs:
    data = source buffer
    threshold = a float
  outputs:
    peaksArray = an array of sample indexes where peaks are found
*/
function getPeaksAtThreshold(data, threshold) {
  var peaksArray = [];
  var length = data.length;
  for (var i = 0; i < length;) {
    if (data[i] > threshold) {
      peaksArray.push(i);
      // Skip forward ~ 1/4s to get past this peak.
      i += 10000;
    }
    i++;
  }
  return peaksArray;
}


// Function used to return a histogram of peak intervals
function countIntervalsBetweenNearbyPeaks(peaks) {
  var intervalCounts = [];
  peaks.forEach(function(peak, index) {
    for (var i = 0; i < 10; i++) {
      var interval = peaks[index + i] - peak;
      var foundInterval = intervalCounts.some(function(intervalCount) {
        if (intervalCount.interval === interval)
          return intervalCount.count++;
      });
      if (!foundInterval) {
        intervalCounts.push({
          interval: interval,
          count: 1
        });
      }
    }
  });
  return intervalCounts;
}
// Function used to return a histogram of tempo candidates.
function groupNeighborsByTempo(intervalCounts, sampleRate) {
  var tempoCounts = [];
  intervalCounts.forEach(function(intervalCount, i) {
    if (intervalCount.interval !== 0) {
      // Convert an interval to tempo
      var theoreticalTempo = 60 / (intervalCount.interval / sampleRate);

      // Adjust the tempo to fit within the 90-180 BPM range
      while (theoreticalTempo < 90) theoreticalTempo *= 2;
      while (theoreticalTempo > 180) theoreticalTempo /= 2;

      theoreticalTempo = Math.round(theoreticalTempo);
      var foundTempo = tempoCounts.some(function(tempoCount) {
        if (tempoCount.tempo === theoreticalTempo)
          return tempoCount.count += intervalCount.count;
      });
      if (!foundTempo) {
        tempoCounts.push({
          tempo: theoreticalTempo,
          count: intervalCount.count
        });
      }
    }
  });
  return tempoCounts;
}

function getBPM(audio_buffer) {

  // Create offline context
  var offlineContext = new OfflineAudioContext(1, audio_buffer.length, audio_buffer.sampleRate);

  // Create buffer source
  var source = offlineContext.createBufferSource();
  source.buffer = audio_buffer;

  // Create filter
  var filter = offlineContext.createBiquadFilter();
  filter.type = "lowpass";

  // Pipe the song into the filter, and the filter into the offline context
  source.connect(filter);
  filter.connect(offlineContext.destination);

  // Schedule the song to start playing at time:0
  source.start(0);

  // Render the song
  offlineContext.startRendering();

  // Act on the result
  offlineContext.oncomplete = function(evt) {
    var peaks, intervals,
      initialThreshold = 0.9,
      threshold = initialThreshold,
      minThreshold = 0.3,
      minPeaks = 30,
      filtered_buffer = evt.renderedBuffer; // Filtered buffer!
    //peak detection function
    //var neighbors = groupNeighborsByTempo(number_of_intervals);
    //console.log (neighbors)
    do {
      peaks = getPeaksAtThreshold(filtered_buffer.getChannelData(0), threshold);
      threshold -= 0.05;
    } while (peaks.length < minPeaks && threshold >= minThreshold);
    //channel data extraction method, float
    intervals = countIntervalsBetweenNearbyPeaks(peaks);
    var groups = groupNeighborsByTempo(intervals, filtered_buffer.sampleRate);
    var top = groups.sort(function(intA, intB) {
      return intB.count - intA.count;
    }).splice(0, 5);
    console.log(top);
    //depends on code from stretcher.js
    bpm =  Number(top[0].tempo);
    return bpm, peaks;
  };
}