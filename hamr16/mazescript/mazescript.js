
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
        sound.init(data["mp3"],function(){
            console.log("Mp3 loaded");
                //everythingLoaded();
            everythingLoaded();
            sound.pause()
        });
    }
}


function everythingLoaded(){
    $("#button_play").show();
}

firepadRef.child("songs/"+song_name+"/sections").on("value", function(snapshot) {
    updateSectionList(snapshot.val());
});

var _sections = {};
function updateSectionList(sections){
    console.log(sections);
    _sections = sections;
    
    /*
    var section_html = "<ul>";
    for(s in sections){
        section_html += "<li><b>"+s+":</b> {start: " + sections[s]["start"] + ", duration: "+ sections[s]["duration"] + "}</li>";
    };
    section_html += "</ul>";*/
    
    var section_names = []
    for(s in sections){
        section_names.push(s);
    }
    var section_html = "<div>"+(section_names.join(", "))+"</div>";

    $("#section-list").html(section_html);

}


var stopped=true;
function updateSoundState(state){
	if(state=="resume" || state=="play"){
        if(stopped){
            stopped = false;
        
            var d = data;
            // get firebase
            var script = codeMirror.getValue();
            
            d["sections"] = _sections;
            d["machine"] = parseMazeScript(script);
            console.log(d);
            if(validate(d)){
                main(d);
                sound.unpause();
            }else{

            }
        }else{
            sound.unpause()
        }
    }else if(state=="stop"){
        sound.stop();
        stopped = true
    }else if(state=="pause"){
        sound.pause();
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

