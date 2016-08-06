var GLOBAL_ACTIONS = {
    'play': function () {
        wavesurfer.playPause();
    },

    'back': function () {
        wavesurfer.skipBackward();
    },

    'forth': function () {
        wavesurfer.skipForward();
    },

    'toggle-mute': function () {
        wavesurfer.toggleMute();
    },
    'pause': function(){
        wavesurfer.pause();
    },
    'export': function () {
        /* window.open('data:application/json;charset=utf-8,' +
             encodeURIComponent(localStorage.regions));*/
        var sections = {};
        r = JSON.parse(localStorage.regions);
        //console.log(r);
        var i;
        for (i in r) { // loop through the regions
            var s = r[i];
            /* Example
             * {"start":1.1,"end":1.8,"attributes":{"label":"abc","highlight":true},"data":{}}
             */
            console.log(s);
            if (s.hasOwnProperty("attributes") && s["attributes"].hasOwnProperty("label")) {
                var label = s["attributes"]["label"];
                var start = parseFloat(s["start"]);
                var duration = parseFloat(s["end"]) - start;
                if (label && start && duration) {
                    sections[label] = {
                        "start": start,
                        "duration": duration
                    };
    
                }
            }
        }
        console.log("sections", sections, song_name);
        updateSectionsOnFirebase(song_name, sections);
    }
};


// Bind actions to buttons and keypresses
document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('keydown', function (e) {
        var map = {
            32: 'play',       // space
            37: 'back',       // left
            39: 'forth'       // right
        };
        var action = map[e.keyCode];
        if (action in GLOBAL_ACTIONS) {
            if (document == e.target || document.body == e.target) {
                e.preventDefault();
            }
            GLOBAL_ACTIONS[action](e);
        }
    });

    [].forEach.call(document.querySelectorAll('[data-action]'), function (el) {
        el.addEventListener('click', function (e) {
            var action = e.currentTarget.dataset.action;
            if (action in GLOBAL_ACTIONS) {
                e.preventDefault();
                GLOBAL_ACTIONS[action](e);
            }
        });
    });
});


// Misc
document.addEventListener('DOMContentLoaded', function () {
    // Web Audio not supported
    if (!window.AudioContext && !window.webkitAudioContext) {
        var demo = document.querySelector('#demo');
        if (demo) {
            demo.innerHTML = 'Your browser does not run the Web Audio API';
        }
    }
});
