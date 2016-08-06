
function SoundEngine(){
	return {
		context: {},
		// Create a bufferSource object to store the audio data
		source: {},
		request: new XMLHttpRequest(),
		audioGain: null,
		init: function(mp3, callback){
			this.context = new webkitAudioContext();
			this.source = this.context.createBufferSource();
			var self = this;
			
			// Create an XHR object to fetch the sound-file from the server
			//this.request = new XMLHttpRequest();
			// Make an EventListener to handle the sound-file after it has been loaded
			this.request.addEventListener( 'load', function( e ){
				// Beginning decoding the audio data from loaded sound-file ...
				
				self.context.decodeAudioData( self.request.response, function( decoded_data ){ 
						
						// Store the decoded buffer data in the source object
						self.source.buffer = decoded_data; 

			 			self.audioGain = self.context.createGain();
    				self.audioGain.gain.value = 1;
    				self.audioGain.connect(self.context.destination);

						// Connect the source node to the Web Audio destination node
						self.source.connect( self.audioGain ); 
						// Add an EventListener to fire a function every time a key is pressed
						
						/* Init tiny metronome */
						/* This regulates the playback queuing of individual segments */
						self.initMetronome();
						
						/* Init big metronome */
						/* This regulates the queuing of bars, structures  */
						/*self.bigMetronome.init(self);
						self.bigMetronome.start();*/
						


						callback();  
					// Handle any decoding errors
					}, function( e ){ console.log( e ); } 
				// End of decode handler
				); 
				// End of Event Listener
			}, false );

			this.request.onerror = function(e) {
                console.log("error",e)
            }

			// Point the request to the sound-file that you want to play
			this.request.open( 'GET', mp3, true );
			// Set the XHR response-type to 'arraybuffer' to store binary data
			this.request.responseType = "arraybuffer";
			// Begin requesting the sound-file from the server
			this.request.send();

			
		},
		bufferQueue: [], // only necessary to keep track of what to stop

		play: function (seg){
			var self = this;
			//console.log("play", seg);
			//when, start, duration, callback_onended, gain, layer
			// Create a new BufferSource
			var newSource = this.context.createBufferSource();

			// Copy the buffer data from the loaded sound
			newSource.buffer = this.source.buffer;
			// Connect the new source to the new destination

			var gainNode = this.context.createGain();
			gainNode.gain.value = seg.gain
			newSource.connect(gainNode)
			gainNode.connect( this.context.destination );
			seg.gainNode = gainNode
			newSource.gainNode = gainNode;	
	
			//newSource.beginTime = seg.when + this.context.currentTime;
			newSource.layer = seg.layer;
			//	console.log(layer, newSource.layer);

			//console.log(seg.when, this.context.currentTime)
			if(seg.when < this.context.currentTime){
				// this segment was scheduled to play in the past
				// scootch start time up + duration accordingly
				var diff = this.context.currentTime - seg.when;
				//console.log(diff)
				if(seg.duration - diff > 0){
					//console.log("start", this.context.currentTime, seg.start+diff, seg.duration - diff)
					newSource.start(this.context.currentTime, seg.start + diff, seg.duration - diff);
				}else{
					// wait, it would have been done by now
					// don't play it
				}
			}else{

				//console.log("start", seg.when, seg.start, seg.duration)
				newSource.start( seg.when, seg.start, seg.duration);
			}
			//newSource.onended = callback_onended;

			/*if(seg.callback_onended != null){
				newSource.onended = function(){
					if(this.context.currentTime >= this.beginTime){
						callback_onended(seg.segment_id, song);
					}
				}
			}*/

			//console.log("newSource", newSource);
			newSource.onended = function(){
				console.log("end");
				for(bq in self.bufferQueue){
					//console.log(bq)
					if(self.bufferQueue[bq] == this){
						//console.log("not yet spliced", self.bufferQueue.length)
						self.bufferQueue = self.bufferQueue.splice(bq,1); // first element removed
						//console.log("spliced", self.bufferQueue.length)
						return;
					}
				}
			}
			
			self.bufferQueue.push(newSource)
		},

		/*
		playFinal: function(when,start,duration,callback){
			// Create a new BufferSource
			newSource = this.context.createBufferSource();
			// Copy the buffer data from the loaded sound
			newSource.buffer = this.source.buffer;
			// Connect the new source to the new destination
			newSource.connect( this.context.destination );
			// Play the sound immediately
			newSource.onended = callback
			
			newSource.start( when + this.context.currentTime, start, duration );

			this.playQueue.push(newSource)
			
		},*/

		stopAll: function(w){
			console.log("stopAll")
			var bq = this.bufferQueue;
			//console.log(bq);
			for(var b=0;b< bq.length;b++){
					//console.log(b, bq[b]);
					try{
						bq[b].gainNode.gain.value=0;
						bq[b].stop(w);
					}catch(err){
						// 
					}
			}
			this.bufferQueue = []
			this.audioGain.gain.value = 0 // temporary hack for stop 
			var sq = this.segmentQueue;
			//console.log(bq);
			for(var s=0;s< sq.length;s++){
					//console.log(s, sq[s]);
					try{
						sq[s].gainNode.gain.value=0;
						sq[s].stop(w);
					}catch(err){
						// 
					}
			}
			this.segmentQueue = []

		},

		timerWorker: null,
		interval: 50,
		windowLength: 1.000, // How far ahead to schedule audio (sec)

		initMetronome: function(){
			console.log("metronome init")
			this.timerWorker = new Worker("metronomeworker.js");
			var self = this;
			this.timerWorker.onmessage = function(e) {
		        if (e.data == "tick") {
		            //console.log("tick!");
		            self.segmentScheduler();
		        }else{
		            console.log("message: " + e.data);
		        }
			};
			this.setTimerInterval(this.interval);
			this.startMetronome();
		},
		startMetronome: function(){
			console.log("metronome start")
			if(this.timerWorker!==null){
				this.timerWorker.postMessage("start")
			}
		},
		stopMetronome: function(){
			console.log("Metronome stop")
			if(this.timerWorker!==null){
				this.timerWorker.postMessage("stop")
			}
		},
		setTimerInterval: function(){
			if(this.timerWorker!==null){
			    this.timerWorker.postMessage({"interval": this.interval});
			}
		},
		stop: function(){
			// end
			//this.stopMetronome();
			this.stopAll(0);
			this.context.suspend()
		},
		pause: function(){
			this.context.suspend()
		},
		unpause: function(){
			this.context.resume()
		},


    segmentQueue : [], //// segments that have been put into the queue,
                      // and may or may not have played yet. {when, start, duration, segment_id, callback_onended, gain, layer}

    queueSegment: function(seg){
    	//console.log("queue", seg, this)
    	this.segmentQueue.push(seg);
    },

		segmentScheduler: function(){
		//console.log("scheduler", this.segmentQueue);
		//console.log(this.bufferQueue)

		    // while there are segments that will need to play before the next interval, 
		    // schedule them and advance the pointer.
		    while((this.segmentQueue.length > 0) 
		    	&& (this.segmentQueue[0].when < this.context.currentTime + this.windowLength)){
		    	//console.log(this.segmentQueue[0]);
		    	this.play(this.segmentQueue.shift());
		    }
		},

	}
};

	




  