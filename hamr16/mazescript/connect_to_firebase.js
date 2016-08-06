// Initialize the Firebase SDK
firebase.initializeApp({
  apiKey: 'AIzaSyDDUehISMGjOYIgyjWjkTbzzwiR4Jm6QRU',
  authDomain: "mazemetal-1a93c.firebaseapp.com",
  databaseURL: "https://mazemetal-1a93c.firebaseio.com",
  storageBucket: "mazemetal-1a93c.appspot.com",
});

var firepadRef = firebase.database().ref();

function updateSectionsOnFirebase(song_name, sections){
		firepadRef.child("songs/"+song_name+"/sections").set(sections);
}

firepadRef.child("songs/"+song_name+"/sections").on("value", function(snapshot) {
   updateSectionList(snapshot.val()); 
});