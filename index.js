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


let uploadResults = document.getElementById("uploadResults")
async function newFiles(files) {
	if (confirm("Upload " + files.length + " files? ")) {
		//Begin uploading... We'll do this one at once.
		for (let i=0;i<files.length;i++) {
			try {
				let file = files[i]
				uploadResults.innerHTML += `Uploading ${file.name} (${i+1} of ${files.length} - ${Math.ceil(file.size/1000)}KB)...<br>`

				let request = await fetch(url + "upload", {
					method: "POST",
					body: file,
					headers: {
						"qial-password": passwordInput.value,
						"qial-filename": file.name
					}
				})

				let response = await request.text()
				uploadResults.innerHTML += `${response}<br>`
			}
			catch(e) {
				console.error(e)
			}
		}
	}
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
