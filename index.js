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


async function uploadFile(file, append = false, filename = file.name, startPercentage = 0, percentageMultiple = 1) {
	console.log(startPercentage, percentageMultiple)
	//We will split large files into 5MB chunks.
	let chunkSize = 5e6
	if (file.size > chunkSize) {
		let currentPos = 0

		while (currentPos < file.size) {
			let currentEnd = currentPos + chunkSize
			currentEnd = Math.min(currentEnd, file.size)
			uploadResults.innerHTML += `Uploading Next File Chunk...<br>`
			let status = await uploadFile(file.slice(currentPos, currentEnd), true, file.name, currentPos/file.size*100, (currentEnd-currentPos)/file.size)
			console.log(status)
			if (status !== 200) {
				uploadResults.innerHTML += "Status " + status + " is not 200. Aborting upload of remaining chunks. " //TODO: Retry.
				break;
			}
			currentPos = currentEnd
		}
	}
	else {
		console.log(file)
		//XMLHttpRequest upload. Fetch does not support progress, and does not handle readablestreams in a manner that would allow for it.
		return await new Promise((resolve, reject) => {
			let start = Date.now()
			let request = new XMLHttpRequest();
			request.open('POST', url + "upload");

			request.setRequestHeader("qial-filename", filename);
			request.setRequestHeader("qial-password", passwordInput.value);

			if (append) {
				request.setRequestHeader("qial-action", "append");
			}

			// upload progress event
			request.upload.addEventListener('progress', function(e) {
				// upload progress as percentage
				let upload_percentage = (e.loaded / e.total)*100; //Percentage of THIS upload.
				let percent_completed = startPercentage + upload_percentage * percentageMultiple //Percentage of TOTAL upload.
				uploadResults.innerHTML += `Upload is ${Math.round(percent_completed*10)/10}% complete (${Date.now() - start}ms - ${numberPrettyBytesSI(Math.round(file.size * 0.01 * percent_completed), 2)} of ${numberPrettyBytesSI(file.size, 2)})<br>`
			});

			request.onerror = function(e) {
				uploadResults.innerHTML += "Error: " + e.message + "<br>"
			}

			request.addEventListener('load', function(e) {
				uploadResults.innerHTML += "Request finished with status " + request.status + "<br>"
				uploadResults.innerHTML += "Request finished with message " + request.response + "<br>"
				resolve(request.status);
			});
			request.send(file);
		})
	}
}


async function uploadFiles(files) {
	//Begin uploading... We'll do this one file at once for now.
	for (let i=0;i<files.length;i++) {
		try {
			let file = files[i]
			uploadResults.innerHTML += `Uploading ${file.name} (${i+1} of ${files.length} - ${numberPrettyBytesSI(file.size, 2)})...<br>`
			let response = await uploadFile(file)
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
