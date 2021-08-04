import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import petagramAbi from "../contracts/petagram.abi.json";
import erc20Abi from "../contracts/erc20.abi.json";
import './style.css';
import makeBlockie from 'ethereum-blockies-base64';

const ERC20_DECIMALS = 18;
const petContractAddress = '0xa7f2fe22573C6a4179C92b56c0a9587E99334e62';
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

let kit; 
let contract;
let posts = [];
let counter;
let postContents;
const tip = 1;

const connectCeloWallet = async () => {
    if(window.celo) {

        // if (celo.isUnlocked()) {
        //     notification("Connected :)")
        // }else {
            notification("⚠️ Please approve Connection to use Dapp")
        // }
        try {
            await window.celo.enable();

            const web3 = new Web3(window.celo);
            kit = newKitFromWeb3(web3);
            const accounts = await kit.web3.eth.getAccounts();
            kit.defaultAccount = accounts[0];

            contract = new kit.web3.eth.Contract(petagramAbi, petContractAddress);
        } catch (error) {
            notification(`⚠️ ${error}.`);
        }
    }else{
        notification("⚠️ Please install the CeloExtensionWallet.");
    }
}


const getBalance = async () => {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(0);
    document.querySelector('#balance').textContent = cUSDBalance + " cUSD";
}

// When window loads...
window.onload = async () => {
    await connectCeloWallet(); 
    await getBalance();
    await getUser();
    counter = 0;
    await getPosts();
    postContents = slide(counter);
    btnCheck();
}

// getting DOM elements...
const uploadBtn = document.getElementById('upBtn');
const container = document.getElementById('formCont');
const cancelBtn = document.getElementById('formCancel');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const formUploadBtn = document.getElementById('formUpload');
const welcome = document.getElementById('welcomeContainer');
const createUser = document.getElementById('createUser');

const approve = async () => {
    let cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

    let result = await cUSDContract.methods
    .approve(petContractAddress, new BigNumber(tip).shiftedBy(ERC20_DECIMALS))
    .send({from: kit.defaultAccount});
    return result;
}

const writeUser = async () => {
    let userName = document.getElementById('userPetName').value;
    welcome.classList.remove('visible');

    try {
        const result = await contract.methods.createUser(userName).send({from: kit.defaultAccount});
    } catch (error) {
        notification(`⚠️ ${error}`)
    }

    notification(`Welcome ${userName} 🤗`)
    getUser();
}

const getUser = async () => {
    let user = new Promise(async (resolve, reject) => {
        let u = await contract.methods.readUser().call();
        if (u[0] == '') reject("Rejected!");
        resolve({
            userName: u[0],
            userAddr: u[1]
        })
    })
    user.then((name) =>{
        document.getElementById('userID').innerHTML= `<a href="https://alfajores-blockscout.celo-testnet.org/address/${name.userAddr}">${name.userName.toUpperCase()}</a>`

    }).catch((error)=> {
        welcome.classList.add('visible');
    })
}

// handling button events...
uploadBtn.onclick = () => {
    container.classList.add('visible');
};

cancelBtn.onclick = () => {
    container.classList.remove('visible')
};

const slide = (pos) => {
    const postSlide = document.querySelector('.post-slide')
    const postContents = document.querySelectorAll('.post-slide .post-container');
    const postWidth = postContents[0].clientWidth;
    postSlide.style.transition = 'transform 0.4s ease-in-out';
    postSlide.style.transform = 'translatex(' + (-postWidth * pos) + 'px)';

    return postContents;
}

nextBtn.onclick = () => {
    counter++;
    btnCheck();
    slide(counter);
}

prevBtn.onclick = () => {
    counter--;
    btnCheck();
    slide(counter);
}

createUser.onclick = writeUser;

// handling button appearance...
const btnCheck = () => {
    if (counter <= 0) {
        prevBtn.style.display = 'none';
        if (postContents.length - 1 == 0) nextBtn.style.display = 'none';
        if (nextBtn.style.display == 'none' && counter != postContents.length-1) {
            nextBtn.style.display = 'unset'};
    } else if ( counter >= postContents.length-1) {
        nextBtn.style.display = 'none';
        if (prevBtn.style.display == 'none' && counter != 0) {
            prevBtn.style.display = 'unset'};
    } else {
        prevBtn.style.display = 'unset';
        nextBtn.style.display = 'unset';
    };
}

