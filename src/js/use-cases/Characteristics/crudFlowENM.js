import {convertCommandResponse, generateNRCellDUName, sendCommand} from "../../utility/utility.js";
import {ENM_URL} from "../../utility/constants.js";

export function CRUDMeasurementsENM(data, operationType) {
    if (__ENV.requestType === undefined) fail();
    let num = Math.floor(Math.random() * data.nodes5g.length);
    let node = data.nodes5g[num].node;
    let fdn = data.nodes5g[num].fdn;
    let timestamp = Date.now();
    let cellName = generateNRCellDUName(node, `${__VU}-${timestamp}`);
    if (operationType === 'read') {
        sendCommand("cmedit get " + fdn + ",GNBDUFunction=1,NRCellDU="
            + `${node}-1`, data.sessionENM, ENM_URL);
    } else if (operationType === 'write') {
        sendCommand('cmedit create ' + fdn + ',GNBDUFunction=1,NRCellDU=' + cellName + ' nRCellDUId=' + cellName
            + ',nRTAC=999,nRPCI=0,cellLocalId=43,pLMNIdList=[{mcc=211, mnc=49},{mcc=212, mnc=50},{mcc=213, mnc=51}]', data.sessionENM, ENM_URL);
        sendCommand('cmedit set ' + fdn + ',GNBDUFunction=1,NRCellDU=' + cellName
            + ' pLMNIdList=[{mcc=311, mnc=49},{mcc=312, mnc=50},{mcc=313, mnc=51}]', data.sessionENM, ENM_URL);
        sendCommand('cmedit delete ' + fdn + ',GNBDUFunction=1,NRCellDU=' + cellName
            + ' --force --all', data.sessionENM, ENM_URL);
    } else if (operationType === 'crud') {
        sendCommand('cmedit create ' + fdn + ',GNBDUFunction=1,NRCellDU=' + cellName + ' nRCellDUId=' + cellName
            + ',nRTAC=999,nRPCI=0,cellLocalId=43,pLMNIdList=[{mcc=211, mnc=49},{mcc=212, mnc=50},{mcc=213, mnc=51}]', data.sessionENM, ENM_URL);
        sendCommand("cmedit get " + fdn + ",GNBDUFunction=1,NRCellDU=" + cellName, data.sessionENM, ENM_URL);
        sendCommand('cmedit set ' + fdn + ',GNBDUFunction=1,NRCellDU=' + cellName
            + ' pLMNIdList=[{mcc=311, mnc=49},{mcc=312, mnc=50},{mcc=313, mnc=51}]', data.sessionENM, ENM_URL);
        sendCommand('cmedit delete ' + fdn + ',GNBDUFunction=1,NRCellDU=' + cellName
            + ' --force --all', data.sessionENM, ENM_URL);
    } else {
        console.log('Unknown operationType');
    }
}

export function createCRUDOperationENM(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let fdn = data.nodes5g[__VU * its - __ITER].fdn;
    let node = data.nodes5g[__VU * its - __ITER].node;
    for (let i = 0; i < cellCount; i++) {
        sendCommand('cmedit create ' + fdn + ',GNBDUFunction=1,NRCellDU=' + generateNRCellDUName(node, i) + ' nRCellDUId=' + generateNRCellDUName(node, i) + ',nRTAC=999,nRPCI=0,cellLocalId=43,pLMNIdList=[{mcc=211, mnc=49},{mcc=212, mnc=50},{mcc=213, mnc=51}]', data.sessionENM, ENM_URL);
    }
}

export function readCRUDOperationENM(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let fdn = data.nodes5g[__VU * its - __ITER].fdn;
    let node = data.nodes5g[__VU * its - __ITER].node;
    // for (let i = 0; i < cellCount; i++) {
    // console.log("cmedit get " + fdn + ",GNBDUFunction=1,NRCellDU=" + generateNRCellDUName(node, i));
    sendCommand('cmedit get ' + fdn + ' ManagedElement.(dnPrefix);' + 'GNBDUFunction,(NRSectorCarrier.(txDirection,arfcnDL,arfcnUL,bSChannelBwDL,bSChannelBwUL,configuredMaxTxPower);' + 'NRCellDU.(cellLocalId,nRTAC,nRPCI,nRSectorCarrierRef));' + 'GNBDUFunction.(dUpLMNId,gNBId,gNBDUId,gNBIdLength);' + 'GNBDUFunction,(DU5qiTable.(default5qiTable);' + 'DU5qiTable,(DU5qi.(profile5qi,priorityLevel,packetDelayBudget)));' + 'ManagedElement', data.sessionENM, ENM_URL);
    // sendCommand("cmedit get " + fdn + ",GNBDUFunction=1,NRCellDU=" + generateNRCellDUName(node, i), data.sessionENM, ENM_URL);
    // }
}

export function updateCRUDOperationENM(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let fdn = data.nodes5g[__VU * its - __ITER].fdn;
    let node = data.nodes5g[__VU * its - __ITER].node;
    for (let i = 0; i < cellCount; i++) {
        sendCommand('cmedit set ' + fdn + ',GNBDUFunction=1,NRCellDU=' + generateNRCellDUName(node, i) + ' pLMNIdList=[{mcc=311, mnc=49},{mcc=312, mnc=50},{mcc=313, mnc=51}]', data.sessionENM, ENM_URL);
    }
}

export function deleteCRUDOperationENM(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let fdn = data.nodes5g[__VU * its - __ITER].fdn;
    let node = data.nodes5g[__VU * its - __ITER].node;
    for (let i = 0; i < cellCount; i++) {
        sendCommand('cmedit delete ' + fdn + ',GNBDUFunction=1,NRCellDU=' + generateNRCellDUName(node, i) + ' --force --all', data.sessionENM, ENM_URL);
    }
}

export function cleanupRemainingCellsENM(data) {

    let remainingCells = sendCommand('cmedit get * NRCellDU.nrCellDUId==*-TEST-*', data.sessionENM, ENM_URL);
    let numberOfRemainingCells = convertCommandResponse(remainingCells, 'FDN : ');

    if (numberOfRemainingCells.length > 0) {
        console.log('Number of remaining cells before cleanup: ' + numberOfRemainingCells.length);
        sendCommand('cmedit delete * NRCellDU.nrCellDUId==*-TEST-* --force --all', data.sessionENM, ENM_URL);
        remainingCells = sendCommand('cmedit get * NRCellDU.nrCellDUId==*-TEST-*', data.sessionENM, ENM_URL);
        numberOfRemainingCells = convertCommandResponse(remainingCells, 'FDN : ');
        console.log('Number of remaining cells after cleanup: ' + numberOfRemainingCells.length);
    } else {
        console.log('No need for cell cleanup.');
    }
}