import {createOperation, deleteOperation, readOperation, updateOperation} from "./CRUDOperationsChar.js";
import {generateNRCellDUName} from "../../utility/utility.js";
import { fail } from 'k6';

let cellCount = 1;

export function CRUDMeasurements(data, operationType) {
    if (__ENV.requestType === undefined) fail();
    let num = Math.floor(Math.random() * data.nodes5g.length);
    let node = data.nodes5g[num].node;
    let cmhandle = data.nodes5g[num].cmhandle;
    let timestamp = Date.now();
    if (operationType === 'read') {
        readOperation(data.session, cmhandle, __ENV.requestType, node, `${node}-1`);
    } else if (operationType === 'write') {
        createOperation(data.session, node, cmhandle, generateNRCellDUName(node, `${__VU}-${timestamp}`));
        updateOperation(data.session, cmhandle, generateNRCellDUName(node, `${__VU}-${timestamp}`));
        deleteOperation(data.session, cmhandle, node, generateNRCellDUName(node, `${__VU}-${timestamp}`));
    } else if (operationType === 'crud') {
        createOperation(data.session, node, cmhandle, generateNRCellDUName(node, `${__VU}-${timestamp}`));
        readOperation(data.session, cmhandle, __ENV.requestType, node, generateNRCellDUName(node, `${__VU}-${timestamp}`));
        updateOperation(data.session, cmhandle, generateNRCellDUName(node, `${__VU}-${timestamp}`));
        deleteOperation(data.session, cmhandle, node, generateNRCellDUName(node, `${__VU}-${timestamp}`));
    } else {
        console.log('Unknown operationType: ' + operationType);
    }
}

export function createCRUDOperation(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let node = data.nodes5g[__VU * its - __ITER].node;
    let cmhandle = data.nodes5g[__VU * its - __ITER].cmhandle;
    for (let i = 0; i < cellCount; i++) {
        createOperation(data.session, node, cmhandle, generateNRCellDUName(node, i));
    }
}

export function readCRUDOperation(data) {
    if (__ENV.its === undefined && __ENV.requestType === undefined) fail();
    let its = __ENV.its;
    let node = data.nodes5g[__VU * its - __ITER].node;
    let cmhandle = data.nodes5g[__VU * its - __ITER].cmhandle;
    for (let i = 0; i < cellCount; i++) {
        readOperation(data.session, cmhandle, __ENV.requestType, node, generateNRCellDUName(node, i));
    }
}

export function updateCRUDOperation(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let node = data.nodes5g[__VU * its - __ITER].node;
    let cmhandle = data.nodes5g[__VU * its - __ITER].cmhandle;
    for (let i = 0; i < cellCount; i++) {
        updateOperation(data.session, cmhandle, generateNRCellDUName(node, i));
    }
}

export function deleteCRUDOperation(data) {
    if (__ENV.its === undefined) fail();
    let its = __ENV.its;
    let node = data.nodes5g[__VU * its - __ITER].node;
    let cmhandle = data.nodes5g[__VU * its - __ITER].cmhandle;
    for (let i = 0; i < cellCount; i++) {
        deleteOperation(data.session, cmhandle, node, generateNRCellDUName(node, i));
    }
}