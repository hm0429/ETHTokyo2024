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
    const interface = device.configuration.interfaces.filter(v => v.alternate.interfaceClass == 255)[0];
    await device.claimInterface(interface.interfaceNumber);
    deviceEp = {
        in: interface.alternate.endpoints.filter(e => e.direction == 'in')[0].endpointNumber,
        out: interface.alternate.endpoints.filter(e => e.direction == 'out')[0].endpointNumber,
    };
    await startSession(device);
}

async function onStartButtonClick() {
    await readNFC();
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
            idm = data.slice(26,34).map(v => dec2HexString(v)).join('').toUpperCase();  
            console.log(idm);
            $('#idm').text(idm);
        }
        await sleep(500);
    } while (true);
}

async function sleep(msec) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

function dec2HexString(dec) {
    return ('00' + dec.toString(16)).slice(-2);
}


$(window).on('load', async ()=> {
    let devices = await navigator.usb.getDevices();
    if (devices.length) {
        await connectDevice(devices[0]);
    }
});