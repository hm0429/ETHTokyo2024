let deviceEp = {
    in: 0,
    out: 0
};

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
}

async function onStartButtonClick() {
    await readNFC();
}