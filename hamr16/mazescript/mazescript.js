
var sound = SoundEngine();
var data = null;
// Load the file containing all the maze info
var oReq = new XMLHttpRequest();
oReq.onload = reqListener;
oReq.open("get", "litanyofregrets.json", true);
oReq.send();
function reqListener(e) {
	response = this.responseText
    data = JSON.parse(formatToJSON(response));
    if(validate(data)){
    	console.log("Let's begin")
    	sound.init(data["mp3"],function(){
    		console.log("Mp3 loaded");
    		everythingLoaded();
    	});
    }
}

function everythingLoaded(){
    $("#button_play").show();
}

function updateSoundState(state){
	if(state=="play"){
        var d = data;
        // get firebase
        var script = codeMirror.getValue();
        getSectionsFromFirebase(song_name, function(sections){
            d["sections"] = sections;
            
            d["machine"] = parseMazeScript(script);
            console.log(d);
            if(validate(d)){
                main(d);
            }
        });
	}else{
        //sound.stop();
    }
}

function parseMazeScript(script){
    var machine = {}
    var lines = script.split("\n");
    var name = "";

    // split the lines
    for(l in lines){
        var line = lines[l].trim();
        // find all the lines that end in :
        if(line[line.length-1]==":"){
            // new subroutine definition
            name = line.substring(0,line.length-1);
            machine[name] = " ";
        }else if(name.length>0){
            machine[name] = "" + machine[name] + line + "\n";
        }
    }
    return machine
}

