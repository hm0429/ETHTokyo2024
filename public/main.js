import { ethers } from "./ethers-5.2.esm.min.js";

const CONTRACT_ADDRESS = "0x50D0f01c1D3Fd79a6Cf226a3F63d442c9DeA9bc5";
const CONTRACT_ABI = [{"inputs":[{"internalType":"bytes32","name":"idmHash","type":"bytes32"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"idmHash","type":"bytes32"}],"name":"unregister","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"addresses","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"idmHash","type":"bytes32"}],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}];

let provider;
let contract;
let signer;

let deviceEp = {
    in: 0,
    out: 0
};

let sequenceNumber = 0;

async function readNFC() {
    let device = await navigator.usb.requestDevice({ filters: []});
    await connectDevice(device);
}

async function connectDevice(device) {
    await device.open();
    await device.selectConfiguration(1);
    const deviceInterface = device.configuration.interfaces.filter(v => v.alternate.interfaceClass == 255)[0];
    await device.claimInterface(deviceInterface.interfaceNumber);
    deviceEp = {
        in: deviceInterface.alternate.endpoints.filter(e => e.direction == 'in')[0].endpointNumber,
        out: deviceInterface.alternate.endpoints.filter(e => e.direction == 'out')[0].endpointNumber,
    };
    await startSession(device);
}

function createData(command, sequenceNumber) {
    const SLOTNUMBER = 0x00;
    let data = new Uint8Array(10 + command.length);
    data[0] = 0x6b;
    data[1] = 255 & command.length;
    data[2] = command.length >> 8 & 255;
    data[3] = command.length >> 16 & 255;
    data[4] = command.length >> 24 & 255;
    data[5] = SLOTNUMBER;
    data[6] = sequenceNumber;
    0 != command.length && data.set( command, 10 );
    return data;
}

async function sendData(device, command) {
    let data = createData(command, ++sequenceNumber);
    await device.transferOut(deviceEp.out, data);
    await sleep(50);
}

async function receiveData(device) {
    const LENGTH = 50;
    let result = await device.transferIn(deviceEp.in, LENGTH);
    let array = [];
    for (let i = result.data.byteOffset; i < result.data.byteLength; i++) {
        array.push(result.data.getUint8(i));
    }
    return array;
}

async function startSession(device) {
    // Firmware Version
    await sendData(device, [0xFF, 0x56, 0x00, 0x00]);
    console.log(await receiveData(device));

    // Switch to TypeF
    await sendData(device, [0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x03, 0x00, 0x00]);
    console.log(await receiveData(device));

    // Start Transparent
    await sendData(device, [0xFF, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00]);
    console.log(await receiveData(device));

    // RF on
    await sendData(device, [0xFF, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]);
    console.log(await receiveData(device));

    // Polling Felica
    var idm = null;
    do {
        await sendData(device, [0xFF, 0x50, 0x00, 0x01, 0x00, 0x00, 0x11, 0x5F, 0x46, 0x04, 0xA0, 0x86, 0x01, 0x00, 0x95, 0x82, 0x00, 0x06, 0x06, 0x00, 0xFF, 0xFF, 0x01, 0x00, 0x00, 0x00, 0x00]);
        const data = await receiveData(device);
        console.log(data)
        if (data.length == 46) {
            let idmData = new Uint8Array(data.slice(26,34));
            $('#idm').text(buffer2HexString(idmData));
            let idmhash = await sha256(idmData);
            console.log(idmhash)
            $('#idmhash').text("0x" + buffer2HexString(idmhash));
            try {
                let ensName = await contract.name(idmhash);
                console.log(ensName); 
                $('#ensname').text(ensName);
                $('#displayensname').html(`<p>Hello, ${ensName} !</p>`);
            } catch (e) {
                console.error(e);
                $('#ensname').text("");
                $('#displayensname').html("");
            }
        }
        await sleep(500);
    } while (true);
}

async function sha256(buffer) {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
}
 

async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

function buffer2HexString(buffer) {
    return [].map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('').toUpperCase();
}


async function onStartButtonClick() {
    await readNFC();
}

async function onRegisterIdmButtonClick() {
    let idmHash = $('#idmhash').text();
    console.log(idmHash);
    if (idmHash == "") {
        alert("Please read your Suica first.");
        return;
    }
    try {
        const tx = await contract.register(idmHash);
        console.log(tx);
        alert("tx hash: " + tx.hash);
    } catch (e) {
        console.error(e);
    }
}

$(window).on('load', async ()=> {
    $('#start-button').on('click', onStartButtonClick);
    $('#register-idm-button').on('click', onRegisterIdmButtonClick);
    provider = new ethers.providers.Web3Provider(window.ethereum)
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    console.log(contract);
    console.log(ethers.version);

    let devices = await navigator.usb.getDevices();
    if (devices.length) {
        await connectDevice(devices[0]);
    }
});