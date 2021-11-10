import { initializeApp, } from "https://www.gstatic.com/firebasejs/9.4.0/firebase-app.js";
import {
    getStorage, ref as sRef, uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.4.0/firebase-storage.js";

let modal = document.getElementsByClassName("overlay")[0];
let uploadImageBtn = document.querySelector('.custom-file-upload');
let preview = document.getElementById('preview');
let previewInput = document.querySelector('.previewInput');
let cardBlock = document.querySelector('.cards');
let form = document.querySelector('form');


let saveBtn = document.querySelector('.save__btn');
let addBtn = document.getElementById("add");

const card = (src, header, descr, date) => {
    return `
        <div class="card">
        <img class="remove__btn" src="img/remove.png" alt="remove">
        <img class="card__image" src=${src} alt="Card image">
        <div class="card__wrapper">
                <h3>${header}</h3>
                <p>${descr}</p>
                <div><img src="img/calendar.svg" alt=""> ${date}</div>
                <button class="card__btn">Edit</button>
            </div>
        </div>
    `
}

function firebaseSetup() {
    const firebaseConfig = {
        apiKey: "AIzaSyCfqMYkPGvdyFf_8hZ9bzGKqzQneMR-Q8E",
        authDomain: "instaman-608bb.firebaseapp.com",
        projectId: "instaman-608bb",
        storageBucket: "instaman-608bb.appspot.com",
        messagingSenderId: "361966845593",
        appId: "1:361966845593:web:fd2aee4f59e9be21e64208"
    };

    initializeApp(firebaseConfig);
}

let imageFiles = [], cardData = [], isEditing = false;

async function updateData() {
    cardData = [];
    await fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json')
        .then(res => {
            return res.json()
        })
        .then(data => {
            data && Object.values(data).map(el => {
                cardData.push(el);
            })
        })
    console.log(cardData);
    cardData.map(el => {
        cardBlock.insertAdjacentHTML('afterbegin', card(el.src, el.header, el.descr, el.date))
    })
}

document.addEventListener("DOMContentLoaded", async function () {
    firebaseSetup();
    await updateData();

    let cardRemove = [...document.querySelectorAll('.remove__btn')];
    let cardEditBtn = [...document.querySelectorAll('.card__btn')];

    cardEditBtn.map(elem => {
        elem.addEventListener('click', function (e) {
            let param = e.path[1].childNodes[3].innerText;
            let element = cardData.filter(el => el.descr === param);

            form.elements["name"].value = element[0].header;
            form.elements["descr"].value = element[0].descr;
            preview.style.display = 'block';
            uploadImageBtn.style.display = "block";
            modal.style.display = "block";

            isEditing = true;
        })
    })

    previewInput.addEventListener('change', function () {
        preview.src = window.URL.createObjectURL(this.files[0])
        imageFiles.push(...this.files);
        preview.style.display = 'block';
        uploadImageBtn.style.display = "none";
        saveBtn.style.display = 'block'
    });

    cardRemove.map(async function (elem) {
        elem.addEventListener('click', async function (e) {
            let filterParam = e.path[1].childNodes[5].childNodes[3].innerText; //description of the card

            console.log(filterParam);
            cardData = cardData.filter(el => el.descr !== filterParam);
            console.log(Object(...cardData), filterParam);

            await fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', { method: "DELETE" })
            fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(Object(cardData))
            }).then(() => {
                while (cardBlock.children.length !== 1) {
                    console.log('removing');

                    cardBlock.removeChild(cardBlock.firstChild);
                }
            }).then(async () => { await updateData(); history.go(0) })

            /* fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', { method: "DELETE" })
                .then(() => {
                    cardData = cardData.filter(el => el.descr !== filterParam);
                    console.log(cardData, filterParam);

                    fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(...cardData.filter(el => el.descr !== filterParam))
                    }).then(() => {
                        while (cardBlock.children.length !== 1) {
                            console.log('removing');

                            cardBlock.removeChild(cardBlock.firstChild);
                        }
                    }).then(async () => await updateData())
                    // .then(async () => {
                    //     await updateData();
                    //     console.log("done");
                    //     // history.go(0)
                    // });
                }).then(async () => await updateData()) */
        })
    })

    addBtn.addEventListener('click', function () {
        modal.style.display = "block";
    });

    window.addEventListener('click', function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = form.elements["name"].value;
        const descr = form.elements["descr"].value;

        form.elements["name"].value = "";
        form.elements["descr"].value = "";
        preview.style.display = 'none';
        uploadImageBtn.style.display = "block";
        saveBtn.style.display = 'none';

        await uploadImage(name, descr)
        modal.style.display = "none";

        if (isEditing) {
            cardData = cardData.filter(el => el.descr !== descr);
            console.log(cardData);

            fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', { method: "DELETE" })
                .then(() => {
                    fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(...cardData)
                    })
                }).then(async () => {
                    await updateData();
                    console.log('done');
                })
        }
        isEditing = false;
    });

    async function uploadImage(header, descr) {
        let img = imageFiles[imageFiles.length - 1];
        let imgName = "image" + Date.now();

        const metaData = {
            contentType: img.type
        }

        const storage = getStorage();
        const storageRef = sRef(storage, "images/" + imgName);
        const uploadTask = uploadBytesResumable(storageRef, img, metaData);

        uploadTask.on('state-changed', null, (err) => {
            console.log(err);
        }, () => {
            getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                const data = {
                    src: url,
                    header: header,
                    descr: descr,
                    date: new Date().toJSON().slice(0, 10)
                }

                cardBlock.insertAdjacentHTML('afterbegin',
                    card(data.src, data.header, data.descr, data.date));

                cardRemove = [...document.querySelectorAll('.remove__btn')];

                fetch('https://instaman-608bb-default-rtdb.firebaseio.com/data.json', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                })
                    .then(() => history.go(0))
            })
        });
    }
});

