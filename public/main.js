let deviceEp = {
    in: 0,
    out: 0
};

let sequenceNumber = 0;

async function readNFC() {
    device = await navigator.usb.requestDevice({ filters: []});
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
    console.log(data);
    await device.transferOut(deviceEp.out, data);
}

async function receiveData(device) {
    const LENGTH = 50;
    let result = await device.transferIn(deviceEp.in, LENGTH);
    console.log(result);
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
}