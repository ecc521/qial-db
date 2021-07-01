let uploadMenuDiv = document.getElementById("uploadMenu")
let uploadButton = document.getElementById("upload")
let fileInput = document.getElementById("fileinput")
let droparea = document.getElementById('filedrop')
let uploadResults = document.getElementById("uploadResults")

uploadMenuDiv.remove()

let uploadMenu = new window.Overlay()

let toggleUpload = document.getElementById("toggleUpload")
toggleUpload.addEventListener("click", function() {
	function hide() {
		uploadMenu.hide()
		toggleUpload.innerHTML = "Open Upload Menu"
	}
	if (uploadMenu.hidden === true) {
		uploadMenu.show(uploadMenuDiv, hide)
		toggleUpload.innerHTML = "Close Upload Menu"
	}
	else {
		hide()
	}
})


//https://stackoverflow.com/a/62703368/10965456
window.numberPrettyBytesSI = function numberPrettyBytesSI(Num=0, dec=2){
if (Num<1000) return Num+" Bytes";
Num =("0".repeat((Num+="").length*2%3)+Num).match(/.{3}/g);
return Number(Num[0])+"."+Num[1].substring(0,dec)+" "+"  kMGTPEZY"[Num.length]+"B";
}

let currentFilesReady = [];

function createProgressBar() {
	let progress = document.createElement("progress")
	progress.max = 100
	return progress
}


async function _uploadFile(file, start, end, setFileProgress, last) {
	//XMLHttpRequest upload. Fetch does not support progress, and does not handle readablestreams in a manner that would allow for it.
	return await new Promise((resolve, reject) => {
		let request = new XMLHttpRequest();
		request.open('POST', "upload");

		request.setRequestHeader("qial-filename", file.name);

		if (start === 0) {
			request.setRequestHeader("qial-action", "create");
		}
		else {
			request.setRequestHeader("qial-action", "append");
		}

		if (last) {
			request.setRequestHeader("qial-last", "last");
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
	let br = document.createElement("br")
	uploadResults.appendChild(br)

	function setFileProgress(percentage, bytesLoaded) {
		setProgress(filenumber, percentage)
		progress.value = percentage
		label.innerHTML = `Uploading ${file.name} - ${Math.round(percentage*10)/10}% (${numberPrettyBytesSI(bytesLoaded, 2)} of ${numberPrettyBytesSI(file.size, 2)})`
	}

	while (currentPos < file.size) {
		let currentEnd = currentPos + chunkSize
		currentEnd = Math.min(currentEnd, file.size)

		let complete = false
		if (currentEnd === file.size) {
			complete = true
		}

		let status = await _uploadFile(file, currentPos, currentEnd, setFileProgress, complete)
		if (status !== 200) {
			let p = document.createElement("p")
			p.innerHTML = "Status " + status + " is not 200. Aborting upload of remaining chunks. " //TODO: Retry.
			uploadResults.insertBefore(p, br.nextElementSibling)
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

	//This isn't ideal with paralell uploads, but it works OK.
	function setProgress(filenumber, percentage = 0) {
		console.log(filenumber, percentage, files.length)
		label.innerHTML = `Uploading File ${filenumber + 1} of ${files.length}...`
		progress.value = (filenumber + percentage/100)/files.length * 100
	}

	let i = 0
	let maxConcurrent = 2
	let originalConcurrent = maxConcurrent

	async function startNext() {
		let filenumber = i++
		let file = files[filenumber]

		if (!file) {
			if (maxConcurrent === originalConcurrent) {
				let elem = document.createElement("p")
				elem.innerHTML = "All Uploads Completed"
				uploadResults.appendChild(elem)
			}
			return
		}

		maxConcurrent--
		try {
			setProgress(filenumber)
			let response = await uploadFile(file, {
				filenumber,
				setProgress
			})
		}
		catch(e) {
			console.error(e)
		}
		finally {
			maxConcurrent++
			startNext()
		}
	}

	//let scope bounds to loop, so the higher scope i is safe.
	for (let i=0;i<maxConcurrent;i++) {
		startNext()
	}
}

uploadButton.addEventListener("click", function() {
	if (currentFilesReady.length === 0) {return alert("You need to select some files to upload. ")}
	uploadFiles(currentFilesReady)
})
function newFiles(files) {
	currentFilesReady = files
	uploadButton.innerHTML = "Upload " + files.length + " Files"
}


//Handle File Input Button
fileInput.addEventListener("change", function(){
	newFiles(this.files)
})

//File Drag and Drop
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