function identiconTemplate(_address) {
    const icon = makeBlockie(_address);

    return `<a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions" target="_blank">
    <img id="blockieImg" src="${icon}" alt="${_address}"/>
    </a>`;
}

// Function to render posts from list on window load...

const renderPost = () => {
    if (posts.length == 0) return;
    let postSlide = document.getElementById('postSlide');
    postSlide.innerHTML = '';
    posts.forEach ((post) => {
        let newDiv = document.createElement('div');
        newDiv.classList.add('post-container');
        newDiv.innerHTML = `
        <div class="post-image">
            <img src="${post.image}" alt="">
            <h3>${post.title}</h3>
            <p>${post.description}</p>
        </div>
        <ul>
            <li>
                <button id = "likeBtn" >👍</button>
                <small id = "noLikes">${post.likes}</small>
            </li>
            <li>
                <button id = "dislikeBtn" >👎</button>
                <small id = "noDislikes">${post.dislikes}</small>
            </li>
            <li>
                <button id="shareBtn">📤</button>
                <small>Share</small>
            </li>
        </ul>
        <div id="authID">
            ${identiconTemplate(post.owner)}
            <a href="${post.author}" target="_blank">Author</a>
        </div>  
        <span id="pTag">$${post.likes}</span>
`


    postSlide.appendChild(newDiv);
    })
}


const upLike = async (index) => {

    notification("⏳ Awaiting tip approval...");

    try {
        await approve();
    } catch (error) {
        notification(`⚠️ ${error}.`);
    }

    notification(`⏳ Complete tip for ${posts[index].title}`)

    try {
        const result = await contract.methods
        .postLike(index)
        .send({from: kit.defaultAccount});

        notification("✔️Awesome!" + "  " + `You 👍 ${posts[index].title}`)
        getPosts();
        getBalance();
    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
}

const upDislike = async (index) => {
    try {
        const result = await contract.methods
        .postDislike(index)
        .send({from: kit.defaultAccount});

        notification("✔️Awesome!" + "  " + `You 👎 ${posts[index].title}`)
        getPosts();
        getBalance();
    } catch (error) {
        notification(`⚠️ ${error}`)
    }
}

const notification = (text) => {
    const notification = document.querySelector('.notification');
    const notLoader = document.querySelector('.not-loader');
    document.querySelector('.not-text').innerHTML = text;
    notification.style.transform = 'translatex(100%)';
    notification.addEventListener('transitionend', () => {notLoader.style.transform = 'translatex(-100%)';});
    setTimeout(() => {
        notification.style.transform = 'translatex(-100%)';
        notification.addEventListener('transitionend', () => {
            notLoader.style.transform = 'unset';
        });
    }, 5000);
}

const addPost = async (e) => {
    const postDetails = [
        document.getElementById('petName').value,
        document.getElementById('desc').value,
        document.getElementById('authorHandle').value,
        document.getElementById('imgUrl').value
    ];
    
    container.classList.remove('visible');

    notification(`⌛ Adding "${postDetails[0]}"...`);

    try {
        const result = await contract.methods.writePost(...postDetails).send({from: kit.defaultAccount})
    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
 
    notification(`🎉 You successfully added "${postDetails[0]}".`);
    const postLength = await contract.methods.getPostLength().call();
    await getPosts();
    postContents = slide(postLength-1);
    counter = postLength-1;
    btnCheck();

}

formUploadBtn.onclick = addPost;

const getPosts = async () => {
    const _postLength = await contract.methods.getPostLength().call();
    const _posts = [];

    for(let i = 0; i < _postLength; i++) {
        let _post = new Promise(async (resolve, reject) => {
            let p = await contract.methods.readPost(i).call();
            resolve ({
                owner: p[0],
                title: p[1],
                description: p[2],
                author: p[3],
                image: p[4],
                likes: p[5],
                dislikes: p[6],
                index: p[7],
            })
        })
        _posts.push(_post)
    }
    posts = await Promise.all(_posts)
    renderPost()
}

const impression = (e) => {
    let index = posts[counter].index;
    if(e.target.tagName.toLowerCase() == 'button' && e.target.id === 'likeBtn' ) upLike(index);
    if(e.target.tagName.toLowerCase() == 'button' && e.target.id === 'dislikeBtn' ) upDislike(index);
    if(e.target.tagName.toLowerCase() == 'button' && e.target.id === 'shareBtn') notification("Coming soon 🔜");
}

document.querySelector('#postSlide').onclick = impression;
