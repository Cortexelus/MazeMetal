
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
     //  "../song_data/"+ data["mp3"];
  }
}

/*** initially load sections ***/

firepadRef.child("songs/"+song_name+"/sections").on("value", function(snapshot) {
    // INITIALLY LOAD SECTIONS
});