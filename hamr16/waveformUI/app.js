/**
 * Create a WaveSurfer instance.
 */
var wavesurfer = Object.create(WaveSurfer);
var context = new AudioContext()
/**
 * Init & load.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Init wavesurfer
    wavesurfer.init({
        container: '#waveform',
        audioContext: context,
        height: 100,
        pixelRatio: 1,
        audioRate: 1,
        scrollParent: true,
        normalize: true,
        minimap: true,
    });


    /*** LOAD MP3 on LOAD **/
    
    var oReq = new XMLHttpRequest();
    oReq.onload = reqListener;
    oReq.open("get", "../song_data/" + song_name + ".json", true);
    oReq.send();
    function reqListener(e) {
    	response = this.responseText
      data = JSON.parse(formatToJSON(response));
      if(data["mp3"]){
         // load mp3
         wavesurfer.load("../song_data/"+ data["mp3"]);
      }
    }
    /* Regions */
    wavesurfer.enableDragSelection({
        color: randomColor(0.1)
    });

    wavesurfer.on('ready', function () {
        /*
        if (localStorage.regions) {
            loadRegions(JSON.parse(localStorage.regions));
            
        } else {
            // loadRegions(
            //     extractRegions(
            //         wavesurfer.backend.getPeaks(512),
            //         wavesurfer.getDuration()
            //     )
            // );
            wavesurfer.util.ajax({
                responseType: 'json',
                url: 'annotations.json'
            }).on('success', function (data) {
                loadRegions(data);
                saveRegions();
            });
        }*/
        /*** initially load sections ***/

        firepadRef.child("songs/"+song_name+"/sections").on("value", function(snapshot) {
            // INITIALLY LOAD SECTIONS
            var annotations = [];
            var d = snapshot.val();
            for(var region in d){
            	annotations.push({
            		"start": parseFloat(d[region]["start"]),
            		"end": parseFloat(d[region]["start"]) + parseFloat(d[region]["duration"]),
            		"data": {},
            		"attributes": {
            			"label": region,
            			"highlight": false
            		}
            	})
            }
            console.log(annotations);
            loadRegions(annotations);
            saveRegions();
        });
    });
    wavesurfer.on('region-click', function (region, e) {
        e.stopPropagation();
        $("#label").focus();
        // Play on click, loop on shift click
        e.shiftKey ? region.playLoop() : region.play();
    });
    wavesurfer.on('region-click', editAnnotation);
    wavesurfer.on('region-updated', saveRegions);
    wavesurfer.on('region-removed', saveRegions);
    wavesurfer.on('region-in', showNote);

    wavesurfer.on('region-play', function (region) {
        region.once('out', function () {
            wavesurfer.play(region.start);
            wavesurfer.pause();
        });
    });

    /* Zoom */
document.querySelector('#slider').onchange = function () {
    wavesurfer.zoom(Number(this.value));
    console.log(this.value)
};
    /* Minimap plugin */
    wavesurfer.initMinimap({
        height: 30,
        waveColor: '#ddd',
        progressColor: '#999',
        cursorColor: '#999'
    });


    /* Timeline plugin */
    wavesurfer.on('ready', function () {
        var tempo, beats;
        var timeline = Object.create(WaveSurfer.Timeline);
        timeline.init({
            wavesurfer: wavesurfer,
            container: "#wave-timeline"
        });
        wavesurfer.backend.source.buffer.extract = function(target, numFrames, position) {
            var l = wavesurfer.backend.source.buffer.getChannelData(0),
                r = wavesurfer.backend.source.buffer.getChannelData(1);
            var length = l.length;
            for (var i = 0; i < numFrames; i++) {
                target[i * 2] = l[i + position];
                target[i * 2 + 1] = r[i + position];
            }
            return Math.min(numFrames, l.length - position);
        };
        tempo, beats = getBPM(wavesurfer.backend.source.buffer);
        document.getElementById("tempo_value").innerHTML = parseInt(tempo)+"bpm";
    });


    /* Toggle play/pause buttons. */
    var playButton = document.querySelector('#play');
    var pauseButton = document.querySelector('#pause');
    wavesurfer.on('play', function () {
        playButton.style.display = 'none';
        pauseButton.style.display = '';
    });
    wavesurfer.on('pause', function () {
        playButton.style.display = '';
        pauseButton.style.display = 'none';
    });
});

/**
 * Save annotations to localStorage.
 */
function saveRegions() {
    localStorage.regions = JSON.stringify(
        Object.keys(wavesurfer.regions.list).map(function (id) {
            var region = wavesurfer.regions.list[id];
            return {
                start: region.start,
                end: region.end,
                attributes: region.attributes,
                data: region.data
            };
        })
    );
}


