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

function createProgressBar() {
	let progress = document.createElement("progress")
	progress.max = 100
	return progress
}


async function _uploadFile(file, start, end, setFileProgress) {
	//XMLHttpRequest upload. Fetch does not support progress, and does not handle readablestreams in a manner that would allow for it.
	return await new Promise((resolve, reject) => {
		let request = new XMLHttpRequest();
		request.open('POST', url + "upload");

		request.setRequestHeader("qial-filename", file.name);
		request.setRequestHeader("qial-password", passwordInput.value);

		if (start !== 0 || end !== file.size) {
			request.setRequestHeader("qial-action", "append");
		}

		request.upload.addEventListener('progress', function(e) {
			let total_loaded = start + e.loaded
			let total_percent = total_loaded / file.size * 100
			setFileProgress(total_percent, total_loaded)
		});

		request.onerror = function(e) {
			uploadResults.innerHTML += "Error: " + e.message + "<br>"
		}

		request.addEventListener('load', function(e) {
			if (request.status !== 200) {
				uploadResults.innerHTML += "Error Status Received: " + request.status + "<br>"
				uploadResults.innerHTML += "Message: " + request.response + "<br>"
			}
			resolve(request.status);
		});
		request.send(file.slice(start, end));
	})
}

async function uploadFile(file, {filenumber, setProgress}) {
	//Split into chunks
	let chunkSize = 5e6
	let currentPos = 0
	let totalChunks = 0

	let progress = createProgressBar()
	uploadResults.appendChild(progress)
	let label = document.createElement("label")
	uploadResults.appendChild(label)
	uploadResults.appendChild(document.createElement("br"))

	function setFileProgress(percentage, bytesLoaded) {
		setProgress(filenumber + percentage/100)
		progress.value = percentage
		label.innerHTML = `Uploading ${file.name} - ${Math.round(percentage*10)/10}% (${numberPrettyBytesSI(bytesLoaded, 2)} of ${numberPrettyBytesSI(file.size, 2)})`
	}

	while (currentPos < file.size) {
		let currentEnd = currentPos + chunkSize
		currentEnd = Math.min(currentEnd, file.size)

		let status = await _uploadFile(file, currentPos, currentEnd, setFileProgress)
		if (status !== 200) {
			let p = document.createElement("p")
			p.innerHTML = "Status " + status + " is not 200. Aborting upload of remaining chunks. " //TODO: Retry.
			uploadResults.appendChild(p)
			break;
		}
		currentPos = currentEnd
	}
}


async function uploadFiles(files) {
	//Clear the current progress history.
	uploadResults.innerHTML = ""

	//Begin uploading... We'll do this one file at once for now.
	let progress = createProgressBar()
	uploadResults.appendChild(progress)
	let label = document.createElement("label")
	uploadResults.appendChild(label)
	uploadResults.appendChild(document.createElement("br"))

	//TODO: Weight files by size.
	function setProgress(fileIndex) {
		label.innerHTML = `Uploading File ${Math.min(Math.floor(fileIndex+1), files.length)} of ${files.length}...`
		progress.value = fileIndex*100/files.length
	}

	for (let i=0;i<files.length;i++) {
		try {
			let file = files[i]
			setProgress(i)
			let response = await uploadFile(file, {
				filenumber: i,
				setProgress
			})
		}
		catch(e) {
			console.error(e)
		}
	}
}

let uploadButton = document.getElementById("upload")
uploadButton.addEventListener("click", function() {
	if (currentFilesReady.length === 0) {return alert("You need to select some files to upload. ")}
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
