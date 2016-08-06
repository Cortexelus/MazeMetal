/* author CJ Carr
 * GPLv2 license
 * cortexel.us | github.com/cortexelus
*/

var supported_versions = ["mazemetal0.01"];
var nameValidator = /^[A-Za-z0-9_]+$/;


// execute the machine
// trust that the machine is valid
function main(data){
	var stack = [["main",0]];
	var next_time = 0;
	var address = stack[stack.length-1];
	var f_name, line, f;
	var termination_flag = false;
	while(true){
		address = stack[stack.length-1];
		f_name = address[0];
		line = address[1];
		f = data.machine[f_name];
		var cmd = f[line];
		console.log(stack.toString()	)
		console.log("> ", cmd);
		args = cmd.split(" ");

		// terminate 
		if(args[0]=="terminate"){
			break;
		}

		// label
		if(args[0]=="label"){
			// nothing needs to be done
		}

		// jump
		if(args[0]=="goto"){
			go_here = "";
			if(args.length == 2){
				// goto label_name
				go_here = args[1]
			}else{
				// goto A 0.4
				// goto X 0.5 Y 0.2 Z 0.1
				r = Math.random(); // number between 0 and 1
				prob_sum = 0; 
				for(var k=1; k<args.length-1;k+=2){
					// sum the probabilities as we go
					prob = parseFloat(args[k+1].replace(",",""));
					prob_sum += prob;
					// if sum is greater than r, this is our choice.
					if(prob_sum > r){
						// this is the chosen path
						go_here = args[k]
					}
				}
			}
			if(go_here){
				// find label
				for(c in f){
					_args = f[c].split(" ");
					if(_args[0] == "label" && _args[1] == go_here){
						// update the current stack address to this line
						address[1] = parseInt(c)
						break;
					}
				}
				console.log("jumped to " + go_here + ", " + c)
				continue;  // next command, please.
			}else{
				// no jump, continue on to next line.
			}
		}

		// subroutine
		if(args[0]=="f"){
			var f_name = args[1] 
  		stack.push([f_name,0]);  // that's all we have to do!
  		continue; 
		}

		// play 
		if(args[0]=="play"){
			var section_name = args[1]
  		sound.queueSegment({
  			when: next_time, 
  			start: parseFloat(data.sections[section_name].start), 
  			duration: parseFloat(data.sections[section_name].duration), 
  			callback_onended: null, gain: 1, layer: 0})
  		next_time += parseFloat(data.sections[section_name].duration)
		}

		// determine next address in the stack
		// 1. advance one line,
		// 2. check if line exists
		// 		- if not, pop the stack and return to old position in parent subroutine.
		// 3. repeat until we find a line that exists
		// 4. if stack is empty, terminate
		while(true){
			line += parseInt(1) // 1. advance one line in the subroutine
			if(f.length <= line){
				// 2. there are no more lines in the subroutine
				// subroutine has finished
				// remove it from stack
				stack.pop();
				if(stack.length==0){
					// stack is empty
					// main has finished
					// nothing more to do, terminate
					termination_flag = true;
					break;
				}else{
					// return to old position in parent subroutine
					address = stack[stack.length-1];
					f_name = address[0];
					f = data.machine[f_name];
					line = address[1];
					continue; 
					// 3. loop around, repeat until we find a line that exists
				}
			}else{
				// we found a line!
				address[1] = line // update stack with new line
				break; // leave the loop
			}
		}
		if(termination_flag) break;
	}

	console.log("done");
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

// return true if script is valid
// f is an array of commands (strings), 
// name is the name of that f
// section_names is an array of strings
// f_names is an array of all the f's names
// errors is passed in from validate. Push any errors to it. 
function validateScript(f, name, section_names, f_names, errors){
	// errors just for this one script
	var local_errors = []
	// commands that are supported
	var valid_commands = ["label","goto","play","f","terminate"]
	// a list of all the label within this scope
	var label_names = f.filter(function(x){
		return x.trim().indexOf("label")==0}) // grab just the commands that start with "label"
	.map(function(x){
		return x.split(" ")[1]}) // grab the word to the right of "label"
	.filter(function(x){
		return nameValidator.test(x); // remove any name that isn't alphanumeric_
	})
	// check for duplicate labels
	label_names = label_names.sort();
	var dups = [];
	for (var i = 0; i < label_names.length - 1; i++) {
    if (label_names[i + 1] == label_names[i]) {
        dups.push(label_names[i]);
    }
	}
	if(dups.length) local_errors.push("Duplicate labels in " + name + ": " + dups.join(", "))
 
	// go through each CMD
	for(var j=0;j<f.length;j++){
		var cmd = f[j];
		args = cmd.split(" ");
		where = " in " + name + " on line [" + j + "] " + cmd;
		if(valid_commands.indexOf(args[0])==-1){
			local_errors.push("Invalid command " + args[0] + where)
		}else{
			if(args[0]=="terminate"){	
				if(args.length>1) local_errors.push("Terminate doesn't take any  arguments " + where + ". A good example is \"terminate\"")
			}
			if(args[0]=="label"){	
				if(args.length<2) local_errors.push("Label has too few arguments " + where + ". A good example is \"label gkjhg\"")
				if(args.length>2) local_errors.push("Label has too many arguments " + where + ". A good example is \"label gkjhg\"")
				if(!nameValidator.test(args[1])) local_errors.push("Label name must be alphanumeric_ " + where )
				if(dups.indexOf(args[1])!=-1) local_errors.push("Label " + args[1] + " has a duplicate " + where)
			}
			if(args[0]=="play"){
				if(args.length<2) local_errors.push("Play has too few arguments " + where + ". A good example is \"play kjhgkjhg\"")
				if(args.length>2) local_errors.push("Play has too many arguments " + where + ". A good example is \"play kjhgkjhg\"")
				if(!nameValidator.test(args[1])) local_errors.push("Section name must be alphanumeric_ " + where )
				if(section_names.indexOf(args[1])==-1) local_errors.push("Section " + args[1] + " does not exist; error " + where)
			}
			if(args[0]=="f"){			
				if(args.length<2) local_errors.push("f has too few arguments " + where + ". A good example is \"f hgjhg\"")
				if(args.length>2) local_errors.push("f has too many arguments " + where + ". A good example is \"f fhgcvbn\"")
				if(!nameValidator.test(args[1])) local_errors.push("Subroutine name must be alphanumeric_ " + where )
				if(f_names.indexOf(args[1])==-1) local_errors.push("Subroutine " + args[1] + " does not exist; error " + where)
			}
			if(args[0]=="goto"){
				if(args.length==1) local_errors.push("goto has too few arguments " + where + ". A good example is \"goto A\"")
				if(args.length==2){
					if(!nameValidator.test(args[1])) local_errors.push("Label name must be alphanumeric_ " + where )
					if(label_names.indexOf(args[1])==-1) local_errors.push("Label " + args[1] + " does not exist; error " + where)
				}else if(args.length % 2 == 0){
					local_errors.push("goto has wrong number of arguments " + where + ". A good example is \"goto L1 0.5 L2 0.5\"");
				}else{
					// example cases:
					// goto label_name 0.3
					// goto A 0.1 B 0.15
					// goto X 0.6, Y 0.6, Z 0.6		
					var probs = 0.0	
					for(var k=1; k<args.length-1;k+=2){
						if(!nameValidator.test(args[k])) local_errors.push("Label name " + args[k] + " must be alphanumeric_ " + where )
						if(label_names.indexOf(args[k])==-1) local_errors.push("Label " + args[k] + " does not exist; error " + where)
						var prob = args[k+1].replace(",","")
						if(prob != parseFloat(prob)){
							local_errors.push("Jump probability " + prob + " is not a number; error " + where )
						}else{
							prob = parseFloat(prob);
							if(prob > 1.0){
								local_errors.push("Jump probability " + prob + " cannot be greater than 1; error " + where );
							}
							if(prob < 0.0){
								local_errors.push("Jump probability " + prob + " cannot be negative; error " + where );
							}
							probs += prob
						}
					}
					if(probs > 1.0){
						local_errors.push("Total jump probability " + probs + " cannot be greater than 1; error " + where );
					}
				}
			}
		}
	}
	errors.push.apply(errors, local_errors)
	return local_errors.length===0
}

// returns true if data is a valid mazemetal file
// returns false if any erors are thrown
// will mutate data
function validate(d){
	var errors = []
	if(!d.hasOwnProperty("title")) errors.push("Missing title")
	if(!d.hasOwnProperty("artist")) errors.push("Missing artist")
	if(!d.hasOwnProperty("total_length")) errors.push("Missing total_length")
	if(!d.hasOwnProperty("version")){
		errors.push("Missing vesion")
	}else{
		if(supported_versions.indexOf(d["version"])==-1){
			errors.push("Version " + d["version"] + " not supported");
		}
	}
	if(!d.hasOwnProperty("sections")){ 
		errors.push("Missing sections") 
	}else{
		section_names = Object.keys(d["sections"]);
		for(var i=0;i<section_names.length;i++){
			if(!nameValidator.test(section_names[i])) errors.push("Section name must be alphanumeric_ " + section_names[i]);
			section = d["sections"][section_names[i]];
			if(!section.hasOwnProperty("start")) errors.push("Missing start, section " + section_names[i]);
			if(!section.hasOwnProperty("duration")) errors.push("Missing duration, section " + section_names[i]);
		}
	}
	if(!d.hasOwnProperty("machine")){
		errors.push("Missing machine")
	}else{
		if(!d["machine"].hasOwnProperty("main")){
			errors.push("Missing main");
		}else{
			f_names = Object.keys(d["machine"]);
			for(var i=0;i<f_names.length;i++){
				if(!nameValidator.test(f_names[i])) errors.push("Subroutine name must be alphanumeric_ " + f_names[i]);
				f = d["machine"][f_names[i]];
				f = f.trim().toLowerCase();
				// mutates data, convert f string to array
				f = f.split("\n")
				f = f.map(function(x){return x.trim();}) 
				f = f.filter(function(x){ return x.length})
				validateScript(f, f_names[i], section_names, f_names, errors);
				d["machine"][f_names[i]] = f;
			}
		}
	}
	console.log(d);

	if(errors.length){
		console.error("ERRORS: " + errors.length);
		for(e in errors){
			console.error(errors[e]);
		}
		return false;
	}else{
		console.log("Looks good");
		return true;
	}
}