/**
 * Load regions from localStorage.
 */
function loadRegions(regions) {
    regions.forEach(function (region) {
        region.color = randomColor(0.1);
        wavesurfer.addRegion(region);
    });
}


/**
 * Extract regions separated by silence.
 */
function extractRegions(peaks, duration) {
    // Silence params
    var minValue = 0.0015;
    var minSeconds = 0.25;

    var length = peaks.length;
    var coef = duration / length;
    var minLen = minSeconds / coef;

    // Gather silence indeces
    var silences = [];
    Array.prototype.forEach.call(peaks, function (val, index) {
        if (Math.abs(val) <= minValue) {
            silences.push(index);
        }
    });

    // Cluster silence values
    var clusters = [];
    silences.forEach(function (val, index) {
        if (clusters.length && val == silences[index - 1] + 1) {
            clusters[clusters.length - 1].push(val);
        } else {
            clusters.push([ val ]);
        }
    });

    // Filter silence clusters by minimum length
    var fClusters = clusters.filter(function (cluster) {
        return cluster.length >= minLen;
    });

    // Create regions on the edges of silences
    var regions = fClusters.map(function (cluster, index) {
        var next = fClusters[index + 1];
        return {
            start: cluster[cluster.length - 1],
            end: (next ? next[0] : length - 1)
        };
    });

    // Add an initial region if the audio doesn't start with silence
    var firstCluster = fClusters[0];
    if (firstCluster && firstCluster[0] !== 0) {
        regions.unshift({
            start: 0,
            end: firstCluster[firstCluster.length - 1]
        });
    }

    // Filter regions by minimum length
    var fRegions = regions.filter(function (reg) {
        return reg.end - reg.start >= minLen;
    });

    // Return time-based regions
    return fRegions.map(function (reg) {
        return {
            start: Math.round(reg.start * coef * 10) / 10,
            end: Math.round(reg.end * coef * 10) / 10
        };
    });
}


/**
 * Random RGBA color.
 */
function randomColor(alpha) {
    return 'rgba(' + [
        ~~(Math.random() * 255),
        ~~(Math.random() * 255),
        ~~(Math.random() * 255),
        alpha || 1
    ] + ')';

}


/**
 * Edit annotation for a region.
 */
function editAnnotation (region) {
    var form = document.forms.edit;
    form.style.opacity = 1;
    form.elements.start.value = Math.round(region.start * 10) / 10,
    form.elements.end.value = Math.round(region.end * 10) / 10;
    form.elements.label.value = region.attributes.label || '';
    form.onsubmit = function (e) {
        e.preventDefault();
        console.log(region);
        region.update({
            start: form.elements.start.value,
            end: form.elements.end.value,
            attributes: {
                label: form.elements.label.value
            }
        });
        GLOBAL_ACTIONS["export"]();
        form.style.opacity = 0;
    };
    form.onreset = function () {
        form.style.opacity = 0;
        form.dataset.region = null;
    };
    form.dataset.region = region.id;
    GLOBAL_ACTIONS["export"]();
}


/**
 * Display annotation.
 */
function showNote (region) {
    if (!showNote.el) {
        showNote.el = document.querySelector('#subtitle');
    }
    showNote.el.textContent = region.data.note || '–';
}

/**
 * Bind controls.
 */
GLOBAL_ACTIONS['delete-region'] = function () {
    var form = document.forms.edit;
    var regionId = form.dataset.region;
    if (regionId) {
        wavesurfer.regions.list[regionId].remove();
        form.reset();
    }
};



// Drag'n'drop
document.addEventListener('DOMContentLoaded', function () {
    var toggleActive = function (e, toggle) {
        e.stopPropagation();
        e.preventDefault();
        toggle ? e.target.classList.add('wavesurfer-dragover') :
            e.target.classList.remove('wavesurfer-dragover');
    };

    var handlers = {
        // Drop event
        drop: function (e) {
            toggleActive(e, false);
            $( "#lightbox" ).popup( "close" );
            GLOBAL_ACTIONS["pause"]();
            // Load the file into wavesurfer
            if (e.dataTransfer.files.length) {
                wavesurfer.loadBlob(e.dataTransfer.files[0]);
            } else {
                wavesurfer.fireEvent('error', 'Not a file');
            }
        },

        // Drag-over event
        dragover: function (e) {
            toggleActive(e, true);
        },

        // Drag-leave event
        dragleave: function (e) {
            toggleActive(e, false);
        }
    };

    var dropTarget = document.querySelector('#drop');
    Object.keys(handlers).forEach(function (event) {
        dropTarget.addEventListener(event, handlers[event]);
    });
});