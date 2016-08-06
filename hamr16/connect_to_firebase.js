// Initialize the Firebase SDK
firebase.initializeApp({
  apiKey: 'AIzaSyDDUehISMGjOYIgyjWjkTbzzwiR4Jm6QRU',
  authDomain: "mazemetal-1a93c.firebaseapp.com",
  databaseURL: "https://mazemetal-1a93c.firebaseio.com",
  storageBucket: "mazemetal-1a93c.appspot.com",
});

var firepadRef = firebase.database().ref();


function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var song_name = getParameterByName("song");
function updateSectionsOnFirebase(song_name, sections){
		firepadRef.child("songs/"+song_name+"/sections").set(sections);
}



// Take in our special JSON file and convert it to valid JSON
// Our file allows comments and line breaks
function formatToJSON(s){
	// remove comments
	s = s.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//gi, "")

	// find everything inside of quotes
	s = s.replace(/\"((\\\")|[^\"]|[\r\n])*\"/gi, function(t){
		// replace line breaks with \n
		return t.replace(/\n/gi,"\\n")
	})

	// remove line breaks
	// s = s.replace(/\n/gi,"")
	// turn tabs into space
	s = s.replace(/\s+/gi," ")
	return s;

}
