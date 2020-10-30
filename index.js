let url = "node/"
if (window.location.host.startsWith("127.0.0.1")) {
	url = "http://" + window.location.hostname + ":3000/"
}

let uploadMenu = document.getElementById("uploadMenu")
let toggleUpload = document.getElementById("toggleUpload")
uploadMenu.style.display = "none"
toggleUpload.addEventListener("click", function() {
	if (uploadMenu.style.display === "none") {
		uploadMenu.style.display = "block"
		toggleUpload.innerHTML = "Close Upload Menu"
	}
	else {
		uploadMenu.style.display = "none"
		toggleUpload.innerHTML = "Open Upload Menu"
	}
})

let passwordInput = document.getElementById("password")
let togglePassword = document.getElementById("togglepassword")
togglePassword.addEventListener("click", function() {
	if (passwordInput.type === "password") {
		passwordInput.type = "text"
		togglePassword.innerHTML = "Hide Password"
	}
	else {
		passwordInput.type = "password"
		togglePassword.innerHTML = "Show Password"
	}
})


//https://stackoverflow.com/a/62703368/10965456
function numberPrettyBytesSI(Num=0, dec=2){
if (Num<1000) return Num+" Bytes";
Num =("0".repeat((Num+="").length*2%3)+Num).match(/.{3}/g);
return Number(Num[0])+"."+Num[1].substring(0,dec)+" "+"  kMGTPEZY"[Num.length]+"B";
}

let uploadResults = document.getElementById("uploadResults")
let currentFilesReady = [];
async function uploadFiles(files) {
	//Begin uploading... We'll do this one at once.
	for (let i=0;i<files.length;i++) {
		try {
			let file = files[i]
			uploadResults.innerHTML += `Uploading ${file.name} (${i+1} of ${files.length} - ${numberPrettyBytesSI(file.size, 2)})...<br>`

			//Fetch implementation of uploads.
			/*let request = fetch(url + "upload", {
				method: "POST",
				body: file,
				headers: {
					"qial-password": passwordInput.value,
					"qial-filename": file.name
				}
			})
			request = await request
			let response = await request.text() */


			//This was a test to do upload progress.
			//It requires enabling expiramental web platform features in chrome 85&86
			//The idea was to have a readable stream upload, and measure data transferred with pull calls.
			//It looks, however, like it doesn't call pull, instead only calling start.
			/*
			let currentPosition = 0;
			let reader = new FileReader()
			console.log(file)

			function obtainNextSplit() {
				let distance = file.size - currentPosition
				console.log(distance)
				if (distance <= 0) {null} //Nothing left
				if (distance > 60000) {distance = 60000} //Arbitrary

				let minifile = file.slice(currentPosition, currentPosition+distance)
				currentPosition += distance
				return new Promise((resolve, reject) => {
					reader.onload = function() {
						console.log(minifile)
						resolve(reader.result)
					}
					reader.readAsArrayBuffer(minifile)
				})
			}

			let readablestream = new ReadableStream({
				async start(controller) {
					console.log("Called")
					let buff = await obtainNextSplit()
					if (buff === null) {controller.close("Empty")}
					else {
						console.log(buff)
						controller.enqueue(buff)
					}
				},
				async pull(controller) {
					console.log("Pulled")
					let buff = await obtainNextSplit()
					if (buff === null) {controller.close("Empty")}
					else {
						console.log(buff)
						controller.enqueue(buff)
					}
				},
				async close(reason) {
					console.log(reason)
				}
			})

			console.log(readablestream)

			let request = fetch(url + "upload", {
				method: "POST",
				body: readablestream,
				headers: {
					"qial-password": passwordInput.value,
					"qial-filename": file.name
				},
				allowHTTP1ForStreamingUpload: true,
			})
			request = await request
			let response = await request.text()*/


			//XMLHttpRequest upload
			let response = await new Promise((resolve, reject) => {
				let start = Date.now()
				let request = new XMLHttpRequest();
				request.open('POST', url + "upload");

				request.setRequestHeader("qial-filename", file.name);
				request.setRequestHeader("qial-password", passwordInput.value);

				// upload progress event
				request.upload.addEventListener('progress', function(e) {
					// upload progress as percentage
					let percent_completed = (e.loaded / e.total)*100;
					console.log(percent_completed);
					uploadResults.innerHTML += `Upload is ${Math.round(percent_completed*10)/10}% complete (${Date.now() - start}ms - ${numberPrettyBytesSI(Math.round(file.size * 0.01 * percent_completed), 2)} of ${numberPrettyBytesSI(file.size, 2)})<br>`
				});

				// request finished event
				request.addEventListener('load', function(e) {
					// HTTP status message (200, 404 etc)
					console.log(request.status);
					// request.response holds response from the server
					resolve(request.response);
				});
				// send POST request to server
				request.send(file);
			})

			uploadResults.innerHTML += `${response}<br>`
		}
		catch(e) {
			console.error(e)
		}
	}
}

let uploadButton = document.getElementById("upload")
uploadButton.addEventListener("click", function() {
	uploadFiles(currentFilesReady)
})
function newFiles(files) {
	currentFilesReady = files
	uploadButton.innerHTML = "Upload " + files.length + " Files"
}


//Handle File Input Button
document.getElementById("fileinput").addEventListener("change", function(){
	newFiles(this.files)
})

//File Drag and Drop
let droparea = document.getElementById('filedrop')

;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  droparea.addEventListener(eventName, preventDefaults, false)
})

function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

;['dragenter', 'dragover'].forEach(eventName => {
  droparea.addEventListener(eventName, highlight, false)
})

;['dragleave', 'drop'].forEach(eventName => {
  droparea.addEventListener(eventName, unhighlight, false)
})

function highlight(e) {
  droparea.classList.add('highlight')
}

function unhighlight(e) {
  droparea.classList.remove('highlight')
}

droparea.addEventListener('drop', filedropped, false)

function filedropped(e) {
  let dt = e.dataTransfer
  let files = dt.files

  newFiles(files)
}
